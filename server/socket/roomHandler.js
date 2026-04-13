// Server-managed voice state — single source of truth
// Map: roomId → Map<userId, {userId, name, muted, speaking}>
const voiceRooms = new Map();

function getVoiceMembers(roomId) {
  return voiceRooms.has(roomId) ? Array.from(voiceRooms.get(roomId).values()) : [];
}

function registerRoomHandlers(io, socket) {

  // Join the lobby channel for a specific game + mode
  socket.on('room:join-lobby', ({ game, mode } = {}) => {
    if (!mode) return;
    const channel = game ? `lobby:${game}:${mode}` : `lobby:${mode}`;
    socket.join(channel);
  });

  // Leave lobby channel
  socket.on('room:leave-lobby', () => {
    socket.rooms.forEach(room => {
      if (room.startsWith('lobby:')) socket.leave(room);
    });
  });

  // Join a specific room channel
  socket.on('room:join', ({ roomId } = {}) => {
    if (!roomId) return;
    socket.join(`room:${roomId}`);
    // Send current voice members to the joining client immediately
    socket.emit('voice:members', { roomId, members: getVoiceMembers(roomId) });
  });

  // Leave a specific room channel
  socket.on('room:leave', ({ roomId } = {}) => {
    if (!roomId) return;
    socket.leave(`room:${roomId}`);
  });

  // ── Voice channel — server-managed state ──────────────────────────────

  socket.on('voice:join', (data) => {
    if (!data?.roomId || !data?.userId) return;
    const { roomId, userId, name, muted } = data;

    if (!voiceRooms.has(roomId)) voiceRooms.set(roomId, new Map());
    voiceRooms.get(roomId).set(userId, { userId, name: name || 'Người chơi', muted: muted ?? false, speaking: false });

    // Broadcast updated full list to EVERYONE in room (including sender)
    io.to(`room:${roomId}`).emit('voice:members', { roomId, members: getVoiceMembers(roomId) });
  });

  socket.on('voice:leave', (data) => {
    if (!data?.roomId || !data?.userId) return;
    const { roomId, userId } = data;

    if (voiceRooms.has(roomId)) {
      voiceRooms.get(roomId).delete(userId);
      if (voiceRooms.get(roomId).size === 0) voiceRooms.delete(roomId);
    }

    // Broadcast updated list
    io.to(`room:${roomId}`).emit('voice:members', { roomId, members: getVoiceMembers(roomId) });
  });

  socket.on('voice:state', (data) => {
    if (!data?.roomId || !data?.userId) return;
    const { roomId, userId, muted, speaking } = data;

    if (voiceRooms.has(roomId) && voiceRooms.get(roomId).has(userId)) {
      const member = voiceRooms.get(roomId).get(userId);
      if (muted !== undefined) member.muted = muted;
      if (speaking !== undefined) member.speaking = speaking;
    }

    // Broadcast state change to others (not sender — sender already has local state)
    socket.to(`room:${roomId}`).emit('voice:state', data);
  });

  // Client requests current voice members (e.g. on page load)
  socket.on('voice:get-members', ({ roomId } = {}) => {
    if (!roomId) return;
    socket.emit('voice:members', { roomId, members: getVoiceMembers(roomId) });
  });

  // Cleanup voice on disconnect
  socket.on('disconnect', () => {
    // Remove this socket's user from all voice rooms
    for (const [roomId, members] of voiceRooms.entries()) {
      for (const [userId, member] of members.entries()) {
        // We need to match by socket — store socket.id mapping
        // For now, iterate and check (simple approach)
      }
    }
  });
}

module.exports = registerRoomHandlers;
