const MessageService = require('../Services/MessageService');
const { getIO } = require('../../socket/index');

class MessageController {
  constructor() {
  }

  async getMessages(req, res) {
    try {
      const { roomId } = req.params;
      const { limit = 50, skip = 0 } = req.query;

      const service = new MessageService();
      const result = await service.getMessages(
        roomId,
        parseInt(limit),
        parseInt(skip)
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  async sendMessage(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authorization required'
        });
      }

      const { roomId, text, attachmentIds = [] } = req.body;

      if (!roomId || !text) {
        return res.status(400).json({
          success: false,
          message: 'roomId and text are required'
        });
      }

      const io = (() => { try { return getIO(); } catch { return null; } })();
      const service = new MessageService(io);
      const message = await service.sendMessage(
        roomId,
        req.user.id,
        text,
        attachmentIds
      );

      res.status(201).json({
        success: true,
        data: message
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async deleteMessage(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authorization required'
        });
      }

      const { messageId } = req.params;
      const service = new MessageService();
      const result = await service.deleteMessage(messageId, req.user.id);

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
}

module.exports = MessageController;
