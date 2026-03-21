const RoomRepository = require('../Repository/RoomRepository');
const RoomMemberRepository = require('../Repository/RoomMemberRepository');
const UserRepository = require('../Repository/UserRepository');

class RoomService {
  constructor() {
    this.roomRepository = new RoomRepository();
    this.roomMemberRepository = new RoomMemberRepository();
    this.userRepository = new UserRepository();
  }

  async createRoom(ownerId, roomData) {
    const owner = await this.userRepository.findById(ownerId);
    if (!owner) {
      throw new Error('Owner not found');
    }

    const room = await this.roomRepository.create({
      ...roomData,
      ownerId,
      current: 1,
      status: 'RECRUITING'
    });

    await this.roomMemberRepository.create({
      roomId: room._id,
      userId: ownerId
    });

    return room;
  }

  async joinRoom(roomId, userId) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (room.status !== 'RECRUITING') {
      throw new Error('Room is not recruiting');
    }

    const existingMember = await this.roomMemberRepository.findByRoomAndUser(roomId, userId);
    if (existingMember) {
      throw new Error('User already in this room');
    }

    if (room.current >= room.slots) {
      throw new Error('Room is full');
    }

    await this.roomMemberRepository.create({
      roomId,
      userId
    });

    const updatedRoom = await this.roomRepository.incrementCurrent(roomId);

    if (updatedRoom.current >= updatedRoom.slots) {
      await this.roomRepository.setStatus(roomId, 'FULL');
    }

    // [REDIS_PLACEHOLDER] - Emit room:member-joined event via Socket.io Redis adapter in Phase B/C

    return { success: true, room: updatedRoom };
  }

  async leaveRoom(roomId, userId) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const member = await this.roomMemberRepository.findByRoomAndUser(roomId, userId);
    if (!member) {
      throw new Error('User is not in this room');
    }

    await this.roomMemberRepository.deleteByRoomAndUser(roomId, userId);
    const updatedRoom = await this.roomRepository.decrementCurrent(roomId);

    if (updatedRoom.current < updatedRoom.slots && updatedRoom.status === 'FULL') {
      await this.roomRepository.setStatus(roomId, 'RECRUITING');
    }

    // [REDIS_PLACEHOLDER] - Emit room:member-left event via Socket.io Redis adapter in Phase B/C

    return { success: true, room: updatedRoom };
  }

  async kickMember(roomId, ownerId, targetUserId) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.ownerId._id.toString() !== ownerId.toString()) {
      throw new Error('Only room owner can kick members');
    }

    await this.leaveRoom(roomId, targetUserId);

    return { success: true };
  }

  async listRooms(filters = {}) {
    const rooms = await this.roomRepository.findAll(filters);
    return rooms;
  }

  async getRoomDetail(roomId) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const members = await this.roomMemberRepository.findByRoom(roomId);
    return {
      ...room.toObject(),
      members
    };
  }

  async updateRoom(roomId, ownerId, updateData) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.ownerId._id.toString() !== ownerId.toString()) {
      throw new Error('Only room owner can update room');
    }

    const updatedRoom = await this.roomRepository.updateById(roomId, updateData);
    return updatedRoom;
  }

  async deleteRoom(roomId, ownerId) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.ownerId._id.toString() !== ownerId.toString()) {
      throw new Error('Only room owner can delete room');
    }

    await this.roomMemberRepository.deleteByRoom(roomId);
    await this.roomRepository.deleteById(roomId);

    // [REDIS_PLACEHOLDER] - Emit room:deleted event via Socket.io Redis adapter in Phase B/C

    return { success: true };
  }

  async getMembers(roomId) {
    const members = await this.roomMemberRepository.findByRoom(roomId);
    return members;
  }
}

module.exports = RoomService;
