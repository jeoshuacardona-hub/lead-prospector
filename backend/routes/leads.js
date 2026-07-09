const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { searchGoogleMaps } = require('../services/scraper');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/leads/search
 * Search Google Maps for businesses by city and niche.
 * Returns results (NOT saved to DB yet).
 */
router.post('/search', async (req, res) => {
  try {
    const { city, niche, limit = 20 } = req.body;

    // Validate input
    if (!city || !niche) {
      return res.status(400).json({ error: 'Ciudad y nicho son requeridos' });
    }

    const searchLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 50);

    console.log(`🔍 Buscando "${niche}" en "${city}" (límite: ${searchLimit}) - Usuario: ${req.user.username}`);

    // Perform the search
    const rawResults = await searchGoogleMaps(city, niche, searchLimit);
    const db = getDb();

    // Prepare statement to check if a business is already saved by someone
    const checkStmt = db.prepare(`
      SELECT l.id, u.username, u.full_name
      FROM leads l
      JOIN users u ON l.user_id = u.id
      WHERE (l.google_maps_url IS NOT NULL AND l.google_maps_url = ?)
         OR (l.phone IS NOT NULL AND l.phone = ?)
      LIMIT 1
    `);
    
    // Enrich search results with city, niche and claiming metadata
    const results = [];
    for (const item of rawResults) {
      let alreadySaved = false;
      let savedBy = null;

      if (item.google_maps_url || item.phone) {
        const match = await checkStmt.get(item.google_maps_url || '', item.phone || '');
        if (match) {
          alreadySaved = true;
          savedBy = match.full_name || match.username;
        }
      }

      results.push({
        ...item,
        city,
        niche,
        already_saved: alreadySaved,
        saved_by_name: savedBy
      });
    }

    // Record in search history
    await db.prepare(
      'INSERT INTO search_history (user_id, city, niche, results_count) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, city, niche, results.length);

    console.log(`✅ Búsqueda completada: ${results.length} resultados encontrados`);

    res.json({
      results,
      count: results.length,
      search: { city, niche, limit: searchLimit }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Error al realizar la búsqueda',
      message: error.message
    });
  }
});

/**
 * GET /api/leads
 * Get saved leads. Admin can see all leads, asesor only their own.
 * Supports filters: city, niche, status, enriched, page, limit
 */
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const {
      city,
      niche,
      status,
      enriched,
      page = 1,
      limit = 50,
      all
    } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
    const offset = (pageNum - 1) * limitNum;

    let conditions = [];
    let params = [];

    // If not admin or not requesting all, filter by user
    if (req.user.role !== 'admin' || all !== 'true') {
      conditions.push('l.user_id = ?');
      params.push(req.user.id);
    }

    // Apply filters
    if (city) {
      conditions.push('l.city LIKE ?');
      params.push(`%${city}%`);
    }
    if (niche) {
      conditions.push('l.niche LIKE ?');
      params.push(`%${niche}%`);
    }
    if (status) {
      conditions.push('l.status = ?');
      params.push(status);
    }
    if (enriched === 'true') {
      conditions.push('le.id IS NOT NULL');
    } else if (enriched === 'false') {
      conditions.push('le.id IS NULL');
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM leads l
      LEFT JOIN lead_enrichments le ON l.id = le.lead_id
      ${whereClause}
    `;
    const { total } = await db.prepare(countQuery).get(...params);

    // Get leads with enrichment data and user info
    const dataQuery = `
      SELECT
        l.*,
        le.instagram, le.facebook, le.tiktok, le.linkedin,
        le.other_social, le.phone_confirm, le.business_needs, le.weaknesses, le.notes,
        le.enriched_by, le.enriched_at,
        u.full_name as user_full_name,
        u.username as user_username,
        CASE WHEN le.id IS NOT NULL THEN 1 ELSE 0 END as is_enriched
      FROM leads l
      LEFT JOIN lead_enrichments le ON l.id = le.lead_id
      LEFT JOIN users u ON l.user_id = u.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const leads = await db.prepare(dataQuery).all(...params, limitNum, offset);

    res.json({
      leads,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Error al obtener leads' });
  }
});

