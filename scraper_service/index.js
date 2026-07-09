require('dotenv').config();
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Lead Prospector Scraper Service' });
});

/**
 * Simple delay helper.
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Random delay helper.
 */
function randomDelay(min = 1000, max = 3000) {
  return delay(Math.floor(Math.random() * (max - min) + min));
}

// Concurrency queue: restricts Puppeteer runs to exactly 1 at a time to prevent RAM exhaustion.
let searchQueue = Promise.resolve();

/**
 * POST /scrape
 * Trigger sequential scraping task.
 */
app.post('/scrape', async (req, res) => {
  const { city, niche, limit = 5 } = req.body;

  if (!city || !niche) {
    return res.status(400).json({ error: 'Ciudad y nicho son requeridos' });
  }

  const searchLimit = Math.min(Math.max(parseInt(limit) || 5, 1), 50);

  // Queue the scraping request sequentially
  searchQueue = searchQueue
    .then(async () => {
      console.log(`⏱️ Iniciando búsqueda secuencial para: "${niche}" en "${city}" (Límite: ${searchLimit})`);
      try {
        const results = await runScraper(city, niche, searchLimit);
        res.json(results);
      } catch (err) {
        console.error('❌ Error en ejecución de scraper:', err.message);
        res.status(500).json({ error: 'Error al realizar la prospección: ' + err.message });
      }
    })
    .catch((err) => {
      console.error('❌ Error crítico en cola de scraper:', err);
      // Ensure the client gets a response if the queue handler fails
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error interno en la cola de tareas' });
      }
    });
});

/**
 * Scraper implementation that runs inside a clean Puppeteer browser instance.
 */
