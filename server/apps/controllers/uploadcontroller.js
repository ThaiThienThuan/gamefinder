const UploadService = require('../Services/UploadService');

class UploadController {
  constructor() {
    this.uploadService = new UploadService();
  }

  async uploadFile(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authorization required'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided'
        });
      }

      const { roomId, messageId } = req.body;

      if (!roomId) {
        return res.status(400).json({
          success: false,
          message: 'roomId is required'
        });
      }

      const attachment = await this.uploadService.saveAttachment(
        req.file,
        roomId,
        req.user.id,
        messageId
      );

      res.status(201).json({
        success: true,
        data: attachment
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async deleteAttachment(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authorization required'
        });
      }

      const { attachmentId } = req.params;
      const result = await this.uploadService.deleteAttachment(attachmentId, req.user.id);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async getAttachmentsByRoom(req, res) {
    try {
      const { roomId } = req.params;
      const attachments = await this.uploadService.getAttachmentsByRoom(roomId);

      res.status(200).json({
        success: true,
        data: attachments
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = UploadController;
