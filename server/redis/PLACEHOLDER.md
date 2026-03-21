# Redis Integration — Phase C

This folder will contain Redis client and all Redis-dependent logic.

## What goes here

- `redisClient.js` → ioredis connection and utilities
- `socketAdapter.js` → Socket.io Redis adapter setup
- `matchmakingPool.js` → Redis sorted set for matchmaking queue
- `presenceMap.js` → online:{userId} tracking
- `rateLimiter.js` → sliding window counters
- `cache.js` → general caching utilities

## Integration Points

Current code contains `[REDIS_PLACEHOLDER]` comments marking where Redis logic should be added:

```bash
grep -r "[REDIS_PLACEHOLDER]" ../
```

## Key Files to Update in Phase C

- `apps/Services/MessageService.js` - Broadcast messages via Socket.io Redis adapter
- `apps/Services/RoomService.js` - Emit room events (join, leave, kick)
- `apps/Services/MatchmakingService.js` - Move queue to Redis sorted set
- `apps/controllers/index.js` - Socket.io initialization with Redis adapter

## Phase C Deliverables

✓ Redis connection (ioredis)
✓ Socket.io Redis adapter
✓ Matchmaking queue in Redis (sorted set by timestamp)
✓ Online presence tracking
✓ Real-time room/message events
✓ Session storage in Redis
