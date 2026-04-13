const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
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
    text: {
      type: String,
      default: '',
      maxlength: 500
    },
    attachments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Attachment'
      }
    ],
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

module.exports = mongoose.model('Message', messageSchema);
