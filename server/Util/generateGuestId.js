const crypto = require('crypto');

function generateGuestId() {
  return crypto.randomUUID();
}

module.exports = generateGuestId;
