function registerRoomHandlers(io, socket) {

  // Join the lobby channel for a specific mode (e.g. "lobby:RANKED")
  socket.on('room:join-lobby', ({ mode } = {}) => {
    if (!mode) return;
    const channel = `lobby:${mode.toUpperCase()}`;
    socket.join(channel);
    console.log(`Socket ${socket.id} joined ${channel}`);
  });

  // Leave lobby channel
  socket.on('room:leave-lobby', () => {
    // Leave all lobby:* channels this socket is in
    socket.rooms.forEach(room => {
      if (room.startsWith('lobby:')) socket.leave(room);
    });
  });

  // Join a specific room channel for member updates and chat
  socket.on('room:join', ({ roomId } = {}) => {
    if (!roomId) return;
    socket.join(`room:${roomId}`);
    console.log(`Socket ${socket.id} joined room:${roomId}`);
  });

  // Leave a specific room channel
  socket.on('room:leave', ({ roomId } = {}) => {
    if (!roomId) return;
    socket.leave(`room:${roomId}`);
  });
}

module.exports = registerRoomHandlers;
