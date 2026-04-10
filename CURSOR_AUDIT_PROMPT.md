================================================================================
# CURSOR AUDIT PROMPT
# Paste toàn bộ phần này vào Cursor để bắt đầu audit
================================================================================

---

# CURSOR: Full Project Audit & Fix

Đây là lệnh audit toàn diện cho dự án GameMatch MERN Stack.
Đọc toàn bộ hướng dẫn trước khi bắt đầu. Làm từng bước theo thứ tự.

## Bối cảnh dự án

GameMatch là MERN Stack platform (MongoDB + Express + React + Node.js).
- Backend: `server/` — Express, Socket.io, Mongoose, Redis (Upstash), LiveKit
- Frontend: `client/` — React 18 + Vite
- WebRTC: LiveKit Cloud (KHÔNG dùng Mediasoup hay coturn)
- Deploy: Render (backend) + Vercel (frontend) + MongoDB Atlas + Upstash Redis

## Quy tắc khi sửa

1. **Đọc file trước khi sửa** — không assume nội dung
2. **Edit file cũ** — chỉ tạo file mới khi thật sự cần
3. **Không di chuyển file** nếu không được chỉ định rõ
4. **Giữ nguyên logic** không liên quan đến lỗi đang sửa
5. **Báo cáo** mỗi bước xong trước khi làm bước tiếp

---

## BƯỚC 1 — Audit cấu trúc thư mục

Scan toàn bộ project tree. Tìm và xử lý:

### 1a. Xóa các thứ không nên tồn tại

Kiểm tra và XÓA nếu tồn tại:
- `/src/` ở root (React app phải ở `/client/src/`)
- `/index.html` ở root
- `/vite.config.js` ở root
- `server/mediasoup/` folder (đã thay bằng LiveKit)
- `infra/coturn/` folder (không dùng TURN nữa)
- Bất kỳ file `.env` nào ở root `/` (không phải trong server/ hay client/)

Trước khi xóa, kiểm tra nội dung — nếu `/src/` ở root có code khác với `/client/src/`, merge trước rồi mới xóa.

### 1b. Kiểm tra file bị đặt sai chỗ

Kiểm tra xem các file sau có đúng vị trí không:
- `client/src/lib/apiClient.js` — phải TỒN TẠI ở đây
- `client/src/hooks/useAuth.js` — phải TỒN TẠI ở đây
- `client/src/hooks/useSocket.js` — phải TỒN TẠI ở đây
- `server/socket/index.js` — phải TỒN TẠI ở đây
- `server/redis/redisClient.js` — phải TỒN TẠI ở đây

Nếu bất kỳ file nào bị duplicate ở nhiều chỗ, giữ lại bản trong `client/src/` và xóa bản ở root.

### 1c. Tạo folder LiveKit nếu chưa có

Nếu `server/livekit/` chưa tồn tại, tạo:
```
server/livekit/
  tokenService.js
```

`tokenService.js` nội dung:
```js
const { AccessToken } = require('livekit-server-sdk');

function createToken(roomId, participantIdentity, participantName) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set');
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    name: participantName,
    ttl: '4h'
  });

  at.addGrant({
    room: roomId,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });

  return at.toJwt();
}

module.exports = { createToken };
```

---

## BƯỚC 2 — Audit và chuẩn hóa .env files

### 2a. Xóa .env sai chỗ

- Nếu có `.env` ở root `/`, xóa đi (không phải `.env.example`)
- Backend env chỉ ở `server/.env`
- Frontend env chỉ ở `client/.env`

### 2b. Tạo/cập nhật server/.env.example

Đảm bảo `server/.env.example` có đúng format sau (không có giá trị thật):

