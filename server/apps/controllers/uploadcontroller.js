const multer = require('multer');
const path = require('path');
const UploadService = require('../Services/UploadService');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm'
];

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  }
});

class UploadController {
  constructor() {
    this.uploadService = new UploadService();
  }

  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided'
        });
      }

      const { roomId, messageId } = req.body;

      if (!roomId) {
        return res.status(400).json({
          success: false,
          message: 'roomId is required'
        });
      }

      const attachment = await this.uploadService.saveAttachment(
        req.file,
        roomId,
        req.user.id,
        messageId
      );

      res.status(201).json({
        success: true,
        data: attachment
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async deleteAttachment(req, res) {
    try {
      const { attachmentId } = req.params;
      const result = await this.uploadService.deleteAttachment(attachmentId, req.user.id);

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

  async getAttachmentsByRoom(req, res) {
    try {
      const { roomId } = req.params;
      const attachments = await this.uploadService.getAttachmentsByRoom(roomId);

      res.status(200).json({
        success: true,
        data: attachments
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = UploadController;
module.exports.upload = upload;
