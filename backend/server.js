require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { initDb } = require('./db/database');

// Import routes
const authRoutes = require('./routes/auth');
const leadsRoutes = require('./routes/leads');
const exportRoutes = require('./routes/export');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins to avoid any CORS blocks on localhost, Render, Vercel, or custom domains
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    message: 'Lead Prospector API is running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      leads: '/api/leads',
      export: '/api/export',
      admin: '/api/admin'
    }
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/admin', adminRoutes);

// Serve static frontend files in production (Vite build output)
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  console.log('🌐 Serviendo frontend estático desde:', frontendDistPath);
  app.use(express.static(frontendDistPath));
  
  // Catch-all route to serve index.html for SPA routing
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Initialize database and start server
async function startServer() {
  try {
    await initDb();
    console.log('✅ Base de datos inicializada correctamente');
    
    app.listen(PORT, () => {
      console.log(`🚀 Lead Prospector API corriendo en http://localhost:${PORT}`);
      console.log(`📡 CORS habilitado para http://localhost:5173`);
    });
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
