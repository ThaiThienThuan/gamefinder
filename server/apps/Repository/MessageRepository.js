const Message = require('../Entity/Message');

class MessageRepository {
  async create(messageData) {
    const message = new Message(messageData);
    return await message.save();
  }

  async findByRoom(roomId, limit = 50, skip = 0) {
    return await Message.find({ roomId })
      .populate('userId')
      .populate('attachments')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  async findById(messageId) {
    return await Message.findById(messageId).populate('userId').populate('attachments');
  }

  async findByIdWithUser(messageId) {
    return await Message.findById(messageId).populate('userId', 'username avatar rank');
  }

  async deleteById(messageId) {
    return await Message.findByIdAndDelete(messageId);
  }

  async countByRoom(roomId) {
    return await Message.countDocuments({ roomId });
  }

  async findAll() {
    return await Message.find().populate('userId').populate('attachments').sort({ createdAt: -1 });
  }

  async deleteByRoom(roomId) {
    return await Message.deleteMany({ roomId });
  }

  async updateById(messageId, updateData) {
    return await Message.findByIdAndUpdate(messageId, updateData, { new: true })
      .populate('userId')
      .populate('attachments');
  }

  async findLatestByRoom(roomId, limit = 20) {
    return await Message.find({ roomId })
      .populate('userId')
      .populate('attachments')
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}

module.exports = MessageRepository;
