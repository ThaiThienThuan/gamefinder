const crypto = require('crypto');
const setting = require('../Config/Setting.json');

function generateTurnCredential(userId) {
  const secret = setting.turn?.secret || process.env.TURN_SECRET || 'dev-turn-secret';
  const realm = setting.turn?.realm || process.env.TURN_REALM || 'gamematch.local';

  const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  const username = `${expiry}:${userId}`;
  const password = crypto
    .createHmac('sha1', secret)
    .update(username)
    .digest('base64');

  return [{
    urls: [
      `turn:coturn:3478`,
      `turn:coturn:5349?transport=tcp`
    ],
    username,
    credential: password,
    credentialType: 'password'
  }];
}

module.exports = { generateTurnCredential };
