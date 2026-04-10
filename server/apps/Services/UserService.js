const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserRepository = require('../Repository/UserRepository');
const generateGuestId = require('../../Util/generateGuestId');
const setting = require('../../Config/Setting.json');

class UserService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  async register(username, email, password) {
    const existingUsername = await this.userRepository.findByUsername(username);
    if (existingUsername) {
      throw new Error('Username already exists');
    }

    const existingEmail = await this.userRepository.findByEmail(email);
    if (existingEmail) {
      throw new Error('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.userRepository.create({
      username,
      email,
      password: hashedPassword
    });

    const token = jwt.sign(
      { userId: user._id },
      setting.jwt.secret,
      { expiresIn: setting.jwt.expiry }
    );

    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        rank: user.rank
      },
      token
    };
  }

  async login(email, password) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new Error('Invalid password');
    }

    const token = jwt.sign(
      { userId: user._id },
      setting.jwt.secret,
      { expiresIn: setting.jwt.expiry }
    );

    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        rank: user.rank
      },
      token
    };
  }

  async createGuest() {
    let user;
    let guestId;
    let retries = 3;

    while (retries > 0) {
      try {
        guestId = generateGuestId();
        user = await this.userRepository.create({
          username: `Guest_${guestId.slice(0, 8)}`,
          guestId
        });
        break; // Success
      } catch (err) {
        if (err.code === 11000 && retries > 1) {
          // Duplicate key error — retry with new guestId
          retries--;
          continue;
        }
        throw err;
      }
    }

    return {
      user: {
        id: user._id,
        username: user.username,
        guestId: user.guestId,
        rank: user.rank
      },
      guestId
    };
  }

  async getUserById(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      id: user._id,
      username: user.username,
      email: user.email,
      rank: user.rank,
      avatar: user.avatar
    };
  }

  async getUserByGuestId(guestId) {
    const user = await this.userRepository.findByGuestId(guestId);
    if (!user) {
      throw new Error('Guest user not found');
    }
    return {
      id: user._id,
      username: user.username,
      guestId: user.guestId,
      rank: user.rank
    };
  }

  async convertGuestToUser(guestId, email, password, username) {
    const guest = await this.userRepository.findByGuestId(guestId);
    if (!guest) {
      throw new Error('Guest session not found');
    }

    const existingEmail = await this.userRepository.findByEmail(email);
    if (existingEmail) {
      throw new Error('Email already exists');
    }

    const existingUsername = await this.userRepository.findByUsername(username);
    if (existingUsername) {
      throw new Error('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const updatedUser = await this.userRepository.updateById(guest._id, {
      email,
      password: hashedPassword,
      username
    });

    const token = jwt.sign(
      { userId: updatedUser._id, guestId },
      setting.jwt.secret,
      { expiresIn: setting.jwt.expiry }
    );

    return {
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        rank: updatedUser.rank
      },
      token
    };
  }
}

module.exports = UserService;
