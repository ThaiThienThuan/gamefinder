const RoomRepository = require('../Repository/RoomRepository');
const RoomService = require('./RoomService');
const UserRepository = require('../Repository/UserRepository');

class MatchmakingService {
  constructor(io = null) {
    this.io = io;
    this.queue = MatchmakingService.queue; // shared in-memory queue
    this.roomService = new RoomService(io);
    this.userRepository = new UserRepository();
  }

  // Static shared queue (in-memory for Phase B)
  // [REDIS_PLACEHOLDER] - In Phase C, replace this.queue with Redis sorted set
  static queue = new Map(); // key: userId, value: { mode, rank, socketId, timestamp }

  async enterQueue(userId, mode, rank, socketId) {
    if (this.queue.has(userId)) {
      throw new Error('User already in queue');
    }

    // Add to static queue Map
    MatchmakingService.queue.set(userId, { mode, rank, socketId, timestamp: Date.now() });

    // Get position and total in queue for this mode
    const modeUsers = Array.from(MatchmakingService.queue.entries())
      .filter(([_, entry]) => entry.mode === mode);
    const position = modeUsers.length;
    const total = modeUsers.length;

    // Check for match: find ≥5 players with same mode and close rank range
    await this.checkForMatch(mode);

    return { position, total };
  }

  async leaveQueue(userId) {
    MatchmakingService.queue.delete(userId);
    return { success: true };
  }

  async checkForMatch(mode) {
    const modeUsers = Array.from(MatchmakingService.queue.entries())
      .filter(([_, entry]) => entry.mode === mode)
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    if (modeUsers.length < 5) {
      return null;
    }

    const potentialMatch = modeUsers.slice(0, 5);
    const firstEntry = potentialMatch[0][1];

    const rankRanges = {
      IRON: ['IRON', 'BRONZE'],
      BRONZE: ['IRON', 'BRONZE', 'SILVER'],
      SILVER: ['BRONZE', 'SILVER', 'GOLD'],
      GOLD: ['SILVER', 'GOLD', 'PLATINUM'],
      PLATINUM: ['GOLD', 'PLATINUM', 'DIAMOND'],
      DIAMOND: ['PLATINUM', 'DIAMOND', 'MASTER'],
      MASTER: ['DIAMOND', 'MASTER', 'GRANDMASTER'],
      GRANDMASTER: ['MASTER', 'GRANDMASTER', 'CHALLENGER'],
      CHALLENGER: ['GRANDMASTER', 'CHALLENGER']
    };

    const acceptableRanks = rankRanges[firstEntry.rank] || [];
    const allCompatibleRank = potentialMatch.every(([_, entry]) => acceptableRanks.includes(entry.rank));

    if (!allCompatibleRank) {
      return null;
    }

    // Create room and add matched users
    const matchedUserIds = potentialMatch.map(([userId, _]) => userId);
    const room = await this.roomService.createRoom(matchedUserIds[0], {
      name: `Auto Match - ${mode}`,
      mode,
      slots: 5
    });

    for (let i = 1; i < matchedUserIds.length; i++) {
      await this.roomService.joinRoom(room._id, matchedUserIds[i]);
    }

    // For each matched user, emit finding:match-found to their socketId
    matchedUserIds.forEach(userId => {
      const entry = MatchmakingService.queue.get(userId);
      if (entry && this.io) {
        this.io.to(entry.socketId).emit('finding:match-found', { room });
      }
      MatchmakingService.queue.delete(userId);
    });

    return { roomId: room._id, players: matchedUserIds, mode };
  }

  async getQueueStatus(userId) {
    if (!MatchmakingService.queue.has(userId)) {
      return { inQueue: false, position: -1 };
    }

    const userEntry = MatchmakingService.queue.get(userId);
    const modeUsers = Array.from(MatchmakingService.queue.entries())
      .filter(([_, entry]) => entry.mode === userEntry.mode)
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const position = modeUsers.findIndex(([id, _]) => id === userId) + 1;
    const waitTime = Math.floor((Date.now() - userEntry.timestamp) / 1000);

    return {
      inQueue: true,
      position,
      waitTime,
      mode: userEntry.mode,
      queueSize: modeUsers.length
    };
  }

  async getAllQueueStatus() {
    const queues = {
      RANKED: 0,
      NORMAL: 0,
      ARAM: 0,
      TFT: 0
    };

    MatchmakingService.queue.forEach(entry => {
      if (queues.hasOwnProperty(entry.mode)) {
        queues[entry.mode]++;
      }
    });

    // [REDIS_PLACEHOLDER] - In Phase C, aggregate queue stats from Redis
    return {
      queueSize: MatchmakingService.queue.size,
      queues
    };
  }
}

module.exports = MatchmakingService;