async function runScraper(city, niche, limit) {
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

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  console.log('🚀 Levantando navegador Chrome limpio...');
  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1920, height: 1080 });

    // Block image, font, and media requests to save up to 70% RAM
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
    await delay(1500);

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
      console.log('📜 Desplazando panel de resultados...');
      let previousHeight = 0;
      let noHeightChangeLimit = 3;
      let noHeightChangeCount = 0;

      for (let i = 0; i < 15; i++) {
        const visibleCount = await page.$$eval(
          'a[href*="/maps/place"]',
          (links) => {
            const seen = new Set();
            links.forEach(l => seen.add(l.href));
            return seen.size;
          }
        );
        console.log(`🔍 Resultados cargados en pantalla: ${visibleCount} / ${limit}`);
        if (visibleCount >= Math.max(limit * 2, 20)) {
          console.log(`✅ Suficientes resultados cargados en pantalla (${visibleCount}).`);
          break;
        }

        await page.evaluate((el) => {
          el.focus();
          el.scrollTop = el.scrollHeight;
        }, scrollable);
        
        await delay(1500);

        const currentHeight = await page.evaluate((el) => el.scrollHeight, scrollable);
        if (currentHeight === previousHeight) {
          noHeightChangeCount++;
          if (noHeightChangeCount >= noHeightChangeLimit) {
            break;
          }
        } else {
          noHeightChangeCount = 0;
          previousHeight = currentHeight;
        }
      }
    }

    // Get the result cards elements directly
    const cards = await page.$$('a[href*="/maps/place"]');
    console.log(`📋 Se encontraron ${cards.length} elementos de negocios en el panel`);

    const results = [];
    let cardIndex = 0;

    console.log(`🔍 Iniciando filtrado inteligente de prospectos (Objetivo: ${limit} leads con teléfono o email)`);

    // Loop through cards until we find enough leads that have a phone number or email, up to a safety limit
    while (results.length < limit && cardIndex < cards.length && cardIndex < Math.max(limit * 2, 30)) {
      const card = cards[cardIndex];
      const currentIndex = cardIndex;
      cardIndex++;

      try {
        const cardName = await page.evaluate(el => el.getAttribute('aria-label') || el.textContent.trim(), card);
        console.log(`  📍 Evaluando negocio ${currentIndex + 1}/${cards.length}: ${cardName.substring(0, 50)}...`);

        // Scroll the element into view natively (center it to guarantee clickability)
        await page.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'center' }), card);
        await delay(300);

        // Click the card natively using Puppeteer's simulated mouse click
        await card.click();
        await delay(1500); // Allow AJAX details to load

        const businessData = await page.evaluate(() => {
          const data = {};
          const containers = Array.from(document.querySelectorAll('div[role="main"]'));
          const container = containers.find(c => !c.querySelector('[role="feed"]')) || document;

          // Business name
          const nameEl = container.querySelector('h1');
          const nameText = nameEl ? nameEl.textContent.trim() : '';
          data.business_name = nameText !== 'Resultados' ? nameText : '';

          const ratingEl = container.querySelector('div.F7nice span[aria-hidden="true"]');
          data.rating = ratingEl ? parseFloat(ratingEl.textContent) : null;

          const reviewsEl = container.querySelector(
            'div.F7nice span[aria-label*="review"], div.F7nice span[aria-label*="reseña"]'
          );
          if (reviewsEl) {
            const match = reviewsEl.textContent.match(/[\d,.]+/);
            data.reviews_count = match ? parseInt(match[0].replace(/[,.\s]/g, '')) : 0;
          } else {
            data.reviews_count = null;
          }

          const buttons = container.querySelectorAll('button[data-item-id], a[data-item-id]');
          buttons.forEach(btn => {
            const itemId = btn.getAttribute('data-item-id') || '';
            const text = btn.textContent.trim();
            const ariaLabel = btn.getAttribute('aria-label') || '';

            if (itemId === 'address' || itemId.startsWith('address')) {
              data.address = ariaLabel.replace('Dirección: ', '').replace('Address: ', '') || text;
            }
            if (itemId === 'phone' || itemId.startsWith('phone')) {
              data.phone = ariaLabel.replace('Teléfono: ', '').replace('Phone: ', '') || text;
            }
            if (itemId === 'authority') {
              data.website = btn.href || ariaLabel.replace('Sitio web: ', '').replace('Website: ', '') || text;
            }
          });

          // Fallbacks for missing info
          if (!data.address) {
            const addressBtn = container.querySelector('[data-tooltip="Copiar la dirección"], [data-tooltip="Copy address"]');
            if (addressBtn) data.address = addressBtn.textContent.trim();
          }
          if (!data.phone) {
            const phoneBtn = container.querySelector('[data-tooltip="Copiar el número de teléfono"], [data-tooltip="Copy phone number"]');
            if (phoneBtn) data.phone = phoneBtn.textContent.trim();
          }
          if (!data.website) {
            const websiteLink = container.querySelector('a[data-item-id="authority"]');
            if (websiteLink) data.website = websiteLink.href;
          }

          return data;
        });

        // Set maps URL
        const placeUrl = await page.evaluate(() => window.location.href);
        businessData.google_maps_url = placeUrl;

        // Fallback name if h1 was wrong or empty
        if (!businessData.business_name || businessData.business_name === 'Resultados') {
          businessData.business_name = cardName.replace(/·/g, '').trim();
        }

        // Try fast website extraction immediately
        if (businessData.website) {
          try {
            const contactInfo = await extractContactFromWebsite(businessData.website);
            if (contactInfo.email) businessData.email = contactInfo.email;
            if (contactInfo.instagram) businessData.instagram = contactInfo.instagram;
            if (contactInfo.facebook) businessData.facebook = contactInfo.facebook;
            if (contactInfo.tiktok) businessData.tiktok = contactInfo.tiktok;
            if (contactInfo.linkedin) businessData.linkedin = contactInfo.linkedin;
          } catch (e) {
            // Ignore
          }
        }

        // Validation Rule: Must have a phone number OR an email
        const hasPhone = businessData.phone && businessData.phone.trim().length > 2;
        const hasEmail = businessData.email && businessData.email.trim().length > 2;

        if (hasPhone || hasEmail) {
          console.log(`    ✅ Lead Guardado (${results.length + 1}/${limit}): "${businessData.business_name}" (Teléfono: ${businessData.phone || '-'}, Email: ${businessData.email || '-'})`);
          results.push(businessData);
        } else {
          console.log(`    ❌ Lead Descartado: No tiene teléfono ni email.`);
        }

        await randomDelay(200, 500);
      } catch (err) {
        console.error(`  ⚠️ Error en negocio index ${currentIndex + 1}:`, err.message);
      }
    }

    console.log(`✅ Prospección finalizada. Encontrados ${results.length} leads calificados de un total de ${cardIndex} inspeccionados.`);

    return results;
  } catch (error) {
    console.error('❌ Scraper error:', error.message);
    throw error;
  } finally {
    console.log('🧹 Cerrando navegador Chrome y liberando RAM...');
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

/**
 * Extract email and social media links from a website.
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
    const timeout = setTimeout(() => controller.abort(), 4000);

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
    // Ignore
  }

  return result;
}

app.listen(PORT, () => {
  console.log(`🚀 Microservicio Scraper escuchando en puerto ${PORT}`);
});
