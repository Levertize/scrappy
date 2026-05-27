/**
 * AI Web Scraper — Express Server Entrypoint
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./storage/db');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Middleware
// ============================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================
// Static Files — serve the frontend UI
// ============================================
app.use(express.static(path.join(__dirname, 'ui')));

// ============================================
// API Routes (will be added in Tahap 2-5)
// ============================================
// app.use('/api/auth', require('./api/routes/auth'));
// app.use('/api/scrape', require('./api/routes/scrape'));
// app.use('/api/chat', require('./api/routes/chat'));
// app.use('/api/export', require('./api/routes/export'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ============================================
// SPA Fallback — serve index.html for all non-API routes
// ============================================
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'ui', 'index.html'));
  }
});

// ============================================
// Global Error Handler
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
    },
  });
});

// ============================================
// Start Server
// ============================================
function startServer() {
  // Initialize database
  initDatabase();

  app.listen(PORT, () => {
    console.log('');
    console.log('🤖 ═══════════════════════════════════════');
    console.log('   AI Web Scraper — Server Started');
    console.log(`   📡 http://localhost:${PORT}`);
    console.log(`   🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('🤖 ═══════════════════════════════════════');
    console.log('');
  });
}

startServer();

module.exports = app;