/**
 * POST /api/leads/save
 * Save search results as leads in the database.
 */
router.post('/save', async (req, res) => {
  try {
    const { leads } = req.body;

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'Se requiere un arreglo de leads' });
    }

    const db = getDb();

    const insertStmt = db.prepare(`
      INSERT INTO leads (user_id, business_name, city, niche, address, phone, email, website, rating, reviews_count, google_maps_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const savedLeads = [];

    const insertMany = db.transaction(async (leadsToInsert) => {
      for (const lead of leadsToInsert) {
        const name = lead.business_name || lead.name;
        // Validate required fields
        if (!name || !lead.city || !lead.niche) {
          continue; // Skip invalid leads
        }

        // Check if lead was already saved by anyone in the DB
        const mapsUrl = lead.google_maps_url || '';
        const phoneNum = lead.phone || '';
        if (mapsUrl || phoneNum) {
          const match = await db.prepare(`
            SELECT id FROM leads 
            WHERE (google_maps_url IS NOT NULL AND google_maps_url = ?) 
               OR (phone IS NOT NULL AND phone = ?)
            LIMIT 1
          `).get(mapsUrl, phoneNum);

          if (match) {
            continue; // Skip saving to enforce unique lead ownership
          }
        }

        const result = await insertStmt.run(
          req.user.id,
          name,
          lead.city,
          lead.niche,
          lead.address || null,
          lead.phone || null,
          lead.email || null,
          lead.website || null,
          lead.rating || null,
          lead.reviews_count || null,
          lead.google_maps_url || null
        );

        savedLeads.push({
          id: result.lastInsertRowid,
          user_id: req.user.id,
          ...lead,
          status: 'nuevo',
          created_at: new Date().toISOString()
        });
      }
    });

    await insertMany(leads);

    console.log(`💾 ${savedLeads.length} leads guardados por ${req.user.username}`);

    res.status(201).json({
      message: `${savedLeads.length} leads guardados exitosamente`,
      leads: savedLeads,
      count: savedLeads.length
    });
  } catch (error) {
    console.error('Save leads error:', error);
    res.status(500).json({ error: 'Error al guardar leads' });
  }
});

/**
 * PUT /api/leads/:id/enrich
 * Add or update enrichment data for a lead.
 */
router.put('/:id/enrich', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      instagram, facebook, tiktok, linkedin,
      other_social, phone_confirm, business_needs, weaknesses, notes
    } = req.body;

    const db = getDb();

    // Check if lead exists
    const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    // Check ownership (admin can enrich any, asesor only their own)
    if (req.user.role !== 'admin' && lead.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tiene permiso para enriquecer este lead' });
    }

    // Insert or update enrichment (UPSERT)
    const existingEnrichment = await db.prepare('SELECT id FROM lead_enrichments WHERE lead_id = ?').get(id);

    if (existingEnrichment) {
      await db.prepare(`
        UPDATE lead_enrichments SET
          instagram = ?, facebook = ?, tiktok = ?, linkedin = ?,
          other_social = ?, phone_confirm = ?, business_needs = ?, weaknesses = ?, notes = ?,
          enriched_by = ?, enriched_at = CURRENT_TIMESTAMP
        WHERE lead_id = ?
      `).run(
        instagram || null, facebook || null, tiktok || null, linkedin || null,
        other_social || null, phone_confirm || null, business_needs || null, weaknesses || null, notes || null,
        req.user.id, id
      );
    } else {
      await db.prepare(`
        INSERT INTO lead_enrichments (lead_id, instagram, facebook, tiktok, linkedin, other_social, phone_confirm, business_needs, weaknesses, notes, enriched_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        instagram || null, facebook || null, tiktok || null, linkedin || null,
        other_social || null, phone_confirm || null, business_needs || null, weaknesses || null, notes || null,
        req.user.id
      );
    }

    // Return updated lead with enrichment
    const updatedLead = await db.prepare(`
      SELECT l.*, le.instagram, le.facebook, le.tiktok, le.linkedin,
        le.other_social, le.phone_confirm, le.business_needs, le.weaknesses, le.notes,
        le.enriched_by, le.enriched_at
      FROM leads l
      LEFT JOIN lead_enrichments le ON l.id = le.lead_id
      WHERE l.id = ?
    `).get(id);

    res.json({
      message: 'Lead enriquecido exitosamente',
      lead: updatedLead
    });
  } catch (error) {
    console.error('Enrich lead error:', error);
    res.status(500).json({ error: 'Error al enriquecer el lead' });
  }
});

