const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const setting = require('../Config/Setting.json');
const { authMiddleware } = require('../Util/VerifyToken');
const { redisPub, redisSub, removePresence } = require('../redis/redisClient');

const registerRoomHandlers = require('./roomHandler');
const registerChatHandlers = require('./chatHandler');
const registerPresenceHandlers = require('./presenceHandler');
const registerMatchmakingHandlers = require('./matchmakingHandler');
const RoomService = require('../apps/Services/RoomService');
const RoomRepository = require('../apps/Repository/RoomRepository');

let io;

// Grace timers for owners who disconnected. userId -> { timer, roomId }
const ownerGraceTimers = new Map();
const OWNER_GRACE_MS = 45_000;

function initSocket(server) {
  const envOrigin = process.env.ALLOWED_ORIGIN || setting.cors.allowedOrigin;
  const allowedOrigins = envOrigin.includes(',')
    ? envOrigin.split(',').map((s) => s.trim())
    : [envOrigin, 'http://localhost:5173', 'http://localhost:3000'];

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
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

    // Personal channel — for direct-to-user events (join requests, etc.) regardless of which page/room they're on
    const personalId = socket.user?.id || socket.user?.guestId;
    if (personalId) socket.join(`user:${personalId}`);

    // If owner reconnected within grace period — cancel pending abandon
    const uid = socket.user?.id;
    if (uid && ownerGraceTimers.has(uid)) {
      const { timer, roomId } = ownerGraceTimers.get(uid);
      clearTimeout(timer);
      ownerGraceTimers.delete(uid);
      console.log(`[owner-grace] Owner ${uid} reconnected, cancelled abandon for room ${roomId}`);
    }

    registerRoomHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    registerMatchmakingHandlers(io, socket);
    // LiveKit không cần socket handler — dùng REST /api/livekit/token

    socket.on('disconnect', async (reason) => {
      console.log(`✗ Socket disconnected: ${socket.id} reason:${reason}`);
      const userId = socket.user?.id;
      if (userId) {
        await removePresence(userId);

        // If this user owns an active room and has no other connected sockets,
        // start a grace timer. On expiry: transfer ownership or delete room.
        try {
          const roomRepo = new RoomRepository();
          const owned = await roomRepo.findActiveByOwner(userId);
          if (owned) {
            // Check whether user still has any other live socket connected
            const sockets = await io.fetchSockets();
            const stillOnline = sockets.some(s => s.user?.id === userId && s.id !== socket.id);
            if (!stillOnline && !ownerGraceTimers.has(userId)) {
              const roomId = owned._id.toString();
              console.log(`[owner-grace] Owner ${userId} left room ${roomId}, grace ${OWNER_GRACE_MS}ms`);
              const timer = setTimeout(async () => {
                ownerGraceTimers.delete(userId);
                try {
                  const svc = new RoomService(io);
                  const result = await svc.handleOwnerAbandoned(roomId);
                  console.log(`[owner-grace] Room ${roomId} abandon action:`, result.action);
                } catch (e) {
                  console.error('[owner-grace] abandon failed:', e.message);
                }
              }, OWNER_GRACE_MS);
              ownerGraceTimers.set(userId, { timer, roomId });
            }
          }
        } catch (e) {
          console.error('[owner-grace] disconnect handler error:', e.message);
        }
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
