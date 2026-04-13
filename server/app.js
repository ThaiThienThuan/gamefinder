const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');
const setting = require('./Config/Setting.json');
const router = require('./apps/controllers/index');

const app = express();

// Middleware
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || setting.cors.allowedOrigin;
const LOG_LEVEL = process.env.LOG_LEVEL || setting.server.logLevel;

app.use(morgan(LOG_LEVEL));
app.use(cors({
  origin: ALLOWED_ORIGIN.includes(',') ? ALLOWED_ORIGIN.split(',') : ALLOWED_ORIGIN,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api', router);

// Health check (root)
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbStatus = dbState === 1 ? 'connected' : 'disconnected';
  const httpStatus = dbState === 1 ? 200 : 503;

  res.status(httpStatus).json({
    status: dbState === 1 ? 'ok' : 'degraded',
    db: dbStatus
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