/**
 * PUT /api/leads/:id/status
 * Update lead status.
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['nuevo', 'contactado', 'convertido', 'descartado'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`
      });
    }

    const db = getDb();

    // Check if lead exists
    const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    // Check ownership
    if (req.user.role !== 'admin' && lead.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tiene permiso para modificar este lead' });
    }

    await db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, id);

    res.json({
      message: 'Estado actualizado exitosamente',
      lead: { ...lead, status }
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Error al actualizar el estado' });
  }
});

/**
 * DELETE /api/leads/:id
 * Delete a lead (own leads only, or any if admin).
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    // Check if lead exists
    const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    // Check ownership
    if (req.user.role !== 'admin' && lead.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tiene permiso para eliminar este lead' });
    }

    // Delete lead (enrichments will cascade)
    await db.prepare('DELETE FROM leads WHERE id = ?').run(id);

    res.json({ message: 'Lead eliminado exitosamente' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Error al eliminar el lead' });
  }
});

/**
 * POST /api/leads/manual
 * Create a lead manually with its enrichment data.
 */
router.post('/manual', async (req, res) => {
  try {
    const {
      business_name, city, niche, address, phone, email, website,
      instagram, facebook, tiktok, linkedin, other_social,
      phone_confirm, business_needs, weaknesses, notes
    } = req.body;

    // Validate mandatory fields
    if (!business_name || !city || !niche) {
      return res.status(400).json({ error: 'Nombre del negocio, ciudad y nicho son obligatorios' });
    }
    if (!phone_confirm) {
      return res.status(400).json({ error: 'La confirmación del teléfono es obligatoria' });
    }
    if (!business_needs) {
      return res.status(400).json({ error: 'El campo de necesidades del cliente es obligatorio' });
    }

    const db = getDb();

    // Check for duplicate phone to keep DB unique
    if (phone) {
      const match = await db.prepare('SELECT id FROM leads WHERE phone = ? LIMIT 1').get(phone);
      if (match) {
        return res.status(409).json({ error: 'Este negocio ya está registrado con este número telefónico' });
      }
    }

    // Insert lead row
    const leadResult = await db.prepare(`
      INSERT INTO leads (user_id, business_name, city, niche, address, phone, email, website, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'nuevo')
    `).run(
      req.user.id,
      business_name,
      city,
      niche,
      address || null,
      phone || null,
      email || null,
      website || null
    );

    const leadId = leadResult.lastInsertRowid;

    // Insert enrichment row
    await db.prepare(`
      INSERT INTO lead_enrichments (lead_id, instagram, facebook, tiktok, linkedin, other_social, phone_confirm, business_needs, weaknesses, notes, enriched_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      leadId,
      instagram || null,
      facebook || null,
      tiktok || null,
      linkedin || null,
      other_social || null,
      phone_confirm,
      business_needs,
      weaknesses || null,
      notes || null,
      req.user.id
    );

    // Get the fully assembled lead
    const fullLead = await db.prepare(`
      SELECT l.*, le.instagram, le.facebook, le.tiktok, le.linkedin,
        le.other_social, le.phone_confirm, le.business_needs, le.weaknesses, le.notes,
        le.enriched_by, le.enriched_at,
        u.full_name as user_full_name,
        u.username as user_username,
        1 as is_enriched
      FROM leads l
      LEFT JOIN lead_enrichments le ON l.id = le.lead_id
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.id = ?
    `).get(leadId);

    res.status(201).json({
      message: 'Lead creado y enriquecido exitosamente',
      lead: fullLead
    });
  } catch (error) {
    console.error('Manual lead creation error:', error);
    res.status(500).json({ error: 'Error al crear el lead manualmente' });
  }
});

module.exports = router;
