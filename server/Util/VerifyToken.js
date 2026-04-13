const jwt = require('jsonwebtoken');

const JWT_SECRET = () => process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET());
      req.user = { id: decoded.userId };
    }

    next();
  } catch (error) {
    next();
  }
}

// requireAuth: requires a valid JWT. No guests allowed.
function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET());
      if (!decoded.userId) {
        return res.status(401).json({
          success: false,
          message: 'Authorization required'
        });
      }
      req.user = { id: decoded.userId };
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

// requireRegistered: requires a valid JWT — guests are NOT allowed
// Use for routes that need a real userId (create room, delete room, kick, etc.)
function requireRegistered(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET());

      if (!decoded.userId) {
        return res.status(403).json({
          success: false,
          message: 'Registered account required'
        });
      }

      req.user = { id: decoded.userId, guestId: decoded.guestId };
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Registered account required. Please register or login.'
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
}

// requireAdmin: must be used AFTER requireAuth. Fetches user + checks role.
function requireAdmin(req, res, next) {
  (async () => {
    try {
      if (!req.user?.id) return res.status(401).json({ success: false, message: 'Authorization required' });
      const User = require('../apps/Entity/User');
      const u = await User.findById(req.user.id).select('role banned');
      if (!u) return res.status(401).json({ success: false, message: 'User not found' });
      // Note: banned admins still have admin access so they can unban themselves.
      if (u.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
      next();
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  })();
}

module.exports = {
  authMiddleware,
  requireAuth,
  requireRegistered,
  requireAdmin
};
