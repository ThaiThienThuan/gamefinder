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
      type: String,
      select: false
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
    oauthProvider: { type: String },
    oauthId: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    banned: { type: Boolean, default: false },
    bio: { type: String, default: '' },
    gameProfiles: {
      type: [{
        _id: false,
        game: { type: String, required: true },
        ign: { type: String, default: '' },
        rank: { type: String, default: '' },
        position: { type: String, default: '' },
        playStyle: { type: String, default: '' },
      }],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

userSchema.index({ oauthProvider: 1, oauthId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema);
