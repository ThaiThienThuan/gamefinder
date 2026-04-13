const { createToken } = require('../../livekit/tokenService');

class LiveKitService {
  async issueToken({ roomId, userId, participantName }) {
    if (!roomId) {
      const err = new Error('roomId is required');
      err.statusCode = 400;
      throw err;
    }
    if (!userId) {
      const err = new Error('userId is required');
      err.statusCode = 401;
      throw err;
    }

    const identity = String(userId);
    const name = participantName || `User_${identity.slice(-6)}`;
    const token = await createToken(roomId, identity, name);

    return {
      token,
      url: process.env.LIVEKIT_URL
    };
  }
}

module.exports = LiveKitService;
