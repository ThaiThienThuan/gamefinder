function registerPresenceHandlers(io, socket) {

  socket.on('presence:update', ({ status } = {}) => {
    if (!socket.user) return;
    const userId = socket.user.id || socket.user.guestId;
    if (!userId) return;

    const validStatuses = ['online', 'idle', 'offline'];
    if (!validStatuses.includes(status)) return;

    // [REDIS_PLACEHOLDER] - In Phase C, store presence in Redis:
    // await redis.set(`online:${userId}`, status, 'EX', 300);

    // Broadcast presence update to all connected clients
    // [REDIS_PLACEHOLDER] - In Phase C, use Redis pub/sub so all instances get this
    io.emit('presence:update', { userId, status });
  });

  // Auto-emit offline on disconnect
  socket.on('disconnect', () => {
    if (!socket.user) return;
    const userId = socket.user.id || socket.user.guestId;
    if (!userId) return;

    // [REDIS_PLACEHOLDER] - In Phase C, remove from Redis presence map
    io.emit('presence:update', { userId, status: 'offline' });
  });
}

module.exports = registerPresenceHandlers;
