/*  */require('dotenv').config();

const http = require('http');
const app = require('./app');
const { connectDatabase } = require('./apps/Database/Database');
const { initSocket } = require('./socket/index');
const setting = require('./Config/Setting.json');

const PORT = process.env.PORT || setting.server.port;

async function startServer() {
  try {
    await connectDatabase();
    console.log('✓ Database connected');

    // Try to initialize Redis adapter; if it fails, continue without it (degraded mode)
    let redisAvailable = true;
    try {
      const { redis } = require('./redis/redisClient');
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Redis connection timeout')), 5000);
        redis.on('ready', () => {
          clearTimeout(timeout);
          resolve();
        });
        redis.on('error', reject);
      });
    } catch (err) {
      console.warn(`⚠ Redis unavailable (${err.message}) — running in degraded mode (single instance only)`);
      redisAvailable = false;
    }

    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Socket.io attached to HTTP server`);
      console.log(`✓ Redis adapter: ${redisAvailable ? 'enabled' : 'disabled'}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown on SIGTERM
    const shutdown = async (signal) => {
      console.log(`⚠ ${signal} received — shutting down...`);
      server.close(async () => {
        try {
          const mongoose = require('mongoose');
          await mongoose.disconnect();
        } catch (_) {}
        console.log('✓ Server closed gracefully');
        process.exit(0);
      });
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('✗ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
