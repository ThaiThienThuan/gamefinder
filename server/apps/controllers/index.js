const express = require('express');
const { authMiddleware, requireAuth, requireRegistered, requireAdmin } = require('../../Util/VerifyToken');

const AuthController = require('./api/authcontroller');
const RoomController = require('./roomcontroller');
const MessageController = require('./messagecontroller');
const UploadController = require('./uploadcontroller');
const { upload } = require('./uploadcontroller');
const MatchmakingController = require('./matchmakingcontroller');
const LiveKitController = require('./api/livekitcontroller');
const UserController = require('./usercontroller');
const AdminController = require('./admincontroller');
const RiotController = require('./riotcontroller');

const router = express.Router();

// Initialize controllers
const authController = new AuthController();
const roomController = new RoomController();
const messageController = new MessageController();
const uploadController = new UploadController();
const matchmakingController = new MatchmakingController();
const livekitController = new LiveKitController();
const userController = new UserController();
const adminController = new AdminController();
const riotController = new RiotController();

// Auth routes
router.post('/auth/register', (req, res) => authController.register(req, res));
router.post('/auth/login', (req, res) => authController.login(req, res));
router.post('/auth/guest', (req, res) => authController.guest(req, res));
router.get('/auth/me', authMiddleware, (req, res) => authController.me(req, res));
router.post('/auth/convert', authMiddleware, (req, res) => authController.convert(req, res));
router.get('/auth/google', (req, res) => authController.googleStart(req, res));
router.get('/auth/google/callback', (req, res) => authController.googleCallback(req, res));

// Room routes
router.get('/rooms/my-active', requireRegistered, (req, res) => roomController.getMyActiveRoom(req, res));
router.get('/rooms', (req, res) => roomController.listRooms(req, res));
router.post('/rooms', requireRegistered, (req, res) => roomController.createRoom(req, res));
router.get('/rooms/:id', (req, res) => roomController.getRoomDetail(req, res));
router.patch('/rooms/:id', requireRegistered, (req, res) => roomController.updateRoom(req, res));
router.delete('/rooms/:id', requireRegistered, (req, res) => roomController.deleteRoom(req, res));
router.post('/rooms/:id/join', requireRegistered, (req, res) => roomController.joinRoom(req, res));
router.post('/rooms/:id/leave', requireRegistered, (req, res) => roomController.leaveRoom(req, res));
router.post('/rooms/:id/kick', requireRegistered, (req, res) => roomController.kickMember(req, res));
router.post('/rooms/:id/approve-join', requireRegistered, (req, res) => roomController.approveJoin(req, res));
router.post('/rooms/:id/reject-join', requireRegistered, (req, res) => roomController.rejectJoin(req, res));
router.get('/rooms/:id/members', (req, res) => roomController.getMembers(req, res));

// Message routes
router.get('/messages/:roomId', (req, res) => messageController.getMessages(req, res));
router.post('/messages', requireAuth, (req, res) => messageController.sendMessage(req, res));
router.delete('/messages/:messageId', requireAuth, (req, res) => messageController.deleteMessage(req, res));

// Upload routes
router.post('/upload', requireAuth, upload.single('file'), (req, res) => uploadController.uploadFile(req, res));
router.post('/upload/avatar', requireAuth, upload.single('file'), (req, res) => uploadController.uploadAvatar(req, res));
router.delete('/attachments/:attachmentId', requireAuth, (req, res) => uploadController.deleteAttachment(req, res));
router.get('/attachments/room/:roomId', (req, res) => uploadController.getAttachmentsByRoom(req, res));

// Matchmaking routes
router.post('/matchmaking/start', requireAuth, (req, res) => matchmakingController.enterQueue(req, res));
router.post('/matchmaking/stop', requireAuth, (req, res) => matchmakingController.leaveQueue(req, res));
router.get('/matchmaking/status', requireAuth, (req, res) => matchmakingController.getStatus(req, res));
router.get('/matchmaking/status-all', (req, res) => matchmakingController.getAllQueueStatus(req, res));

// User profile
router.get('/users/me', requireAuth, (req, res) => userController.getMe(req, res));
router.patch('/users/me', requireAuth, (req, res) => userController.updateMe(req, res));
router.get('/users/:id', (req, res) => userController.getProfile(req, res));

// Riot API (LoL only)
router.get('/riot/summoner', requireAuth, (req, res) => riotController.lookupSummoner(req, res));
router.get('/riot/profile', requireAuth, (req, res) => riotController.getProfile(req, res));

// Admin routes
router.get('/admin/users', requireAuth, requireAdmin, (req, res) => adminController.listUsers(req, res));
router.patch('/admin/users/:id/ban', requireAuth, requireAdmin, (req, res) => adminController.setBanned(req, res));
router.patch('/admin/users/:id/role', requireAuth, requireAdmin, (req, res) => adminController.setRole(req, res));
router.get('/admin/rooms', requireAuth, requireAdmin, (req, res) => adminController.listRooms(req, res));
router.delete('/admin/rooms/:id', requireAuth, requireAdmin, (req, res) => adminController.forceDeleteRoom(req, res));

// LiveKit token endpoint
router.post('/livekit/token', requireAuth, (req, res) => livekitController.createToken(req, res));

module.exports = router;
