const RoomService = require('../Services/RoomService');
const { getIO } = require('../../socket/index');

class RoomController {
  constructor() {
  }

  async listRooms(req, res) {
    try {
      const { mode, status } = req.query;
      const filters = {};
      if (mode) filters.mode = mode;
      if (status) filters.status = status;

      const service = new RoomService();
      const rooms = await service.listRooms(filters);
      res.status(200).json({
        success: true,
        data: rooms
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async createRoom(req, res) {
    try {
      const { name, mode, slots } = req.body;
      if (!name || !mode || !slots) {
        return res.status(400).json({
          success: false,
          message: 'name, mode, and slots are required'
        });
      }

      const io = (() => { try { return getIO(); } catch { return null; } })();
      const service = new RoomService(io);
      const room = await service.createRoom(req.user.id, {
        name,
        mode,
        slots
      });
      }

      const room = await this.roomService.createRoom(req.user.id, {
        name,
        mode,
        slots
      });

      res.status(201).json({
        success: true,
        data: room
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async getRoomDetail(req, res) {
    try {
      const { id } = req.params;
      const service = new RoomService();
      const room = await service.getRoomDetail(id);

      res.status(200).json({
        success: true,
        data: room
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateRoom(req, res) {
    try {
      const { id } = req.params;
      const io = (() => { try { return getIO(); } catch { return null; } })();
      const service = new RoomService(io);
      const room = await service.updateRoom(id, req.user.id, req.body);

      res.status(200).json({
        success: true,
        data: room
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async deleteRoom(req, res) {
    try {
      const { id } = req.params;
      const io = (() => { try { return getIO(); } catch { return null; } })();
      const service = new RoomService(io);
      await service.deleteRoom(id, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Room deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async joinRoom(req, res) {
    try {
      const { id } = req.params;
      const io = (() => { try { return getIO(); } catch { return null; } })();
      const service = new RoomService(io);
      const result = await service.joinRoom(id, req.user.id);

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

  async leaveRoom(req, res) {
    try {
      const { id } = req.params;
      const io = (() => { try { return getIO(); } catch { return null; } })();
      const service = new RoomService(io);
      const result = await service.leaveRoom(id, req.user.id);

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

  async kickMember(req, res) {
    try {
      const { id } = req.params;
      const { targetUserId } = req.body;

      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          message: 'targetUserId is required'
        });
      }

      const io = (() => { try { return getIO(); } catch { return null; } })();
      const service = new RoomService(io);
      const result = await service.kickMember(id, req.user.id, targetUserId);

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

  async getMembers(req, res) {
    try {
      const { id } = req.params;
      const service = new RoomService();
      const members = await service.getMembers(id);

      res.status(200).json({
        success: true,
        data: members
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = RoomController;
