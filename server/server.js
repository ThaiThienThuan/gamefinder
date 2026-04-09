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

    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Socket.io attached to HTTP server`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
