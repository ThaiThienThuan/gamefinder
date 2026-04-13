const User = require('../Entity/User');
const RoomRepository = require('../Repository/RoomRepository');
const RoomService = require('../Services/RoomService');
const { getIO } = require('../../socket');

class AdminController {
  constructor() {
    this.roomRepository = new RoomRepository();
  }

  async listUsers(req, res) {
    try {
      const q = (req.query.q || '').toString().trim();
      const limit = Math.min(200, Number(req.query.limit) || 50);
      const skip = Number(req.query.skip) || 0;
      const filter = q ? { $or: [{ username: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }] } : {};
      const [items, total] = await Promise.all([
        User.find(filter).select('username email avatar rank role banned createdAt oauthProvider')
          .sort({ createdAt: -1 }).skip(skip).limit(limit),
        User.countDocuments(filter),
      ]);
      res.json({ success: true, data: { items, total, limit, skip } });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  }

  async setBanned(req, res) {
    try {
      const { id } = req.params;
      const { banned } = req.body;
      const u = await User.findByIdAndUpdate(id, { banned: !!banned }, { new: true })
        .select('username banned role');
      if (!u) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, data: u });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  }

  async setRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }
      const u = await User.findByIdAndUpdate(id, { role }, { new: true }).select('username role');
      if (!u) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, data: u });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  }

  async listRooms(req, res) {
    try {
      const rooms = await this.roomRepository.findAll({});
      res.json({ success: true, data: rooms });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  }

  async forceDeleteRoom(req, res) {
    try {
      const { id } = req.params;
      const room = await this.roomRepository.findById(id);
      if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
      const io = (() => { try { return getIO(); } catch { return null; } })();
      const RoomMemberRepository = require('../Repository/RoomMemberRepository');
      await new RoomMemberRepository().deleteByRoom(id);
      await this.roomRepository.deleteById(id);
      if (io) {
        io.to(`room:${id}`).emit('room:deleted', { roomId: id });
        io.to(`lobby:${room.game || 'lol'}:${room.mode}`).emit('room:deleted', { roomId: id });
      }
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  }
}

module.exports = AdminController;
