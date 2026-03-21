const RoomService = require('../Services/RoomService');

class RoomController {
  constructor() {
    this.roomService = new RoomService();
  }

  async listRooms(req, res) {
    try {
      const { mode, status } = req.query;
      const filters = {};
      if (mode) filters.mode = mode;
      if (status) filters.status = status;

      const rooms = await this.roomService.listRooms(filters);
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
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authorization required'
        });
      }

      const { name, mode, slots } = req.body;

      if (!name || !mode || !slots) {
        return res.status(400).json({
          success: false,
          message: 'name, mode, and slots are required'
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
      const room = await this.roomService.getRoomDetail(id);

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
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authorization required'
        });
      }

      const { id } = req.params;
      const room = await this.roomService.updateRoom(id, req.user.id, req.body);

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
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authorization required'
        });
      }

      const { id } = req.params;
      await this.roomService.deleteRoom(id, req.user.id);

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
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authorization required'
        });
      }

      const { id } = req.params;
      const result = await this.roomService.joinRoom(id, req.user.id);

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
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authorization required'
        });
      }

      const { id } = req.params;
      const result = await this.roomService.leaveRoom(id, req.user.id);

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
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authorization required'
        });
      }

      const { id } = req.params;
      const { targetUserId } = req.body;

      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          message: 'targetUserId is required'
        });
      }

      const result = await this.roomService.kickMember(id, req.user.id, targetUserId);

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
      const members = await this.roomService.getMembers(id);

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
