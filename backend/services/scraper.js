const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || 'http://localhost:3002';

/**
 * Search Google Maps by forwarding the request to the scraper microservice (Node B).
 *
 * @param {string} city - The city to search in
 * @param {string} niche - The business niche to search for
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} Array of lead objects
 */
async function searchGoogleMaps(city, niche, limit = 5) {
  try {
    console.log(`📡 Enviando petición de prospección a microservicio Scraper: "${niche}" en "${city}"`);
    
    const response = await fetch(`${SCRAPER_SERVICE_URL}/scrape`, {
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
    console.error('❌ Error de comunicación con microservicio Scraper:', error.message);
    throw new Error('El buscador remoto no responde o devolvió un error: ' + error.message);
  }
}

module.exports = { searchGoogleMaps };
