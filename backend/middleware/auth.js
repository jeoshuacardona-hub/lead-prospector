const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'lead_prospector_secret_key_2024_super_secure';

/**
 * Middleware: Authenticate JWT token.
 * Extracts token from Authorization: Bearer <token> header.
 * Attaches decoded user data to req.user.
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Formato de token inválido. Use: Bearer <token>' });
    }

    const token = parts[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado. Inicie sesión nuevamente.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    return res.status(401).json({ error: 'Error de autenticación' });
  }
}

/**
 * Middleware: Require admin role.
 * Must be used AFTER authenticate middleware.
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
  }

  next();
}

module.exports = { authenticate, requireAdmin };
