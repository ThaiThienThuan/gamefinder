const UserService = require('../../Services/UserService');
const jwt = require('jsonwebtoken');
const UserRepository = require('../../Repository/UserRepository');
const User = require('../../Entity/User');

const JWT_SECRET = () => process.env.JWT_SECRET;
const JWT_EXPIRY = () => process.env.JWT_EXPIRY || '7d';

class AuthController {
  constructor() {
    this.userService = new UserService();
  }

  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Tên tài khoản và mật khẩu là bắt buộc'
        });
      }
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu tối thiểu 6 ký tự'
        });
      }

      const result = await this.userService.register(username, email, password);
      res.status(201).json({
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

  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Tên tài khoản và mật khẩu là bắt buộc'
        });
      }

      const result = await this.userService.login(username, password);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  async guest(req, res) {
    try {
      const result = await this.userService.createGuest();
      res.status(201).json({
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

  async me(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }

      let user;
      if (req.user.id) {
        user = await this.userService.getUserById(req.user.id);
      } else if (req.user.guestId) {
        user = await this.userService.getUserByGuestId(req.user.guestId);
      }

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async convert(req, res) {
    try {
      const { guestId, email, password, username } = req.body;

      if (!guestId || !email || !password || !username) {
        return res.status(400).json({
          success: false,
          message: 'guestId, email, password, and username are required'
        });
      }

      const result = await this.userService.convertGuestToUser(guestId, email, password, username);
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

  // ── Google OAuth (manual flow, no passport/session) ──────────────────
  googleStart(req, res) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const callback = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback';
    if (!clientId) {
      return res.status(500).send('GOOGLE_CLIENT_ID not configured');
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callback,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  async googleCallback(req, res) {
    // Accept any origin in ALLOWED_ORIGIN (comma-separated). Popup posts to all of them;
    // only the one whose origin matches opener will actually deliver.
    const allowed = (process.env.ALLOWED_ORIGIN || 'http://localhost:3000').split(',').map(s => s.trim()).filter(Boolean);
    const respond = (data) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!DOCTYPE html><html><body><script>
        var origins = ${JSON.stringify(allowed)};
        for (var i = 0; i < origins.length; i++) {
          try { window.opener && window.opener.postMessage(${JSON.stringify(data)}, origins[i]); } catch(e) {}
        }
        window.close();
      </script></body></html>`);
    };
    try {
      const { code } = req.query;
      if (!code) return respond({ type: 'oauth-error', message: 'Missing code' });

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const callback = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback';
      if (!clientId || !clientSecret) return respond({ type: 'oauth-error', message: 'Server missing Google credentials' });

      // Exchange code → tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code, client_id: clientId, client_secret: clientSecret,
          redirect_uri: callback, grant_type: 'authorization_code',
        }).toString(),
      });
      const tokenJson = await tokenRes.json();
      if (!tokenJson.access_token) return respond({ type: 'oauth-error', message: tokenJson.error_description || 'Token exchange failed' });

      // Get userinfo
      const uiRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      });
      const profile = await uiRes.json();
      if (!profile.sub) return respond({ type: 'oauth-error', message: 'Failed to fetch Google profile' });

      // Upsert user
      const userRepo = new UserRepository();
      let user = await User.findOne({ oauthProvider: 'google', oauthId: profile.sub });
      if (!user && profile.email) {
        user = await userRepo.findByEmail(profile.email);
        if (user) {
          user.oauthProvider = 'google';
          user.oauthId = profile.sub;
          if (!user.avatar && profile.picture) user.avatar = profile.picture;
          await user.save();
        }
      }
      if (!user) {
        const base = (profile.email ? profile.email.split('@')[0] : 'gg_user').replace(/[^a-z0-9_]/gi, '');
        let username = base || 'gg_user';
        let n = 0;
        while (await userRepo.findByUsername(username)) { n++; username = `${base}${n}`; }
        user = await User.create({
          username,
          email: profile.email,
          avatar: profile.picture || '',
          oauthProvider: 'google',
          oauthId: profile.sub,
        });
      }

      if (user.banned) return respond({ type: 'oauth-error', message: 'Tài khoản đã bị khóa' });

      const token = jwt.sign({ userId: user._id }, JWT_SECRET(), { expiresIn: JWT_EXPIRY() });
      respond({
        type: 'oauth-success',
        token,
        user: {
          id: user._id, username: user.username, email: user.email,
          avatar: user.avatar, rank: user.rank, role: user.role,
        },
      });
    } catch (err) {
      console.error('[google-oauth] error:', err);
      respond({ type: 'oauth-error', message: err.message });
    }
  }
}

module.exports = AuthController;
