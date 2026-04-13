const RoomRepository = require('../Repository/RoomRepository');
const RoomMemberRepository = require('../Repository/RoomMemberRepository');
const UserRepository = require('../Repository/UserRepository');

class RoomService {
  constructor(io = null) {
    this.io = io;
    this.roomRepository = new RoomRepository();
    this.roomMemberRepository = new RoomMemberRepository();
    this.userRepository = new UserRepository();
  }

  // Safe emit helper — works whether io is present or not
  emit(channel, event, payload) {
    if (this.io) {
      this.io.to(channel).emit(event, payload);
    }
  }

  async createRoom(ownerId, roomData) {
    const owner = await this.userRepository.findById(ownerId);
    if (!owner) {
      throw new Error('Owner not found');
    }

    // Chatroom (game='chatroom') là persistent group chat, không auto-close, ≤30 members.
    // Chatroom được phép tạo nhiều — KHÔNG áp dụng giới hạn 1-phòng và không block nếu đang ở phòng khác.
    const isChat = (roomData.game || 'lol') === 'chatroom';

    if (!isChat) {
      // Giới hạn (chỉ áp dụng phòng thường): mỗi tài khoản chỉ có thể làm chủ 1 phòng thường đang mở.
      // Bỏ qua các phòng chatroom (persistent).
      const existing = await this.roomRepository.findActiveByOwner(ownerId);
      if (existing && !existing.isPersistent) {
        const err = new Error('Bạn đã có 1 phòng đang mở. Hãy đóng phòng cũ trước khi tạo phòng mới.');
        err.statusCode = 409;
        err.existingRoomId = existing._id;
        throw err;
      }

      // Giới hạn: không thể tạo phòng thường nếu đang tham gia phòng THƯỜNG của người khác
      const memberships = await this.roomMemberRepository.findByUser(ownerId);
      for (const m of memberships) {
        const rm = m.roomId;
        if (rm && rm.status && rm.status !== 'FINISHED' && !rm.isPersistent) {
          const roomOwner = await this.userRepository.findById(rm.ownerId);
          const ownerName = roomOwner?.username || 'người khác';
          const err = new Error(`Bạn đang tham gia phòng của "${ownerName}". Cần rời phòng trước khi tạo phòng mới.`);
          err.statusCode = 409;
          err.existingRoomId = rm._id;
          throw err;
        }
      }
    }
    const room = await this.roomRepository.create({
      ...roomData,
      game: roomData.game || 'lol',
      slots: Math.min(isChat ? 30 : 16, roomData.slots || (isChat ? 30 : 4)),
      isPersistent: isChat,
      ownerId,
      current: 1,
      status: 'RECRUITING'
    });

    await this.roomMemberRepository.create({
      roomId: room._id,
      userId: ownerId
    });

    // Emit to game-scoped mode lobby channel
    const channel = `lobby:${room.game}:${room.mode}`;
    this.emit(channel, 'room:created', room);

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

    // Persistent chatroom luôn cho join lại (kể cả FULL status check bỏ qua nếu is_persistent + chưa đầy)
    if (!room.isPersistent && room.status !== 'RECRUITING') {
      throw new Error('Room is not recruiting');
    }

    const existingMember = await this.roomMemberRepository.findByRoomAndUser(roomId, userId);
    if (existingMember) {
      // Already a member — let them back in without error
      return { success: true, room };
    }

    // Persistent chatroom: require owner approval — push to pendingMembers then return
    if (room.isPersistent) {
      const ownerIdStr = room.ownerId?._id ? room.ownerId._id.toString() : room.ownerId.toString();
      if (userId.toString() !== ownerIdStr) {
        const pending = (room.pendingMembers || []).map(String);
        if (!pending.includes(userId.toString())) {
          await this.roomRepository.updateById(roomId, { $addToSet: { pendingMembers: userId } });
        }
        const payload = {
          roomId,
          roomName: room.name,
          user: { id: user._id, username: user.username, avatar: user.avatar },
        };
        this.emit(`room:${roomId}`, 'room:join-requested', payload);
        // Also notify owner on their personal channel so they receive it even if not currently viewing the room
        this.emit(`user:${ownerIdStr}`, 'room:join-requested', payload);
        return { success: true, pending: true, room };
      }
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

    const member = await this.roomMemberRepository.findByRoomAndUser(roomId, userId);
    // Emit member info with username for real-time UI update
    this.emit(`room:${roomId}`, 'room:member-joined', {
      roomId,
      member: {
        id: user._id,
        userId: user._id,
        name: user.username,
        joinedAt: member?.joinedAt
      }
    });
    this.emit(`lobby:${updatedRoom.game || 'lol'}:${updatedRoom.mode}`, 'room:updated', updatedRoom);

    return { success: true, room: updatedRoom };
  }

  async leaveRoom(roomId, userId) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const member = await this.roomMemberRepository.findByRoomAndUser(roomId, userId);
    if (!member) {
      // Already left — no error, just return current room state
      return { success: true, room };
    }

    await this.roomMemberRepository.deleteByRoomAndUser(roomId, userId);
    const updatedRoom = await this.roomRepository.decrementCurrent(roomId);

    if (updatedRoom.current < updatedRoom.slots && updatedRoom.status === 'FULL') {
      await this.roomRepository.setStatus(roomId, 'RECRUITING');
    }

    this.emit(`room:${roomId}`, 'room:member-left', { roomId, userId: userId.toString() });
    this.emit(`lobby:${updatedRoom.game || 'lol'}:${updatedRoom.mode}`, 'room:updated', updatedRoom);

    return { success: true, room: updatedRoom };
  }

