const RoomRepository = require('../Repository/RoomRepository');
const RoomService = require('./RoomService');
const UserRepository = require('../Repository/UserRepository');

class MatchmakingService {
  constructor() {
    this.roomRepository = new RoomRepository();
    this.roomService = new RoomService();
    this.userRepository = new UserRepository();
    this.matchmakingQueue = [];
  }

  async enterQueue(userId, mode, rank) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const existingQueueEntry = this.matchmakingQueue.find(entry => entry.userId === userId.toString());
    if (existingQueueEntry) {
      throw new Error('User already in queue');
    }

    const queueEntry = {
      userId: userId.toString(),
      mode,
      rank,
      timestamp: Date.now()
    };

    this.matchmakingQueue.push(queueEntry);

    // [REDIS_PLACEHOLDER] - In Phase C, move queue to Redis sorted set with score as timestamp
    // [REDIS_PLACEHOLDER] - Subscribe to room creation events to auto-join matched users

    const match = await this.checkForMatch();
    if (match) {
      return {
        matched: true,
        roomId: match.roomId,
        players: match.players
      };
    }

    return {
      matched: false,
      queuePosition: this.matchmakingQueue.length,
      status: 'waiting'
    };
  }

  async leaveQueue(userId) {
    const index = this.matchmakingQueue.findIndex(entry => entry.userId === userId.toString());
    if (index === -1) {
      throw new Error('User not in queue');
    }

    this.matchmakingQueue.splice(index, 1);

    // [REDIS_PLACEHOLDER] - Remove from Redis sorted set in Phase C

    return { success: true };
  }

  async checkForMatch() {
    if (this.matchmakingQueue.length < 5) {
      return null;
    }

    const firstEntry = this.matchmakingQueue[0];
    const potentialMatch = this.matchmakingQueue.slice(0, 5);

    const allSameMode = potentialMatch.every(entry => entry.mode === firstEntry.mode);
    if (!allSameMode) {
      return null;
    }

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
    const allCompatibleRank = potentialMatch.every(entry => acceptableRanks.includes(entry.rank));

    if (!allCompatibleRank) {
      return null;
    }

    const matchedUsers = potentialMatch.map(entry => entry.userId);
    this.matchmakingQueue = this.matchmakingQueue.filter(entry => !matchedUsers.includes(entry.userId));

    const room = await this.roomService.createRoom(matchedUsers[0], {
      name: `${firstEntry.mode} Match - ${Date.now()}`,
      mode: firstEntry.mode,
      slots: 5
    });

    for (let i = 1; i < matchedUsers.length; i++) {
      await this.roomService.joinRoom(room._id, matchedUsers[i]);
    }

    return {
      roomId: room._id,
      players: matchedUsers,
      mode: firstEntry.mode
    };
  }

  async getQueueStatus(userId) {
    const userInQueue = this.matchmakingQueue.find(entry => entry.userId === userId.toString());
    if (!userInQueue) {
      return {
        inQueue: false,
        position: -1
      };
    }

    const position = this.matchmakingQueue.indexOf(userInQueue);
    const waitTime = Math.floor((Date.now() - userInQueue.timestamp) / 1000);

    return {
      inQueue: true,
      position: position + 1,
      waitTime,
      mode: userInQueue.mode,
      queueSize: this.matchmakingQueue.length
    };
  }

  async getAllQueueStatus() {
    return {
      queueSize: this.matchmakingQueue.length,
      // [REDIS_PLACEHOLDER] - In Phase C, aggregate queue stats from Redis
      queues: {
        RANKED: this.matchmakingQueue.filter(e => e.mode === 'RANKED').length,
        NORMAL: this.matchmakingQueue.filter(e => e.mode === 'NORMAL').length,
        ARAM: this.matchmakingQueue.filter(e => e.mode === 'ARAM').length,
        TFT: this.matchmakingQueue.filter(e => e.mode === 'TFT').length
      }
    };
  }
}

module.exports = MatchmakingService;
