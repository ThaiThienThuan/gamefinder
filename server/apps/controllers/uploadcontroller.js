const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const UploadService = require('../Services/UploadService');

// Cloudinary config — reads CLOUDINARY_URL or individual vars from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm'
];

// Memory storage — we stream buffer to Cloudinary instead of writing disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`File type ${file.mimetype} not allowed`));
  },
});

function uploadBufferToCloudinary(buffer, { folder = 'gamematching', resource_type = 'auto' } = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

class UploadController {
  constructor() {
    this.uploadService = new UploadService();
  }

  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
      }
      const { roomId, messageId } = req.body;
      if (!roomId) {
        return res.status(400).json({ success: false, message: 'roomId is required' });
      }

      const resource = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: `gamematching/rooms/${roomId}`,
        resource_type: resource,
      });

      const attachment = await this.uploadService.saveCloudAttachment({
        roomId,
        userId: req.user.id,
        messageId,
        url: result.secure_url,
        publicId: result.public_id,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });

      res.status(201).json({ success: true, data: attachment });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async uploadAvatar(req, res) {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ success: false, message: 'Avatar must be an image' });
      }
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'gamematching/avatars',
        resource_type: 'image',
      });
      res.status(201).json({ success: true, data: { url: result.secure_url } });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async deleteAttachment(req, res) {
    try {
      const { attachmentId } = req.params;
      const result = await this.uploadService.deleteAttachment(attachmentId, req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getAttachmentsByRoom(req, res) {
    try {
      const { roomId } = req.params;
      const attachments = await this.uploadService.getAttachmentsByRoom(roomId);
      res.status(200).json({ success: true, data: attachments });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = UploadController;
module.exports.upload = upload;
