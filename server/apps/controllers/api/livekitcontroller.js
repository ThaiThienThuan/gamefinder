const LiveKitService = require('../../Services/LiveKitService');

class LiveKitController {
  constructor() {
    this.service = new LiveKitService();
  }

  async createToken(req, res) {
    try {
      const { roomId, participantName } = req.body;
      const userId = req.user?.id || req.user?.guestId;

      console.log('[LiveKit Token] roomId:', roomId, '| userId:', userId, '| name:', participantName);

      const data = await this.service.issueToken({
        roomId,
        userId,
        participantName
      });

      res.status(200).json({ success: true, data });
    } catch (err) {
      const status = err.statusCode || 500;
      res.status(status).json({ success: false, message: err.message });
    }
  }
}

module.exports = LiveKitController;
