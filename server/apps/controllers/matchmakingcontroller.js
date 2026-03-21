const MatchmakingService = require('../Services/MatchmakingService');

class MatchmakingController {
  constructor() {
    this.matchmakingService = new MatchmakingService();
  }

  async enterQueue(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authorization required'
        });
      }

      const { mode, rank } = req.body;

      if (!mode || !rank) {
        return res.status(400).json({
          success: false,
          message: 'mode and rank are required'
        });
      }

      const result = await this.matchmakingService.enterQueue(req.user.id, mode, rank);

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

  async leaveQueue(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authorization required'
        });
      }

      const result = await this.matchmakingService.leaveQueue(req.user.id);

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

  async getStatus(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authorization required'
        });
      }

      const status = await this.matchmakingService.getQueueStatus(req.user.id);

      res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async getAllQueueStatus(req, res) {
    try {
      const status = await this.matchmakingService.getAllQueueStatus();

      res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = MatchmakingController;
