const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication + admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/users
 * List all users (exclude password_hash).
 */
router.get('/users', async (req, res) => {
  try {
    const db = getDb();

    const users = await db.prepare(`
      SELECT id, username, full_name, email, role, active, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();

    res.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

/**
 * POST /api/admin/users
 * Create a new user.
 */
router.post('/users', async (req, res) => {
  try {
    const { username, full_name, email, password, role = 'asesor' } = req.body;

    // Validate input
    if (!username || !full_name || !password) {
      return res.status(400).json({ error: 'Username, nombre completo y password son requeridos' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'El username debe tener al menos 3 caracteres' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'El password debe tener al menos 6 caracteres' });
    }

    const validRoles = ['admin', 'asesor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Rol inválido. Debe ser: ${validRoles.join(', ')}` });
    }

    const db = getDb();

    // Check if username already exists
    const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'El username ya está en uso' });
    }

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10);

    // Insert user
    const result = await db.prepare(`
      INSERT INTO users (username, full_name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(username, full_name, email || null, passwordHash, role);

    const newUser = await db.prepare(
      'SELECT id, username, full_name, email, role, active, created_at FROM users WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: newUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update an existing user.
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, full_name, email, password, role, active } = req.body;

    const db = getDb();

    // Check if user exists
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (username !== undefined) {
      // Check uniqueness
      const existing = await db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id);
      if (existing) {
        return res.status(409).json({ error: 'El username ya está en uso' });
      }
      updates.push('username = ?');
      params.push(username);
    }

    if (full_name !== undefined) {
      updates.push('full_name = ?');
      params.push(full_name);
    }

    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email || null);
    }

    if (password !== undefined) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'El password debe tener al menos 6 caracteres' });
      }
      const passwordHash = bcrypt.hashSync(password, 10);
      updates.push('password_hash = ?');
      params.push(passwordHash);
    }

    if (role !== undefined) {
      const validRoles = ['admin', 'asesor'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Rol inválido. Debe ser: ${validRoles.join(', ')}` });
      }
      updates.push('role = ?');
      params.push(role);
    }

    if (active !== undefined) {
      updates.push('active = ?');
      params.push(active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }

    params.push(id);
    await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // Return updated user
    const updatedUser = await db.prepare(
      'SELECT id, username, full_name, email, role, active, created_at FROM users WHERE id = ?'
    ).get(id);

    res.json({
      message: 'Usuario actualizado exitosamente',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Soft-delete a user (set active=0). Cannot delete admin.
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    // Check if user exists
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Prevent deleting admin users
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'No se puede eliminar un usuario administrador' });
    }

    // Prevent self-deletion
    if (parseInt(id) === req.user.id) {
      return res.status(403).json({ error: 'No se puede eliminar su propia cuenta' });
    }

    // Soft delete
    await db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(id);

    res.json({ message: 'Usuario desactivado exitosamente' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Error al desactivar usuario' });
  }
});

/**
 * GET /api/admin/stats
 * Get dashboard statistics.
 */
router.get('/stats', async (req, res) => {
  try {
    const db = getDb();

    // Total leads
    const { total_leads } = await db.prepare('SELECT COUNT(*) as total_leads FROM leads').get();

    // Leads this week
    let weekQuery;
    if (db.isPostgres) {
      weekQuery = `SELECT COUNT(*) as leads_this_week FROM leads WHERE created_at >= NOW() - INTERVAL '7 days'`;
    } else {
      weekQuery = `SELECT COUNT(*) as leads_this_week FROM leads WHERE created_at >= datetime('now', '-7 days')`;
    }
    const { leads_this_week } = await db.prepare(weekQuery).get();

    // Total searches
    const { total_searches } = await db.prepare('SELECT COUNT(*) as total_searches FROM search_history').get();

    // Leads by user
    const leads_by_user = await db.prepare(`
      SELECT l.user_id, u.full_name, COUNT(*) as count
      FROM leads l
      JOIN users u ON l.user_id = u.id
      GROUP BY l.user_id, u.full_name
      ORDER BY count DESC
    `).all();

    // Top 10 cities
    const leads_by_city = await db.prepare(`
      SELECT city, COUNT(*) as count
      FROM leads
      GROUP BY city
      ORDER BY count DESC
      LIMIT 10
    `).all();

    // Top 10 niches
    const leads_by_niche = await db.prepare(`
      SELECT niche, COUNT(*) as count
      FROM leads
      GROUP BY niche
      ORDER BY count DESC
      LIMIT 10
    `).all();

    // Leads by week (last 8 weeks)
    let weekHistoryQuery;
    if (db.isPostgres) {
      weekHistoryQuery = `
        SELECT
          to_char(created_at, 'YYYY-"W"IW') as week,
          COUNT(*) as count
        FROM leads
        WHERE created_at >= NOW() - INTERVAL '56 days'
        GROUP BY week
        ORDER BY week ASC
      `;
    } else {
      weekHistoryQuery = `
        SELECT
          strftime('%Y-W%W', created_at) as week,
          COUNT(*) as count
        FROM leads
        WHERE created_at >= datetime('now', '-56 days')
        GROUP BY week
        ORDER BY week ASC
      `;
    }
    const leads_by_week = await db.prepare(weekHistoryQuery).all();

    // Enrichment rate
    const { total_enriched } = await db.prepare(
      'SELECT COUNT(*) as total_enriched FROM lead_enrichments'
    ).get();

    const enrichment_rate = total_leads > 0
      ? Math.round((total_enriched / total_leads) * 100 * 100) / 100
      : 0;

    // Leads by status
    const leads_by_status = await db.prepare(`
      SELECT status, COUNT(*) as count
      FROM leads
      GROUP BY status
      ORDER BY count DESC
    `).all();

    res.json({
      total_leads,
      leads_this_week,
      total_searches,
      leads_by_user,
      leads_by_city,
      leads_by_niche,
      leads_by_week,
      leads_by_status,
      enrichment_rate,
      total_enriched
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

module.exports = router;
