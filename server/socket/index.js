const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const setting = require('../Config/Setting.json');
const { authMiddleware } = require('../Util/VerifyToken');
const { redisPub, redisSub, removePresence } = require('../redis/redisClient');

const registerRoomHandlers = require('./roomHandler');
const registerChatHandlers = require('./chatHandler');
const registerPresenceHandlers = require('./presenceHandler');
const registerMatchmakingHandlers = require('./matchmakingHandler');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: Array.isArray(setting.cors.allowedOrigin)
        ? setting.cors.allowedOrigin
        : [setting.cors.allowedOrigin, 'http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    adapter: createAdapter(redisPub, redisSub)
  });

  // Auth middleware for socket connections
  // Attaches socket.user = { id, guestId } same as HTTP authMiddleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const guestId = socket.handshake.auth?.guestId;

    const fakeReq = {
      headers: {
        authorization: token ? `Bearer ${token}` : undefined,
        'x-guest-id': guestId
      }
    };

    authMiddleware(fakeReq, {}, (err) => {
      if (err) return next(err);
      socket.user = fakeReq.user || null;
      next();
    });
  });

  io.on('connection', (socket) => {
    console.log(`✓ Socket connected: ${socket.id} user:${socket.user?.id || socket.user?.guestId || 'anonymous'}`);

    registerRoomHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    registerMatchmakingHandlers(io, socket);

    socket.on('disconnect', async (reason) => {
      console.log(`✗ Socket disconnected: ${socket.id} reason:${reason}`);
      if (socket.user?.id) {
        await removePresence(socket.user.id);
      }
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { initSocket, getIO };
