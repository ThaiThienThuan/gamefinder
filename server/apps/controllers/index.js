const express = require('express');
const { authMiddleware, requireAuth } = require('../../Util/VerifyToken');
const multer = require('multer');
const path = require('path');

const AuthController = require('./api/authcontroller');
const RoomController = require('./roomcontroller');
const MessageController = require('./messagecontroller');
const UploadController = require('./uploadcontroller');
const MatchmakingController = require('./matchmakingcontroller');

const router = express.Router();

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  }
});

// Initialize controllers
const authController = new AuthController();
const roomController = new RoomController();
const messageController = new MessageController();
const uploadController = new UploadController();
const matchmakingController = new MatchmakingController();

// Auth routes
router.post('/auth/register', (req, res) => authController.register(req, res));
router.post('/auth/login', (req, res) => authController.login(req, res));
router.post('/auth/guest', (req, res) => authController.guest(req, res));
router.get('/auth/me', authMiddleware, (req, res) => authController.me(req, res));
router.post('/auth/convert', authMiddleware, (req, res) => authController.convert(req, res));

// Room routes
router.get('/rooms', (req, res) => roomController.listRooms(req, res));
router.post('/rooms', requireAuth, (req, res) => roomController.createRoom(req, res));
router.get('/rooms/:id', (req, res) => roomController.getRoomDetail(req, res));
router.patch('/rooms/:id', requireAuth, (req, res) => roomController.updateRoom(req, res));
router.delete('/rooms/:id', requireAuth, (req, res) => roomController.deleteRoom(req, res));
router.post('/rooms/:id/join', requireAuth, (req, res) => roomController.joinRoom(req, res));
router.post('/rooms/:id/leave', requireAuth, (req, res) => roomController.leaveRoom(req, res));
router.post('/rooms/:id/kick', requireAuth, (req, res) => roomController.kickMember(req, res));
router.get('/rooms/:id/members', (req, res) => roomController.getMembers(req, res));

// Message routes
router.get('/messages/:roomId', (req, res) => messageController.getMessages(req, res));
router.post('/messages', requireAuth, (req, res) => messageController.sendMessage(req, res));
router.delete('/messages/:messageId', requireAuth, (req, res) => messageController.deleteMessage(req, res));

// Upload routes
router.post('/upload', requireAuth, upload.single('file'), (req, res) => uploadController.uploadFile(req, res));
router.delete('/attachments/:attachmentId', requireAuth, (req, res) => uploadController.deleteAttachment(req, res));
router.get('/attachments/room/:roomId', (req, res) => uploadController.getAttachmentsByRoom(req, res));

// Matchmaking routes
router.post('/matchmaking/start', requireAuth, (req, res) => matchmakingController.enterQueue(req, res));
router.post('/matchmaking/stop', requireAuth, (req, res) => matchmakingController.leaveQueue(req, res));
router.get('/matchmaking/status', requireAuth, (req, res) => matchmakingController.getStatus(req, res));
router.get('/matchmaking/status-all', (req, res) => matchmakingController.getAllQueueStatus(req, res));

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    db: 'connected'
  });
});

// [MEDIASOUP_PLACEHOLDER] - TURN credentials endpoint (Phase D)
// router.get('/turn-credentials', requireAuth, (req, res) => {...});

// [MEDIASOUP_PLACEHOLDER] - Mediasoup transport endpoint (Phase D)
// router.post('/mediasoup/transport', requireAuth, (req, res) => {...});

module.exports = router;
