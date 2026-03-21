const MessageService = require('../Services/MessageService');

class MessageController {
  constructor() {
    this.messageService = new MessageService();
  }

  async getMessages(req, res) {
    try {
      const { roomId } = req.params;
      const { limit = 50, skip = 0 } = req.query;

      const result = await this.messageService.getMessages(
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

      const message = await this.messageService.sendMessage(
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
      const result = await this.messageService.deleteMessage(messageId, req.user.id);

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
