const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true
    },
    email: {
      type: String,
      unique: true,
      sparse: true
    },
    password: {
      type: String
    },
    avatar: {
      type: String
    },
    rank: {
      type: String,
      enum: ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'],
      default: 'SILVER'
    },
    guestId: {
      type: String,
      unique: true,
      sparse: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
