const Attachment = require('../Entity/Attachment');

class AttachmentRepository {
  async create(attachmentData) {
    const attachment = new Attachment(attachmentData);
    return await attachment.save();
  }

  async findById(attachmentId) {
    return await Attachment.findById(attachmentId);
  }

  async findByRoom(roomId) {
    return await Attachment.find({ roomId }).sort({ createdAt: -1 });
  }

  async findByUser(userId) {
    return await Attachment.find({ userId }).sort({ createdAt: -1 });
  }

  async deleteById(attachmentId) {
    return await Attachment.findByIdAndDelete(attachmentId);
  }

  async deleteByRoom(roomId) {
    return await Attachment.deleteMany({ roomId });
  }

  async findByMessage(messageId) {
    return await Attachment.find({ messageId });
  }

  async countByUser(userId) {
    return await Attachment.countDocuments({ userId });
  }

  async findAll() {
    return await Attachment.find().sort({ createdAt: -1 });
  }

  async updateById(attachmentId, updateData) {
    return await Attachment.findByIdAndUpdate(attachmentId, updateData, { new: true });
  }
}

module.exports = AttachmentRepository;
