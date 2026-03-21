const jwt = require('jsonwebtoken');
const setting = require('../Config/Setting.json');

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const guestId = req.headers['x-guest-id'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, setting.jwt.secret);
      req.user = { id: decoded.userId, guestId: decoded.guestId };
    } else if (guestId) {
      req.user = { id: null, guestId };
    }

    next();
  } catch (error) {
    next();
  }
}

function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const guestId = req.headers['x-guest-id'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, setting.jwt.secret);
      req.user = { id: decoded.userId, guestId: decoded.guestId };
      return next();
    }

    if (guestId) {
      req.user = { id: null, guestId };
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Authorization required'
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
}

module.exports = {
  authMiddleware,
  requireAuth
};
