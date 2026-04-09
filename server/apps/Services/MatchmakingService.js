const RoomRepository = require('../Repository/RoomRepository');
const RoomService = require('./RoomService');
const UserRepository = require('../Repository/UserRepository');
const { addToQueue, removeFromQueue, getQueueByMode, getQueueSize } = require('../../redis/redisClient');

class MatchmakingService {
  constructor(io = null) {
    this.io = io;
    this.roomService = new RoomService(io);
    this.userRepository = new UserRepository();
  }

  async enterQueue(userId, mode, rank, socketId) {
    // Add to Redis sorted set (ZADD with timestamp)
    await addToQueue(userId, mode, rank, socketId);

    // Get position and total in queue for this mode
    const queueSize = await getQueueSize(mode);
    const position = queueSize;

    // Check for match: find ≥5 players with same mode and close rank range
    await this.checkForMatch(mode);

    return { position, total: queueSize };
  }

  async leaveQueue(userId) {
    // Remove from all mode queues in Redis
    const modes = ['RANKED', 'NORMAL', 'ARAM', 'TFT'];
    for (const mode of modes) {
      await removeFromQueue(userId, mode);
    }
    return { success: true };
  }

  async checkForMatch(mode) {
    const modeUsers = await getQueueByMode(mode);

    if (modeUsers.length < 5) {
      return null;
    }

    const potentialMatch = modeUsers.slice(0, 5);
    const firstEntry = potentialMatch[0];

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
    const allCompatibleRank = potentialMatch.every((entry) => acceptableRanks.includes(entry.rank));

    if (!allCompatibleRank) {
      return null;
    }

    // Create room and add matched users
    const matchedUserIds = potentialMatch.map((entry) => entry.userId);
    const room = await this.roomService.createRoom(matchedUserIds[0], {
      name: `Auto Match - ${mode}`,
      mode,
      slots: 5
    });

    for (let i = 1; i < matchedUserIds.length; i++) {
      await this.roomService.joinRoom(room._id, matchedUserIds[i]);
    }

    // For each matched user, emit finding:match-found to their socketId
    for (const entry of potentialMatch) {
      if (entry.socketId && this.io) {
        this.io.to(entry.socketId).emit('finding:match-found', { room });
      }
      // Remove from Redis queue
      await removeFromQueue(entry.userId, mode);
    }

    return { roomId: room._id, players: matchedUserIds, mode };
  }

  async getQueueStatus(userId) {
    const modes = ['RANKED', 'NORMAL', 'ARAM', 'TFT'];
    for (const mode of modes) {
      const modeUsers = await getQueueByMode(mode);
      const userInQueue = modeUsers.find(entry => entry.userId === userId);
      if (userInQueue) {
        const position = modeUsers.findIndex(entry => entry.userId === userId) + 1;
        const waitTime = Math.floor((Date.now() - userInQueue.timestamp) / 1000);
        return { inQueue: true, position, waitTime, mode, queueSize: modeUsers.length };
      }
    }
    return { inQueue: false, position: -1 };
  }

  async getAllQueueStatus() {
    const modes = ['RANKED', 'NORMAL', 'ARAM', 'TFT'];
    const queues = {};

    for (const mode of modes) {
      const size = await getQueueSize(mode);
      queues[mode] = size;
    }

    const total = Object.values(queues).reduce((sum, val) => sum + val, 0);
    return { queueSize: total, queues };
  }
}

module.exports = MatchmakingService;
