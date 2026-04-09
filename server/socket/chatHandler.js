const MessageService = require('../apps/Services/MessageService');

function registerChatHandlers(io, socket) {

  socket.on('chat:message', async ({ roomId, text, attachmentIds } = {}) => {
    try {
      if (!socket.user) {
        return socket.emit('error', { message: 'Authentication required' });
      }
      if (!roomId || !text?.trim()) {
        return socket.emit('error', { message: 'roomId and text are required' });
      }

      const userId = socket.user.id;
      if (!userId) {
        return socket.emit('error', { message: 'Registered account required to send messages' });
      }

      // MessageService saves to DB and emits to room channel
      const messageService = new MessageService(io);
      await messageService.sendMessage(roomId, userId, text.trim(), attachmentIds || []);

    } catch (err) {
      console.error('chat:message error:', err.message);
      socket.emit('error', { message: err.message });
    }
  });
}

module.exports = registerChatHandlers;
