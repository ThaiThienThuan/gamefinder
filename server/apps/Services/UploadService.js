const path = require('path');
const fs = require('fs');
const AttachmentRepository = require('../Repository/AttachmentRepository');
const setting = require('../../Config/Setting.json');

class UploadService {
  constructor() {
    this.attachmentRepository = new AttachmentRepository();
  }

  validateFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    const maxSize = setting.upload.maxFileSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`File size exceeds maximum of ${setting.upload.maxFileSizeMB}MB`);
    }

    const allowedMimes = setting.upload.mimeWhitelist;
    if (!allowedMimes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }

    return true;
  }

  determineType(mimetype) {
    if (mimetype.startsWith('image/')) {
      return 'IMAGE';
    }
    if (mimetype.startsWith('video/')) {
      return 'VIDEO';
    }
    throw new Error('Unknown file type');
  }

  async saveAttachment(file, roomId, userId, messageId = null) {
    this.validateFile(file);

    const type = this.determineType(file.mimetype);
    const filename = file.filename || `${Date.now()}_${file.originalname}`;
    const fileUrl = `/uploads/${filename}`;

    const attachment = await this.attachmentRepository.create({
      roomId,
      userId,
      messageId,
      url: fileUrl,
      type,
      size: file.size,
      mimetype: file.mimetype
    });

    return {
      id: attachment._id,
      url: fileUrl,
      type,
      size: attachment.size,
      mimetype: attachment.mimetype
    };
  }

  async deleteAttachment(attachmentId, userId) {
    const attachment = await this.attachmentRepository.findById(attachmentId);
    if (!attachment) {
      throw new Error('Attachment not found');
    }

    if (attachment.userId.toString() !== userId.toString()) {
      throw new Error('Only attachment owner can delete it');
    }

    const filepath = path.join(setting.upload.uploadDir, path.basename(attachment.url));
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    await this.attachmentRepository.deleteById(attachmentId);

    return { success: true };
  }

  async getAttachmentsByRoom(roomId) {
    return await this.attachmentRepository.findByRoom(roomId);
  }

  async getAttachmentsByUser(userId) {
    return await this.attachmentRepository.findByUser(userId);
  }
}

module.exports = UploadService;