```env
# MongoDB Atlas
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/gamematch

# Redis (Upstash — dùng rediss:// cho TLS)
REDIS_URL=rediss://default:password@host.upstash.io:6379

# JWT
JWT_SECRET=your-jwt-secret-minimum-32-characters
JWT_EXPIRY=7d

# Server
NODE_ENV=development
PORT=4000
LOG_LEVEL=dev

# CORS
ALLOWED_ORIGIN=http://localhost:5173

# File Upload
MAX_FILE_SIZE_MB=50
UPLOAD_DIR=./uploads

# LiveKit
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

### 2c. Tạo/cập nhật client/.env.example

```env
VITE_API_URL=http://localhost:4000
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
```

### 2d. Kiểm tra .gitignore

Đảm bảo root `.gitignore` có:
```
.env
.env.local
server/.env
client/.env
node_modules/
server/uploads/*
!server/uploads/.gitkeep
```

---

## BƯỚC 3 — Audit Placeholder tags

Chạy lệnh sau và liệt kê kết quả:
```bash
grep -r "\[REDIS_PLACEHOLDER\]" server/
grep -r "\[MEDIASOUP_PLACEHOLDER\]" server/
grep -r "\[MEDIASOUP_PLACEHOLDER\]" client/
grep -r "\[SOCKET_PLACEHOLDER\]" client/
```

Với mỗi placeholder còn lại:

**[REDIS_PLACEHOLDER]** — implement theo spec:
- Nếu trong redisClient.js → đã phải được implement từ Phase C
- Nếu trong socket/index.js → Redis adapter phải được setup
- Nếu trong Services → emit phải đã có

**[MEDIASOUP_PLACEHOLDER]** — xóa comment, thay bằng LiveKit tương đương hoặc xóa hẳn

**[SOCKET_PLACEHOLDER]** — nếu còn stub rỗng → implement socket listeners

Báo cáo danh sách trước khi sửa.

---

## BƯỚC 4 — Audit server/apps/controllers/index.js

Đọc file này và kiểm tra:

### 4a. LiveKit endpoint
Phải có:
```js
router.post('/livekit/token', requireAuth, (req, res) => livekitController.createToken(req, res));
```
Hoặc inline handler. Nếu chưa có, thêm vào.

Tạo `server/apps/controllers/api/livekitcontroller.js`:
```js
const { createToken } = require('../../../livekit/tokenService');

class LiveKitController {
  async createToken(req, res) {
    try {
      const { roomId, participantName } = req.body;
      if (!roomId) {
        return res.status(400).json({ success: false, message: 'roomId is required' });
      }
      const userId = req.user.id || req.user.guestId;
      const name = participantName || `User_${userId.toString().slice(-6)}`;
      const token = createToken(roomId, userId.toString(), name);
      res.status(200).json({
        success: true,
        data: {
          token,
          url: process.env.LIVEKIT_URL
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = LiveKitController;
```

### 4b. TURN endpoint đã deprecated
Tìm và XÓA nếu có:
```js
router.get('/turn-credentials', ...)
```
Dự án dùng LiveKit, không cần TURN credentials endpoint nữa.

### 4c. Health check không hardcoded
Kiểm tra route `/health` hoặc `/api/health` — phải check `mongoose.connection.readyState` thật, không hardcoded `"connected"`.

---

## BƯỚC 5 — Audit server/apps/Entity/User.js

Đọc file và kiểm tra:

Phải có field `password`:
```js
password: {
  type: String,
  select: false  // không trả về trong API response
}
```

Nếu thiếu, thêm vào. Không thay đổi gì khác.

---

## BƯỚC 6 — Audit server/Config/Setting.json

Đọc file. Phải có các blocks sau (đọc từ env vars, không hardcode giá trị thật):

```json
{
  "server": {
    "port": 4000,
    "logLevel": "dev"
  },
  "mongo": {
    "uri": ""
  },
  "jwt": {
    "secret": "",
    "expiry": "7d"
  },
  "cors": {
    "allowedOrigin": "http://localhost:5173"
  },
  "redis": {
    "url": ""
  },
  "livekit": {
    "url": "",
    "apiKey": "",
    "apiSecret": ""
  }
}
```

Đảm bảo `server/app.js` và các services đọc từ `process.env` trực tiếp cho secrets (MONGO_URI, JWT_SECRET, REDIS_URL, LIVEKIT_*), không lưu secret thật vào Setting.json.

---

## BƯỚC 7 — Audit server/redis/redisClient.js

Đọc file. Kiểm tra:

### 7a. Connection string
Phải đọc từ `process.env.REDIS_URL` (không phải từ Setting.json host/port riêng lẻ):
```js
const redis = new Redis(process.env.REDIS_URL);
const redisPub = new Redis(process.env.REDIS_URL);
const redisSub = new Redis(process.env.REDIS_URL);
```

Upstash dùng `rediss://` (TLS) — ioredis xử lý tự động khi URL có `rediss://`.

### 7b. Export đúng
Phải export: `{ redis, redisPub, redisSub, KEYS, checkRateLimit }`

### 7c. Error handling
Phải có `redis.on('error', ...)` không crash server.

---

## BƯỚC 8 — Audit server/socket/index.js

Đọc file. Kiểm tra:

### 8a. Redis adapter
```js
const { createAdapter } = require('@socket.io/redis-adapter');
const { redisPub, redisSub } = require('../redis/redisClient');
// ...
io = new Server(server, {
  adapter: createAdapter(redisPub, redisSub),
  cors: { ... }
});
```

### 8b. CORS allowedOrigin là array
```js
origin: [
  process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5173'
]
```

### 8c. Tất cả handlers đã được register
```js
registerRoomHandlers(io, socket);
registerChatHandlers(io, socket);
registerPresenceHandlers(io, socket);
registerMatchmakingHandlers(io, socket);
// LiveKit không cần socket handler — dùng REST API
```

---

## BƯỚC 9 — Audit client/src/App.jsx

Đọc file. Kiểm tra:

### 9a. useSocket đã được import và connect
```js
import { useSocket } from './hooks/useSocket';
// ...
const { connect, disconnect, on, joinLobby, leaveLobby, ... } = useSocket();

useEffect(() => {
  if (!user || loading) return;
  const token = localStorage.getItem('token');
  const guestId = localStorage.getItem('guestId');
  connect(token, guestId);
  return () => disconnect();
}, [user, loading]);
```

### 9b. Lobby useEffect dùng socket events
```js
useEffect(() => {
  if (page !== 'lobby' || !mode) return;
  joinLobby(mode.id);
  const offCreated = on('room:created', ...);
  const offUpdated = on('room:updated', ...);
  const offDeleted = on('room:deleted', ...);
  return () => { leaveLobby(); offCreated(); offUpdated(); offDeleted(); };
}, [page, mode]);
```

### 9c. makeRoom() không được gọi
```bash
grep -n "makeRoom" client/src/App.jsx
```
Nếu còn → xóa call đó.

### 9d. queueMatch dùng Socket.io
```js
const queueMatch = (profile) => {
  emit('finding:start', { mode: mode.id, rank: profile.rank });
  toast("⏳ Đang tìm trận...");
};
```
Phải có listener cho `finding:match-found` → setMyRoom + setPage.

---

## BƯỚC 10 — Audit client/src/hooks/useSocket.js

Đọc file. Kiểm tra:

### 10a. Singleton pattern đúng
Chỉ một `socketInstance` cho toàn app.

### 10b. on() có guard
```js
const on = useCallback((event, handler) => {
  if (!socketRef.current) {
    console.warn(`useSocket: on('${event}') called before connect()`);
    return () => {};
  }
  socketRef.current.on(event, handler);
  return () => socketRef.current?.off(event, handler);
}, []);
```

### 10c. connect() nhận token và guestId
Auth phải được pass vào socket handshake:
```js
socketInstance = io(SOCKET_URL, {
  auth: { token: token || null, guestId: guestId || null },
  ...
});
```

---

## BƯỚC 11 — Kiểm tra server/package.json dependencies

Phải có TẤT CẢ các package sau. Thêm nếu thiếu:
```json
{
  "dependencies": {
    "bcrypt": "^5.x",
    "cors": "^2.x",
    "express": "^4.x",
    "jsonwebtoken": "^9.x",
    "mongoose": "^8.x",
    "morgan": "^1.x",
    "multer": "^1.x",
    "socket.io": "^4.x",
    "ioredis": "^5.x",
    "@socket.io/redis-adapter": "^8.x",
    "livekit-server-sdk": "^2.x"
  }
}
```

**KHÔNG được có:** `mediasoup`, `ioredis` ở root package.json

---

## BƯỚC 12 — Kiểm tra client/package.json dependencies

Phải có:
```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "axios": "^1.x",
    "socket.io-client": "^4.x",
    "@livekit/components-react": "^2.x",
    "@livekit/client": "^2.x"
  }
}
```

**KHÔNG được có:** `bcrypt`, `express`, `mongoose`, `mediasoup`, `mediasoup-client`

---

## BƯỚC 13 — Tạo client/src/components/LiveKitRoom.jsx

Nếu chưa có, tạo file này:

```jsx
import { LiveKitRoom as LKRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

export default function LiveKitRoom({ token, serverUrl, onLeave }) {
  if (!token || !serverUrl) return null;

  return (
    <LKRoom
      token={token}
      serverUrl={serverUrl}
      onDisconnected={onLeave}
      style={{ height: '400px' }}
    >
      <VideoConference />
    </LKRoom>
  );
}
```

---

## BƯỚC 14 — Kiểm tra RoomView.jsx LiveKit integration

Đọc `client/src/components/RoomView.jsx`. Kiểm tra:

Phải có logic để:
1. Khi user bấm "Bật Video/Voice"
2. Gọi `POST /api/livekit/token { roomId }`
3. Nhận `{ token, url }`
4. Render `<LiveKitRoom token url />`

Nếu chưa có, thêm vào (không xóa code UI hiện tại):

```jsx
import LiveKitRoom from './LiveKitRoom';
import apiClient from '../lib/apiClient';
import { useState } from 'react'; // nếu chưa có

// Trong component:
const [livekitToken, setLivekitToken] = useState(null);
const [livekitUrl, setLivekitUrl] = useState(null);
const [showVideo, setShowVideo] = useState(false);

const handleJoinVideo = async () => {
  try {
    const res = await apiClient.post('/api/livekit/token', {
      roomId: room?._id,
      participantName: user?.username || 'Guest'
    });
    setLivekitToken(res.data.data.token);
    setLivekitUrl(res.data.data.url);
    setShowVideo(true);
  } catch (err) {
    console.error('Failed to get LiveKit token:', err);
  }
};

// Trong JSX (tìm chỗ hợp lý trong voice/video section):
{showVideo && livekitToken && (
  <LiveKitRoom
    token={livekitToken}
    serverUrl={livekitUrl}
    onLeave={() => setShowVideo(false)}
  />
)}
```

---

## BƯỚC 15 — Kiểm tra server/server.js

Đọc file. Phải có:

### 15a. http.createServer pattern
```js
const http = require('http');
const { initSocket } = require('./socket/index');
const server = http.createServer(app);
initSocket(server);
server.listen(PORT, ...);
```
KHÔNG dùng `app.listen(PORT)` trực tiếp.

### 15b. Graceful shutdown
```js
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  server.close();
  await mongoose.disconnect();
  process.exit(0);
});
```

### 15c. Redis connection check không crash
Nếu Redis unavailable, server vẫn start được (degraded mode).

---

## BƯỚC 16 — Kiểm tra infra/nginx/nginx.conf

Đọc file. Phải có WebSocket upgrade headers cho Socket.io:
```nginx
location /socket.io {
  proxy_pass http://api:4000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_cache_bypass $http_upgrade;
}
```

---

## BƯỚC 17 — Final check: API ↔ Frontend alignment

Kiểm tra cross-reference các endpoint:

1. `client/src/lib/apiClient.js` baseURL phải đọc từ `import.meta.env.VITE_API_URL`
2. Mọi `apiClient.post('/api/rooms')` ở frontend phải có route tương ứng trong `server/apps/controllers/index.js`
3. Mọi `on('event')` trong frontend phải có `emit('event')` tương ứng trong server socket handlers
4. Field names trong response JSON phải match với field names frontend đang đọc

Tìm và liệt kê bất kỳ mismatch nào. Sửa phía server để match frontend (frontend là UI đã có, ít thay đổi hơn).

---

## BƯỚC 18 — Báo cáo tổng kết

Sau khi hoàn thành tất cả bước, tạo báo cáo:

```
## Audit Report

### Đã xóa:
- [list files/folders đã xóa]

### Đã tạo mới:
- [list files mới]

### Đã sửa:
- [list files đã edit với mô tả ngắn]

### Còn tồn đọng (cần xử lý thủ công):
- [list vấn đề không thể auto-fix]

### Packages cần install:
cd server && npm install
cd client && npm install
```

================================================================================
# END OF CURSOR AUDIT PROMPT
================================================================================