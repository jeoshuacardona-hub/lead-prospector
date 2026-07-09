const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

let browserInstance = null;

/**
 * Get or create a Puppeteer browser instance (singleton).
 */
async function getBrowser() {
  if (!browserInstance || !browserInstance.isConnected()) {
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled'
      ]
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    browserInstance = await puppeteer.launch(launchOptions);
  }
  return browserInstance;
}

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

/**
 * Search Google Maps for businesses by city and niche.
 * Returns an array of lead objects with extracted business data.
 *
 * @param {string} city - The city to search in
 * @param {string} niche - The business niche/category to search for
 * @param {number} limit - Maximum number of results to return (default 20, max 50)
 * @returns {Promise<Array>} Array of lead objects
 */
async function searchGoogleMaps(city, niche, limit = 20) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1920, height: 1080 });

    // Optimize performance: intercept and block images, fonts, and media to save memory and CPU
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (type === 'image' || type === 'font' || type === 'media') {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Set extra headers to appear more like a real browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
    });

    const searchQuery = `${niche} ${city}`;
    const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;

    console.log(`🌐 Navigating to Google Maps: ${searchQuery}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for the feed or wait a short time to let the results render
    try {
      await page.waitForSelector('a[href*="/maps/place"]', { timeout: 10000 });
    } catch (e) {
      await delay(4000);
    }

    // Accept cookies if prompted (for EU/GDPR regions)
    try {
      const acceptBtn = await page.$(
        '[aria-label="Accept all"], [aria-label="Aceptar todo"], button[jsname="b3VHJd"]'
      );
      if (acceptBtn) {
        await acceptBtn.click();
        await delay(1000);
      }
    } catch (e) {
      // Cookie dialog may not appear, ignore
    }

    // Scroll the results panel to load more results (Google Maps lazy-loads)
    console.log('📜 Scrolling to load more results...');
    const scrollable = await page.$('div[role="feed"]');
    if (scrollable) {
      let previousHeight = 0;
      for (let i = 0; i < 8; i++) {
        await page.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        }, scrollable);
        await delay(2000);
        const currentHeight = await page.evaluate((el) => el.scrollHeight, scrollable);
        if (currentHeight === previousHeight) break;
        previousHeight = currentHeight;

        // Check if we have enough results visible
        const visibleCount = await page.$$eval(
          'a[href*="/maps/place"]',
          (links) => {
            const seen = new Set();
            links.forEach(l => seen.add(l.href));
            return seen.size;
          }
        );
        if (visibleCount >= limit) break;
      }
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

    console.log(`📋 Found ${placeLinks.length} place links`);

    const results = [];
    const maxResults = Math.min(placeLinks.length, limit);

    // Visit each place page to extract detailed info
    for (let i = 0; i < maxResults; i++) {
      try {
        console.log(`  📍 Scraping place ${i + 1}/${maxResults}: ${placeLinks[i].name.substring(0, 50)}...`);

        await page.goto(placeLinks[i].url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await delay(1000);

        const businessData = await page.evaluate(() => {
          const data = {};

          // Business name - from the main heading
          const nameEl = document.querySelector('h1');
          data.business_name = nameEl ? nameEl.textContent.trim() : '';

          // Rating - look for the rating span
          const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]');
          data.rating = ratingEl ? parseFloat(ratingEl.textContent) : null;

          // Reviews count - look for review count text
          const reviewsEl = document.querySelector(
            'div.F7nice span[aria-label*="review"], div.F7nice span[aria-label*="reseña"]'
          );
          if (reviewsEl) {
            const match = reviewsEl.textContent.match(/[\d,.]+/);
            data.reviews_count = match ? parseInt(match[0].replace(/[,.\s]/g, '')) : 0;
          } else {
            data.reviews_count = null;
          }

          // Extract info from structured data buttons/links
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
        console.error(`  ⚠️ Error scraping place ${i + 1}:`, err.message);
      }
    }

    await page.close();
    console.log(`✅ Scraping complete: ${results.length} businesses extracted`);

    // Try to extract emails and social media from business websites
    console.log('📧 Extracting contact info from websites...');
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
          // Silently continue - website may be unreachable
        }
      }
    }
    console.log(`📧 Enriched ${enrichedCount} leads with contact info from websites`);

    return results;
  } catch (error) {
    console.error('❌ Scraper error:', error.message);
    try {
      await page.close();
    } catch (e) {
      // Page may already be closed
    }
    throw error;
  }
}

/**
 * Extract email and social media links from a business website.
 * Uses fetch + cheerio (no browser needed, much faster).
 *
 * @param {string} url - The website URL to scrape
 * @returns {Promise<Object>} Object with email, instagram, facebook, tiktok, linkedin
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

    // Filter out common false-positive emails
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
    // Silently fail - website might be down, blocking, or timing out
    // This is expected behavior for many websites
  }

  return result;
}

/**
 * Close the browser instance.
 * Call this when shutting down the server.
 */
async function closeBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch (e) {
      // Browser may already be closed
    }
    browserInstance = null;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});

module.exports = { searchGoogleMaps, extractContactFromWebsite, closeBrowser };
