const Room = require('../Entity/Room');

class RoomRepository {
  async findById(roomId) {
    return await Room.findById(roomId).populate('ownerId').populate('pendingMembers', 'username avatar');
  }

  async findAll(filters = {}) {
    const query = {};
    if (filters.game) query.game = filters.game;
    if (filters.mode) query.mode = filters.mode;
    if (filters.status) query.status = filters.status;
    return await Room.find(query).populate('ownerId').populate('pendingMembers', 'username avatar').sort({ createdAt: -1 });
  }

  async create(roomData) {
    const room = new Room(roomData);
    return await room.save();
  }

  async updateById(roomId, updateData) {
    return await Room.findByIdAndUpdate(roomId, updateData, { new: true }).populate('ownerId').populate('pendingMembers', 'username avatar');
  }

  async deleteById(roomId) {
    return await Room.findByIdAndDelete(roomId);
  }

  async incrementCurrent(roomId) {
    return await Room.findByIdAndUpdate(
      roomId,
      { $inc: { current: 1 } },
      { new: true }
    ).populate('ownerId').populate('pendingMembers', 'username avatar');
  }

  async decrementCurrent(roomId) {
    return await Room.findByIdAndUpdate(
      roomId,
      { $inc: { current: -1 } },
      { new: true }
    ).populate('ownerId').populate('pendingMembers', 'username avatar');
  }

  async setStatus(roomId, status) {
    return await Room.findByIdAndUpdate(
      roomId,
      { status, updatedAt: new Date() },
      { new: true }
    ).populate('ownerId').populate('pendingMembers', 'username avatar');
  }

  async findByOwner(ownerId) {
    return await Room.find({ ownerId }).sort({ createdAt: -1 });
  }

  // Một user chỉ được làm chủ 1 phòng đang mở (chưa FINISHED)
  async findActiveByOwner(ownerId) {
    return await Room.findOne({
      ownerId,
      status: { $ne: 'FINISHED' }
    });
  }

  async countByStatus(status) {
    return await Room.countDocuments({ status });
  }

  async findWithMemberCount(filters = {}) {
    return await Room.aggregate([
      { $match: filters },
      {
        $lookup: {
          from: 'roommembers',
          localField: '_id',
          foreignField: 'roomId',
          as: 'members'
        }
      },
      {
        $project: {
          _id: 1,
          ownerId: 1,
          name: 1,
          mode: 1,
          slots: 1,
          current: 1,
          status: 1,
          createdAt: 1,
          memberCount: { $size: '$members' }
        }
      }
    ]);
  }
}

module.exports = RoomRepository;
