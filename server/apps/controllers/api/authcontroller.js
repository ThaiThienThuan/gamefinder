const UserService = require('../../Services/UserService');

class AuthController {
  constructor() {
    this.userService = new UserService();
  }

  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username, email, and password are required'
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
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      const result = await this.userService.login(email, password);
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
}

module.exports = AuthController;
