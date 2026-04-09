const MessageRepository = require('../Repository/MessageRepository');
const RoomMemberRepository = require('../Repository/RoomMemberRepository');
const RoomRepository = require('../Repository/RoomRepository');
const UserRepository = require('../Repository/UserRepository');

class MessageService {
  constructor(io = null) {
    this.io = io;
    this.messageRepository = new MessageRepository();
    this.roomMemberRepository = new RoomMemberRepository();
    this.roomRepository = new RoomRepository();
    this.userRepository = new UserRepository();
  }

  // Safe emit helper
  emit(channel, event, payload) {
    if (this.io) {
      this.io.to(channel).emit(event, payload);
    }
  }

  async sendMessage(roomId, userId, text, attachmentIds = []) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const member = await this.roomMemberRepository.findByRoomAndUser(roomId, userId);
    if (!member && room.ownerId._id.toString() !== userId.toString()) {
      throw new Error('User is not a member of this room');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Message text cannot be empty');
    }

    if (text.length > 500) {
      throw new Error('Message exceeds maximum length of 500 characters');
    }

    const message = await this.messageRepository.create({
      roomId,
      userId,
      text,
      attachments: attachmentIds
    });

    const populated = await this.messageRepository.findByIdWithUser(message._id);
    this.emit(`room:${roomId}`, 'chat:message', populated);
    // [REDIS_PLACEHOLDER] - In Phase C, emit goes through Redis pub/sub
    return populated;
  }

  async getMessages(roomId, limit = 50, skip = 0) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const messages = await this.messageRepository.findByRoom(roomId, limit, skip);
    const total = await this.messageRepository.countByRoom(roomId);

    return {
      messages: messages.reverse(),
      total,
      limit,
      skip
    };
  }

  async deleteMessage(messageId, userId) {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.userId._id.toString() !== userId.toString()) {
      throw new Error('Only message author can delete it');
    }

    await this.messageRepository.deleteById(messageId);

    // [REDIS_PLACEHOLDER] - Emit message:deleted event via Socket.io in Phase B/C

    return { success: true };
  }

  async getRoomChatHistory(roomId) {
    const messages = await this.messageRepository.findLatestByRoom(roomId, 50);
    return messages.reverse();
  }
}

module.exports = MessageService;
