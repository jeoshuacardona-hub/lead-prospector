const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

/**
 * Simple delay helper.
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Random delay between min and max milliseconds.
 */
function randomDelay(min = 1000, max = 3000) {
  return delay(Math.floor(Math.random() * (max - min) + min));
}

// Promise-chaining queue to restrict concurrency to exactly 1 search at a time.
// This prevents memory exhaustion (RAM limit of 512MB exceeded) on Render Free tier.
let searchQueue = Promise.resolve();

/**
 * Public search function that queues request sequentially.
 */
async function searchGoogleMaps(city, niche, limit = 20) {
  return new Promise((resolve, reject) => {
    searchQueue = searchQueue
      .then(async () => {
        try {
          console.log(`⏱️ Iniciando búsqueda en cola para: "${niche}" en "${city}"`);
          const results = await runScraper(city, niche, limit);
          resolve(results);
        } catch (err) {
          reject(err);
        }
      })
      .catch((err) => {
        console.error('Queue error:', err);
      });
  });
}

/**
 * Internal runner that launches a fresh browser instance, scrapes, and closes it completely.
 */
async function runScraper(city, niche, limit = 20) {
  const launchOptions = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--disable-extensions',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-blink-features=AutomationControlled'
    ]
  };

  // Use Render system Chrome path if defined, otherwise default to bundled Chromium
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  console.log('🚀 Lanzando navegador Puppeteer limpio...');
  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  try {
    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1920, height: 1080 });

    // Block image, font, and media requests to save up to 70% RAM and speed up load times
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (type === 'image' || type === 'font' || type === 'media') {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
    });

    const searchQuery = `${niche} ${city}`;
    const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;

    console.log(`🌐 Navegando a Google Maps: ${searchQuery}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(2000); // Wait for initial render

    // Accept cookies if prompted (EU/GDPR)
    try {
      const acceptBtn = await page.$(
        '[aria-label="Accept all"], [aria-label="Aceptar todo"], [aria-label="Aceptar"], button[jsname="b3VHJd"]'
      );
      if (acceptBtn) {
        console.log('🍪 Aceptando diálogo de cookies...');
        await acceptBtn.click();
        await delay(1500);
      }
    } catch (e) {
      // Cookie dialog may not appear
    }

    // Wait for the results feed or fallback to a timeout
    try {
      await page.waitForSelector('a[href*="/maps/place"]', { timeout: 15000 });
    } catch (e) {
      console.log('⚠️ Timeout esperando a los resultados, continuando...');
    }

    // Scroll results panel to load more results (Google Maps lazy-loads)
    console.log('📜 Buscando contenedor scrollable de resultados...');
    let scrollable = await page.$('div[role="feed"]');
    
    if (!scrollable) {
      // Find the scrollable parent of the first result link dynamically
      const handle = await page.evaluateHandle(() => {
        const link = document.querySelector('a[href*="/maps/place"]');
        if (link) {
          let parent = link.parentElement;
          while (parent && parent !== document.body) {
            const overflow = window.getComputedStyle(parent).overflowY;
            if (overflow === 'auto' || overflow === 'scroll') {
              return parent;
            }
            parent = parent.parentElement;
          }
        }
        return null;
      });
      if (handle && handle.asElement()) {
        scrollable = handle.asElement();
      }
    }

    if (scrollable) {
      console.log('📜 Desplazando panel de resultados para cargar más negocios...');
      let previousHeight = 0;
      let noHeightChangeLimit = 3; // Allow up to 3 attempts without height change
      let noHeightChangeCount = 0;

      for (let i = 0; i < 15; i++) {
        // Check current visible results count
        const visibleCount = await page.$$eval(
          'a[href*="/maps/place"]',
          (links) => {
            const seen = new Set();
            links.forEach(l => seen.add(l.href));
            return seen.size;
          }
        );
        console.log(`🔍 Resultados cargados en pantalla: ${visibleCount} / ${limit}`);
        if (visibleCount >= limit) {
          console.log(`✅ Límite de ${limit} resultados alcanzado en pantalla.`);
          break;
        }

        // Scroll container down
        await page.evaluate((el) => {
          el.focus();
          el.scrollTop = el.scrollHeight;
        }, scrollable);
        
        await delay(2500); // Wait for results to render

        const currentHeight = await page.evaluate((el) => el.scrollHeight, scrollable);
        if (currentHeight === previousHeight) {
          noHeightChangeCount++;
          console.log(`⚠️ Altura sin cambios (${noHeightChangeCount}/${noHeightChangeLimit})`);
          if (noHeightChangeCount >= noHeightChangeLimit) {
            console.log('🛑 Altura sin cambios consecutiva. Fin de la lista.');
            break;
          }
        } else {
          noHeightChangeCount = 0;
          previousHeight = currentHeight;
        }
      }
    } else {
      console.log('⚠️ No se pudo encontrar el contenedor scrollable, intentando extraer resultados visibles...');
    }

    // Get all unique place links from the feed
    const placeLinks = await page.$$eval('a[href*="/maps/place"]', (links) => {
      const seen = new Set();
      return links
        .filter(link => {
          const href = link.href;
          if (seen.has(href)) return false;
          seen.add(href);
          return true;
        })
        .map(link => ({
          url: link.href,
          name: link.getAttribute('aria-label') || link.textContent.trim()
        }));
    });

    console.log(`📋 Se encontraron ${placeLinks.length} enlaces de negocios`);

    const results = [];
    const maxResults = Math.min(placeLinks.length, limit);

    // Visit each place page to extract detailed info
    for (let i = 0; i < maxResults; i++) {
      try {
        console.log(`  📍 Extrayendo negocio ${i + 1}/${maxResults}: ${placeLinks[i].name.substring(0, 50)}...`);

        try {
          await page.goto(placeLinks[i].url, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await delay(1200);
        } catch (gotoErr) {
          console.log(`  ⚠️ Timeout de navegación en negocio ${i + 1} (${gotoErr.message}), intentando extraer datos cargados...`);
        }

        const businessData = await page.evaluate(() => {
          const data = {};

          // Business name
          const nameEl = document.querySelector('h1');
          data.business_name = nameEl ? nameEl.textContent.trim() : '';

          // Rating
          const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]');
          data.rating = ratingEl ? parseFloat(ratingEl.textContent) : null;

          // Reviews count
          const reviewsEl = document.querySelector(
            'div.F7nice span[aria-label*="review"], div.F7nice span[aria-label*="reseña"]'
          );
          if (reviewsEl) {
            const match = reviewsEl.textContent.match(/[\d,.]+/);
            data.reviews_count = match ? parseInt(match[0].replace(/[,.\s]/g, '')) : 0;
          } else {
            data.reviews_count = null;
          }

          // Extract address, phone, website from structured data buttons/links
          const buttons = document.querySelectorAll('button[data-item-id], a[data-item-id]');
          buttons.forEach(btn => {
            const itemId = btn.getAttribute('data-item-id') || '';
            const text = btn.textContent.trim();
            const ariaLabel = btn.getAttribute('aria-label') || '';

            // Address
            if (itemId === 'address' || itemId.startsWith('address')) {
              data.address = ariaLabel
                .replace('Dirección: ', '')
                .replace('Address: ', '') || text;
            }

            // Phone
            if (itemId === 'phone' || itemId.startsWith('phone')) {
              data.phone = ariaLabel
                .replace('Teléfono: ', '')
                .replace('Phone: ', '') || text;
            }

            // Website
            if (itemId === 'authority') {
              data.website = btn.href ||
                ariaLabel.replace('Sitio web: ', '').replace('Website: ', '') || text;
            }
          });

          // Alternative selectors for address
          if (!data.address) {
            const addressBtn = document.querySelector(
              '[data-tooltip="Copiar la dirección"], [data-tooltip="Copy address"], ' +
              'button[aria-label*="ddress"], button[aria-label*="irección"]'
            );
            if (addressBtn) {
              data.address = (addressBtn.getAttribute('aria-label') || addressBtn.textContent).trim();
              data.address = data.address
                .replace('Dirección: ', '')
                .replace('Address: ', '');
            }
          }

          // Alternative selectors for phone
          if (!data.phone) {
            const phoneBtn = document.querySelector(
              '[data-tooltip="Copiar el número de teléfono"], [data-tooltip="Copy phone number"], ' +
              'button[aria-label*="hone"], button[aria-label*="eléfono"]'
            );
            if (phoneBtn) {
              data.phone = (phoneBtn.getAttribute('aria-label') || phoneBtn.textContent).trim();
              data.phone = data.phone
                .replace('Teléfono: ', '')
                .replace('Phone: ', '');
            }
          }

          // Alternative selectors for website
          if (!data.website) {
            const websiteLink = document.querySelector(
              'a[data-item-id="authority"], a[aria-label*="ebsite"], a[aria-label*="itio web"]'
            );
            if (websiteLink) data.website = websiteLink.href;
          }

          data.google_maps_url = window.location.href;

          return data;
        });

        if (businessData.business_name) {
          results.push(businessData);
        }

        await randomDelay(800, 2000);
      } catch (err) {
        console.error(`  ⚠️ Error en negocio ${i + 1}:`, err.message);
      }
    }

    console.log(`✅ Extracción de Google Maps completada: ${results.length} negocios`);

    // Try to extract emails and social media from websites using fast fetch + cheerio
    console.log('📧 Extrayendo información de contacto de las páginas web...');
    let enrichedCount = 0;
    for (const result of results) {
      if (result.website) {
        try {
          const contactInfo = await extractContactFromWebsite(result.website);
          if (contactInfo.email && !result.email) {
            result.email = contactInfo.email;
            enrichedCount++;
          }
          if (contactInfo.instagram) result.instagram = contactInfo.instagram;
          if (contactInfo.facebook) result.facebook = contactInfo.facebook;
          if (contactInfo.tiktok) result.tiktok = contactInfo.tiktok;
          if (contactInfo.linkedin) result.linkedin = contactInfo.linkedin;
        } catch (err) {
          // Ignore website connection timeouts
        }
      }
    }
    console.log(`📧 Se enriquecieron ${enrichedCount} leads con datos de contacto`);

    return results;
  } catch (error) {
    console.error('❌ Scraper error:', error.message);
    throw error;
  } finally {
    console.log('🧹 Cerrando navegador Puppeteer y liberando RAM...');
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

/**
 * Extract email and social media links from a business website.
 * Uses fetch + cheerio (no browser needed, much faster).
 */
async function extractContactFromWebsite(url) {
  const result = {
    email: null,
    instagram: null,
    facebook: null,
    tiktok: null,
    linkedin: null
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      },
      redirect: 'follow'
    });
    clearTimeout(timeout);

    if (!response.ok) return result;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return result;

    const html = await response.text();
    const $ = cheerio.load(html);
    const fullText = $.html();

    // Extract emails using regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = fullText.match(emailRegex) || [];

    const invalidPatterns = [
      'example', 'sentry', 'webpack', 'wixpress', 'schema.org',
      'wordpress', 'gravatar', 'googleapis', 'google.com',
      'w3.org', 'facebook.com', 'twitter.com', 'jquery',
      'bootstrap', 'cloudflare', 'jsdelivr'
    ];
    const invalidExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp', '.css', '.js'];

    const validEmails = emails.filter(e => {
      const lower = e.toLowerCase();
      if (invalidExtensions.some(ext => lower.endsWith(ext))) return false;
      if (invalidPatterns.some(pattern => lower.includes(pattern))) return false;
      if (lower.length > 60) return false;
      return true;
    });

    if (validEmails.length > 0) {
      result.email = validEmails[0];
    }

    // Extract social media links from anchor tags
    $('a[href]').each((_, el) => {
      const href = ($(el).attr('href') || '').toLowerCase();

      if (href.includes('instagram.com/') && !result.instagram) {
        result.instagram = $(el).attr('href');
      }
      if (href.includes('facebook.com/') && !result.facebook) {
        result.facebook = $(el).attr('href');
      }
      if (href.includes('tiktok.com/') && !result.tiktok) {
        result.tiktok = $(el).attr('href');
      }
      if (href.includes('linkedin.com/') && !result.linkedin) {
        result.linkedin = $(el).attr('href');
      }
    });

  } catch (err) {
    // Silently fail - website might be down
  }

  return result;
}

module.exports = { searchGoogleMaps, extractContactFromWebsite };
