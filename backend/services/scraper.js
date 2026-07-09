// Support a comma-separated list of scraper URLs for automatic round-robin load balancing
const scraperUrls = (process.env.SCRAPER_SERVICE_URL || 'http://localhost:3002')
  .split(',')
  .map(url => url.trim())
  .filter(Boolean);

let currentScraperIndex = 0;

/**
 * Send a scrape request to a single scraper node.
 */
async function callScraper(targetUrl, city, niche, limit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch(`${targetUrl}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city, niche, limit }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const statusCode = response.status;
      const bodyText = await response.text().catch(() => '');
      let errorMsg;
      try {
        const errData = JSON.parse(bodyText);
        errorMsg = errData.error || `HTTP ${statusCode}`;
      } catch {
        errorMsg = `HTTP ${statusCode}${statusCode === 502 ? ' (scraper se quedó sin tiempo o memoria)' : ''}`;
      }
      console.error(`❌ Scraper ${targetUrl} respondió HTTP ${statusCode}: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('El buscador tardó demasiado (90s). Intenta de nuevo.');
    }
    throw error;
  }
}

/**
 * Search Google Maps with automatic failover between scraper nodes.
 */
async function searchGoogleMaps(city, niche, limit = 5) {
  if (scraperUrls.length === 0) {
    throw new Error('No se han configurado URLs de microservicio Scraper.');
  }

  // Try each scraper in rotation, with failover to the next one
  const startIndex = currentScraperIndex;
  currentScraperIndex = (currentScraperIndex + 1) % scraperUrls.length;

  for (let attempt = 0; attempt < scraperUrls.length; attempt++) {
    const idx = (startIndex + attempt) % scraperUrls.length;
    const targetUrl = scraperUrls[idx];

    try {
      console.log(`📡 [Balanceador Scraper] Enviando petición a: ${targetUrl} (Nodo ${idx + 1}/${scraperUrls.length})`);
      const results = await callScraper(targetUrl, city, niche, limit);
      return results;
    } catch (error) {
      console.error(`❌ Nodo ${idx + 1} falló: ${error.message}`);
      if (attempt < scraperUrls.length - 1) {
        console.log(`🔄 Intentando con el siguiente nodo scraper...`);
      } else {
        throw new Error(`Todos los scrapers fallaron. Último error: ${error.message}`);
      }
    }
  }
}

module.exports = { searchGoogleMaps };
