const { Server } = require('socket.io');
const setting = require('../Config/Setting.json');
const { authMiddleware } = require('../Util/VerifyToken');

const registerRoomHandlers = require('./roomHandler');
const registerChatHandlers = require('./chatHandler');
const registerPresenceHandlers = require('./presenceHandler');
const registerMatchmakingHandlers = require('./matchmakingHandler');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: setting.cors.allowedOrigin,
      methods: ['GET', 'POST'],
      credentials: true
    }
    // [REDIS_PLACEHOLDER] - In Phase C, add adapter here:
    // adapter: createAdapter(pubClient, subClient)
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

    socket.on('disconnect', (reason) => {
      console.log(`✗ Socket disconnected: ${socket.id} reason:${reason}`);
      // [REDIS_PLACEHOLDER] - In Phase C, remove user from Redis presence map here
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { initSocket, getIO };
