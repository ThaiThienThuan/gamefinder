const mongoose = require('mongoose');

const roomMemberSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    position: {
      type: String,
      enum: ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

roomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('RoomMember', roomMemberSchema);
