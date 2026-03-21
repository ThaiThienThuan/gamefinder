const RoomMember = require('../Entity/RoomMember');

class RoomMemberRepository {
  async findByRoomAndUser(roomId, userId) {
    return await RoomMember.findOne({ roomId, userId });
  }

  async create(memberData) {
    const member = new RoomMember(memberData);
    return await member.save();
  }

  async deleteByRoomAndUser(roomId, userId) {
    return await RoomMember.deleteOne({ roomId, userId });
  }

  async countByRoom(roomId) {
    return await RoomMember.countDocuments({ roomId });
  }

  async findByRoom(roomId) {
    return await RoomMember.find({ roomId }).populate('userId').sort({ joinedAt: 1 });
  }

  async findByUser(userId) {
    return await RoomMember.find({ userId }).populate('roomId').sort({ joinedAt: -1 });
  }

  async deleteByRoom(roomId) {
    return await RoomMember.deleteMany({ roomId });
  }

  async updatePosition(roomId, userId, position) {
    return await RoomMember.findOneAndUpdate(
      { roomId, userId },
      { position },
      { new: true }
    );
  }

  async findAll() {
    return await RoomMember.find().populate('roomId').populate('userId');
  }
}

module.exports = RoomMemberRepository;
