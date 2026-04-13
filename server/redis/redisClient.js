const Redis = require('ioredis');

// Upstash dùng rediss:// (TLS) — ioredis xử lý tự động khi URL có rediss://
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const ioredisOptions = {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false
};

// Separate pub/sub clients for Socket.io Redis adapter
const redisPub = new Redis(REDIS_URL, ioredisOptions);
const redisSub = new Redis(REDIS_URL, ioredisOptions);

// Main client for direct operations (presence, rate limiting, queue)
const redis = new Redis(REDIS_URL, ioredisOptions);

redisPub.on('connect', () => console.log('✓ Redis pub client connected'));
redisPub.on('error', (err) => console.error('✗ Redis pub error:', err.message));

redisSub.on('connect', () => console.log('✓ Redis sub client connected'));
redisSub.on('error', (err) => console.error('✗ Redis sub error:', err.message));

redis.on('connect', () => console.log('✓ Redis main client connected'));
redis.on('error', (err) => console.error('✗ Redis error:', err.message));

// Queue operations (sorted set: ZADD for FIFO, hash for metadata)
async function addToQueue(userId, mode, rank, socketId) {
  const score = Date.now(); // timestamp for FIFO ordering
  const queueKey = `queue:${mode}`;
  const userKey = `user:${userId}`;

  // Add userId to sorted set (FIFO ordering by timestamp)
  await redis.zadd(queueKey, score, userId);
  
  // Store user metadata in hash (fast lookup, no string parsing)
  await redis.hset(userKey, 'mode', mode, 'rank', rank, 'socketId', socketId, 'timestamp', score);
  await redis.expire(userKey, 600); // 10 min TTL
}

async function removeFromQueue(userId, mode) {
  const queueKey = `queue:${mode}`;
  const userKey = `user:${userId}`;

  await redis.zrem(queueKey, userId);
  await redis.del(userKey);
}

async function getQueueByMode(mode) {
  const queueKey = `queue:${mode}`;
  const userIds = await redis.zrange(queueKey, 0, -1);
  
  const result = [];
  for (const userId of userIds) {
    const userKey = `user:${userId}`;
    const data = await redis.hgetall(userKey);
    if (data && data.rank) {
      result.push({
        userId,
        mode: data.mode,
        rank: data.rank,
        socketId: data.socketId,
        timestamp: parseInt(data.timestamp)
      });
    }
  }
  return result;
}

async function getQueueSize(mode) {
  return await redis.zcard(`queue:${mode}`);
}

// Presence operations (SET with 5min TTL)
async function setPresence(userId, status) {
  await redis.set(`online:${userId}`, status, 'EX', 300); // 5min TTL
}

async function removePresence(userId) {
  await redis.del(`online:${userId}`);
}

async function getPresence(userId) {
  return await redis.get(`online:${userId}`);
}

// Rate limiting (sliding window with INCR)
async function checkRateLimit(userId, maxPerSecond = 1) {
  const key = `rate:${userId}:${Math.floor(Date.now() / 1000)}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 2); // 2 second window
  }
  return count <= maxPerSecond;
}

module.exports = {
  redis,
  redisPub,
  redisSub,
  addToQueue,
  removeFromQueue,
  getQueueByMode,
  getQueueSize,
  setPresence,
  removePresence,
  getPresence,
  checkRateLimit
};
