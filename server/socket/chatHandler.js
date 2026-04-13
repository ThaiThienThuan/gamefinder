const MessageService = require('../apps/Services/MessageService');
const { checkRateLimit } = require('../redis/redisClient');

function registerChatHandlers(io, socket) {

  socket.on('chat:message', async ({ roomId, text, attachmentIds } = {}) => {
    try {
      if (!socket.user) {
        return socket.emit('error', { message: 'Authentication required' });
      }
      const hasAttachments = Array.isArray(attachmentIds) && attachmentIds.length > 0;
      if (!roomId || (!text?.trim() && !hasAttachments)) {
        return socket.emit('error', { message: 'roomId and text or attachments are required' });
      }

      const userId = socket.user.id;
      if (!userId) {
        return socket.emit('error', { message: 'Registered account required to send messages' });
      }

      // Rate limit: 1 message per second per user
      const allowed = await checkRateLimit(userId, 1);
      if (!allowed) {
        return socket.emit('error', { message: 'Message rate limit exceeded. Max 1 per second.' });
      }

      // MessageService saves to DB and emits to room channel
      const messageService = new MessageService(io);
      await messageService.sendMessage(roomId, userId, text?.trim() || '', attachmentIds || []);

    } catch (err) {
      console.error('chat:message error:', err.message);
      socket.emit('error', { message: err.message });
    }
  });

  // Typing indicator — relay to room (not sender). Client owns debounce/timeout.
  const relayTyping = (event) => ({ roomId, name } = {}) => {
    if (!roomId || !socket.user?.id) return;
    socket.to(`room:${roomId}`).emit(event, {
      roomId,
      userId: socket.user.id,
      name: name || '',
    });
  };
  socket.on('chat:typing-start', relayTyping('chat:typing-start'));
  socket.on('chat:typing-stop', relayTyping('chat:typing-stop'));
}

module.exports = registerChatHandlers;
