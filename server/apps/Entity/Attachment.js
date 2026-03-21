const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['IMAGE', 'VIDEO'],
      required: true
    },
    size: {
      type: Number
    },
    mimetype: {
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

module.exports = mongoose.model('Attachment', attachmentSchema);
