const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    mode: {
      type: String,
      enum: ['RANKED', 'NORMAL', 'ARAM', 'TFT'],
      required: true
    },
    slots: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    current: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['RECRUITING', 'FULL', 'PLAYING', 'FINISHED'],
      default: 'RECRUITING'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