  async kickMember(roomId, ownerId, targetUserId) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const ownerIdStr = room.ownerId?._id
      ? room.ownerId._id.toString()
      : room.ownerId.toString();

    if (ownerIdStr !== ownerId.toString()) {
      throw new Error('Only room owner can kick members');
    }

    // Notify the kicked user BEFORE leaveRoom (so they're still in the channel)
    this.emit(`room:${roomId}`, 'room:kicked', { roomId, userId: targetUserId.toString(), reason: 'kicked_by_owner' });

    await this.leaveRoom(roomId, targetUserId);

    return { success: true };
  }

  async getMyActiveRoom(userId) {
    // Check if user owns a room
    const owned = await this.roomRepository.findActiveByOwner(userId);
    if (owned) return { ...owned.toObject(), _isOwner: true };

    // Check if user is a member of any active room
    const memberships = await this.roomMemberRepository.findByUser(userId);
    for (const m of memberships) {
      const rm = m.roomId;
      if (rm && rm.status && rm.status !== 'FINISHED') {
        const roomOwner = await this.userRepository.findById(rm.ownerId);
        return { ...rm.toObject(), _isOwner: false, _ownerName: roomOwner?.username || '' };
      }
    }
    return null;
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

    const ownerIdStr = room.ownerId?._id
      ? room.ownerId._id.toString()
      : room.ownerId.toString();

    if (ownerIdStr !== ownerId.toString()) {
      throw new Error('Only room owner can update room');
    }

    const updatedRoom = await this.roomRepository.updateById(roomId, updateData);
    this.emit(`lobby:${updatedRoom.game || 'lol'}:${updatedRoom.mode}`, 'room:updated', updatedRoom);
    this.emit(`room:${roomId}`, 'room:updated', updatedRoom);
    return updatedRoom;
  }

  async deleteRoom(roomId, ownerId) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const ownerIdStr = room.ownerId?._id
      ? room.ownerId._id.toString()
      : room.ownerId.toString();

    if (ownerIdStr !== ownerId.toString()) {
      throw new Error('Only room owner can delete room');
    }

    // Emit to room members FIRST (before deletion, while socket channel is still relevant)
    this.emit(`room:${roomId}`, 'room:deleted', { roomId });

    await this.roomMemberRepository.deleteByRoom(roomId);
    await this.roomRepository.deleteById(roomId);

    const channel = `lobby:${room.game || 'lol'}:${room.mode}`;
    this.emit(channel, 'room:deleted', { roomId });

    return { success: true };
  }

  // Called when owner disconnects and grace period expires.
  // Transfers to earliest joined member; if none, deletes room.
  async handleOwnerAbandoned(roomId) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) return { action: 'none' };

    const ownerIdStr = room.ownerId?._id
      ? room.ownerId._id.toString()
      : room.ownerId.toString();

    const members = await this.roomMemberRepository.findByRoom(roomId);
    // Pick earliest joined member who is NOT the current owner
    const next = members.find(m => {
      const uid = m.userId?._id ? m.userId._id.toString() : m.userId?.toString();
      return uid && uid !== ownerIdStr;
    });

    if (next) {
      const newOwnerId = next.userId?._id ? next.userId._id : next.userId;
      const updated = await this.roomRepository.updateById(roomId, { ownerId: newOwnerId });
      this.emit(`room:${roomId}`, 'room:ownership-transferred', {
        roomId,
        newOwnerId: newOwnerId.toString(),
        newOwnerName: next.userId?.username || ''
      });
      this.emit(`lobby:${room.game || 'lol'}:${room.mode}`, 'room:updated', updated);
      return { action: 'transferred', newOwnerId: newOwnerId.toString() };
    }

    // Persistent chatroom: keep room alive for history, do not delete even if no members online
    if (room.isPersistent) {
      return { action: 'kept-persistent' };
    }

    // No members left — delete the room
    await this.roomMemberRepository.deleteByRoom(roomId);
    await this.roomRepository.deleteById(roomId);
    this.emit(`room:${roomId}`, 'room:deleted', { roomId });
    this.emit(`lobby:${room.game || 'lol'}:${room.mode}`, 'room:deleted', { roomId });
    return { action: 'deleted' };
  }

  async approveJoin(roomId, ownerId, targetUserId) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) throw new Error('Room not found');
    const ownerIdStr = room.ownerId?._id ? room.ownerId._id.toString() : room.ownerId.toString();
    if (ownerIdStr !== ownerId.toString()) throw new Error('Only owner can approve');

    const pending = (room.pendingMembers || []).map(String);
    if (!pending.includes(targetUserId.toString())) throw new Error('User did not request to join');
    if (room.current >= room.slots) throw new Error('Room is full');

    await this.roomRepository.updateById(roomId, { $pull: { pendingMembers: targetUserId } });
    await this.roomMemberRepository.create({ roomId, userId: targetUserId });
    const updatedRoom = await this.roomRepository.incrementCurrent(roomId);

    const targetUser = await this.userRepository.findById(targetUserId);
    const member = await this.roomMemberRepository.findByRoomAndUser(roomId, targetUserId);
    this.emit(`room:${roomId}`, 'room:member-joined', {
      roomId,
      member: { id: targetUser._id, userId: targetUser._id, name: targetUser.username, joinedAt: member?.joinedAt },
    });
    this.emit(`room:${roomId}`, 'room:join-approved', { roomId, userId: targetUserId.toString() });
    this.emit(`lobby:${updatedRoom.game || 'lol'}:${updatedRoom.mode}`, 'room:updated', updatedRoom);
    return { success: true, room: updatedRoom };
  }

  async rejectJoin(roomId, ownerId, targetUserId) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) throw new Error('Room not found');
    const ownerIdStr = room.ownerId?._id ? room.ownerId._id.toString() : room.ownerId.toString();
    if (ownerIdStr !== ownerId.toString()) throw new Error('Only owner can reject');
    await this.roomRepository.updateById(roomId, { $pull: { pendingMembers: targetUserId } });
    this.emit(`room:${roomId}`, 'room:join-rejected', { roomId, userId: targetUserId.toString() });
    return { success: true };
  }

  async getMembers(roomId) {
    const members = await this.roomMemberRepository.findByRoom(roomId);
    return members;
  }
}

module.exports = RoomService;
