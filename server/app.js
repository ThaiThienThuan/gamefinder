const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const setting = require('./Config/Setting.json');
const router = require('./apps/controllers/index');

const app = express();

// Middleware
app.use(morgan(setting.server.logLevel));
app.use(cors({ origin: setting.cors.allowedOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api', router);

// Health check (root)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    db: 'connected'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

module.exports = app;
