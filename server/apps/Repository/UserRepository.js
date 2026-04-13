const User = require('../Entity/User');

class UserRepository {
  async findById(userId) {
    return await User.findById(userId);
  }

  async findByEmail(email) {
    return await User.findOne({ email });
  }

  async findByUsername(username) {
    return await User.findOne({ username });
  }

  async findByUsernameWithPassword(username) {
    return await User.findOne({ username }).select('+password');
  }

  async findByGuestId(guestId) {
    return await User.findOne({ guestId });
  }

  async create(userData) {
    const user = new User(userData);
    return await user.save();
  }

  async updateById(userId, updateData) {
    return await User.findByIdAndUpdate(userId, updateData, { new: true });
  }

  async deleteById(userId) {
    return await User.findByIdAndDelete(userId);
  }

  async findAll() {
    return await User.find();
  }

  async countByRank(rank) {
    return await User.countDocuments({ rank });
  }
}

module.exports = UserRepository;
