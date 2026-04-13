const { AccessToken } = require('livekit-server-sdk');

function createToken(roomId, participantIdentity, participantName) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set');
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    name: participantName,
    ttl: '4h'
  });

  at.addGrant({
    room: roomId,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });

  return at.toJwt();
}

module.exports = { createToken };
