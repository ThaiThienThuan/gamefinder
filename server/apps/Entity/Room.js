const mongoose = require('mongoose');

// Danh sách game được hỗ trợ. Thêm game mới cần thêm slug vào đây.
const SUPPORTED_GAMES = [
  'lol', 'valorant', 'cs2', 'dota2', 'apex',
  'overwatch2', 'rocket-league', 'fortnite', 'pubg',
  'r6siege', 'cod', 'chatroom'
];

const roomSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    game: {
      type: String,
      enum: SUPPORTED_GAMES,
      required: true,
      default: 'lol',
      index: true
    },
    name: {
      type: String,
      required: true
    },
    mode: {
      // Mỗi game có mode id riêng (ranked, competitive, premier, catan, ...) nên bỏ enum cứng
      type: String,
      required: true
    },
    slots: {
      type: Number,
      min: 1,
      max: 30, // chatroom group hỗ trợ tới 30 members
      required: true
    },
    isPersistent: {
      // Chatroom groups: không auto-close khi owner offline, giữ lịch sử chat lâu dài
      type: Boolean,
      default: false,
      index: true
    },
    pendingMembers: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    ],
    current: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['RECRUITING', 'FULL', 'PLAYING', 'FINISHED'],
      default: 'RECRUITING'
    },
    rankMin: { type: String, default: '' },
    rankMax: { type: String, default: '' },
    positions: [{ type: String }],
    stylePreference: { type: String, default: '' },
    voiceChat: { type: Boolean, default: true },
    note: { type: String, default: '' }
  },
  { timestamps: true }
);

roomSchema.index({ game: 1, mode: 1, status: 1 });

module.exports = mongoose.model('Room', roomSchema);
module.exports.SUPPORTED_GAMES = SUPPORTED_GAMES;
