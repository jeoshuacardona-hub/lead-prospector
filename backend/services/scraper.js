// Support a comma-separated list of scraper URLs for automatic round-robin load balancing
const scraperUrls = (process.env.SCRAPER_SERVICE_URL || 'http://localhost:3002')
  .split(',')
  .map(url => url.trim())
  .filter(Boolean);

let currentScraperIndex = 0;

/**
 * Search Google Maps by forwarding the request to one of the scraper microservices (Node B).
 * Uses round-robin load balancing to rotate between configured scraper nodes.
 *
 * @param {string} city - The city to search in
 * @param {string} niche - The business niche to search for
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} Array of lead objects
 */
async function searchGoogleMaps(city, niche, limit = 5) {
  if (scraperUrls.length === 0) {
    throw new Error('No se han configurado URLs de microservicio Scraper.');
  }

  // Get the next scraper URL in the rotation
  const targetUrl = scraperUrls[currentScraperIndex];
  currentScraperIndex = (currentScraperIndex + 1) % scraperUrls.length;

  try {
    console.log(`📡 [Balanceador Scraper] Enviando petición a: ${targetUrl} (Nodo ${currentScraperIndex + 1}/${scraperUrls.length})`);
    
    const response = await fetch(`${targetUrl}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ city, niche, limit })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: 'Error desconocido en el microservicio' }));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    const results = await response.json();
    return results;
  } catch (error) {
    console.error(`❌ Error de comunicación con microservicio Scraper (${targetUrl}):`, error.message);
    throw new Error(`El buscador en ${targetUrl} no responde o devolvió un error: ${error.message}`);
  }
}

module.exports = { searchGoogleMaps };
