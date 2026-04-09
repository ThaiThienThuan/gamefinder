const MatchmakingService = require('../apps/Services/MatchmakingService');

function registerMatchmakingHandlers(io, socket) {

  socket.on('finding:start', async ({ mode, rank } = {}) => {
    try {
      if (!socket.user?.id) {
        return socket.emit('error', { message: 'Registered account required for matchmaking' });
      }
      if (!mode || !rank) {
        return socket.emit('error', { message: 'mode and rank are required' });
      }

      const matchmakingService = new MatchmakingService(io);
      const result = await matchmakingService.enterQueue(socket.user.id, mode, rank, socket.id);

      socket.emit('finding:queued', {
        position: result.position,
        total: result.total
      });

    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('finding:stop', async () => {
    if (!socket.user?.id) return;
    const matchmakingService = new MatchmakingService(io);
    await matchmakingService.leaveQueue(socket.user.id);
    socket.emit('finding:stopped');
  });
}

module.exports = registerMatchmakingHandlers;
