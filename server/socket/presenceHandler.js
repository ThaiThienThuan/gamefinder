const { setPresence } = require('../redis/redisClient');

function registerPresenceHandlers(io, socket) {

  socket.on('presence:update', async ({ status } = {}) => {
    if (!socket.user) return;
    const userId = socket.user.id || socket.user.guestId;
    if (!userId) return;

    const validStatuses = ['online', 'idle', 'offline'];
    if (!validStatuses.includes(status)) return;

    // Store in Redis with 5min TTL
    await setPresence(userId, status);

    // Broadcast to all clients (Redis adapter ensures all instances see this)
    io.emit('presence:update', { userId, status });
  });
}

module.exports = registerPresenceHandlers;
