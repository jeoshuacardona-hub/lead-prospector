const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'lead_prospector_secret_key_2024_super_secure';

/**
 * POST /api/auth/login
 * Authenticate user with username and password.
 * Returns JWT token and user data.
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username y password son requeridos' });
    }

    const db = getDb();

    // Find user by username
    const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(403).json({ error: 'Cuenta desactivada. Contacte al administrador.' });
    }

    // Verify password
    const isValidPassword = bcrypt.compareSync(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generate JWT token (expires in 24 hours)
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return token and user data (exclude password_hash)
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user data.
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const db = getDb();

    const user = await db.prepare(
      'SELECT id, username, full_name, email, role, active, created_at FROM users WHERE id = ?'
    ).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Cuenta desactivada' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Error al obtener datos del usuario' });
  }
});

module.exports = router;
