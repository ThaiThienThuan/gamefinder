# GAMEMATCH — Tài liệu dự án & Context AI

> File này là nguồn thông tin duy nhất (single source of truth) cho toàn bộ dự án.
> Đọc file này trước khi chạm vào bất kỳ file code nào.

---

## 1. TỔNG QUAN DỰ ÁN

GameMatch là nền tảng tìm đồng đội chơi game (League of Legends style) theo kiến trúc MERN Stack full-stack. Người dùng có thể tạo phòng, tìm trận, nhắn tin realtime, và stream màn hình cho nhau xem qua LiveKit.

### Mục tiêu sản phẩm
- Guest vào ngay không cần đăng ký
- Tạo/tìm phòng theo rank, mode, vị trí
- Chat realtime trong phòng
- Tìm trận tự động (matchmaking) theo rank
- Stream màn hình / voice chat qua LiveKit WebRTC

---

## 2. TECH STACK CUỐI CÙNG

| Layer | Technology | Ghi chú |
|-------|-----------|---------|
| Frontend | React 18 + Vite + TailwindCSS | Vercel |
| HTTP Client | Axios (single instance) | `client/src/lib/apiClient.js` |
| Backend | Node.js 18 + Express.js | Render |
| Database | MongoDB Atlas | Mongoose ORM |
| Realtime | Socket.io 4.x | Attach vào HTTP server |
| Cache/Queue | Upstash Redis (TLS) | ioredis + @socket.io/redis-adapter |
| WebRTC | LiveKit Cloud | Thay thế Mediasoup Phase D |
| Auth | JWT (jsonwebtoken) + Guest mode | 7 ngày expiry |
| Upload | Multer | Disk storage → /uploads |
| Logging | Morgan | HTTP request log |
| Container | Docker Compose | Dev only, không dùng cho production |

### Biến môi trường — file duy nhất `.env` ở root `/server/.env`

```env
# MongoDB
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/gamematch

# Redis (Upstash — TLS, dùng rediss://)
REDIS_URL=rediss://default:<pass>@popular-eft-76035.upstash.io:6379

# JWT
JWT_SECRET=<min-32-chars>
JWT_EXPIRY=7d

# Server
NODE_ENV=production
PORT=4000
LOG_LEVEL=combined

# CORS — Vercel domain khi deploy
ALLOWED_ORIGIN=https://gamematch.vercel.app

# File Upload
MAX_FILE_SIZE_MB=50
UPLOAD_DIR=./uploads

# LiveKit
LIVEKIT_URL=wss://nodejs-7cdtijc9.livekit.cloud
LIVEKIT_API_KEY=<your-api-key>
LIVEKIT_API_SECRET=<your-api-secret>
```

Frontend `.env` ở `/client/.env`:
```env
VITE_API_URL=https://gamematch-api.onrender.com
VITE_LIVEKIT_URL=wss://nodejs-7cdtijc9.livekit.cloud
```

**KHÔNG có file `.env` nào ở root `/` của monorepo.**
**KHÔNG commit `.env` — chỉ commit `.env.example`.**

---

## 3. KIẾN TRÚC HỆ THỐNG

### Layered Architecture (MANDATORY — không được vi phạm)

```
HTTP Request / Socket Event
        ↓
   Controller / Socket Handler
   (thin: parse → gọi service → trả về)
        ↓
     Service
   (business logic, validation, orchestration)
        ↓
    Repository
   (Mongoose queries ONLY — không có logic)
        ↓
   Entity/Model
   (Mongoose schema)
        ↓
     MongoDB
```

**Quy tắc bất biến:**
- Controller KHÔNG gọi Repository trực tiếp
- Service KHÔNG chứa Mongoose queries
- Repository KHÔNG chứa business logic
- Socket handler mỏng như Controller

### Socket.io Architecture

```
Client emit event
        ↓
  server/socket/[domain]Handler.js   ← thin, như controller
        ↓
  server/apps/Services/[X]Service.js ← business logic
  (Service nhận io làm constructor param)
        ↓
  Service emit event sau khi DB op thành công
        ↓
  Redis Adapter broadcast tới tất cả instances
        ↓
  Client nhận event
```

### Deployment Architecture

```
Vercel (Static)          Render (API Server)
client/                  server/
  src/                     apps/
  ↓ VITE_API_URL             ↓
  axios → /api/*  ────────→ Express + Socket.io
                              ↓
                         MongoDB Atlas
                         Upstash Redis
                         LiveKit Cloud
```

---

## 4. CẤU TRÚC THƯ MỤC CHUẨN

```
/gamematch/                          ← root monorepo
│
├── .env.example                     ← KHÔNG có .env thật ở đây
├── .gitignore
├── docker-compose.yml               ← Dev only
├── README.md                        ← file này
│
├── server/                          ← Node.js backend
│   ├── .env                         ← env thật của backend (gitignored)
│   ├── .env.example                 ← template backend env
│   ├── app.js                       ← Express setup, middleware
│   ├── server.js                    ← Entry point, http.createServer
│   ├── package.json
│   ├── Dockerfile
│   │
│   ├── Config/
│   │   └── Setting.json             ← Config đọc từ env vars
│   │
│   ├── Util/
│   │   ├── VerifyToken.js           ← authMiddleware + requireAuth + requireRegistered
│   │   ├── generateGuestId.js
│   │   └── turnCredential.js        ← DEPRECATED (dùng LiveKit thay vì TURN)
│   │
│   ├── apps/
│   │   ├── Entity/                  ← Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── Room.js
│   │   │   ├── RoomMember.js
│   │   │   ├── Message.js
│   │   │   └── Attachment.js
│   │   │
│   │   ├── Repository/              ← DB queries only
│   │   │   ├── UserRepository.js
│   │   │   ├── RoomRepository.js
│   │   │   ├── RoomMemberRepository.js
│   │   │   ├── MessageRepository.js
│   │   │   └── AttachmentRepository.js
│   │   │
│   │   ├── Services/                ← Business logic
│   │   │   ├── UserService.js
│   │   │   ├── RoomService.js       ← nhận io param, emit sau DB op
│   │   │   ├── MessageService.js    ← nhận io param, emit sau DB op
│   │   │   ├── MatchmakingService.js← Redis sorted set queue
│   │   │   ├── UploadService.js
│   │   │   └── LiveKitService.js    ← NEW: tạo LiveKit token
│   │   │
│   │   ├── controllers/             ← Route handlers (thin)
│   │   │   ├── index.js             ← Aggregator tất cả routes
│   │   │   ├── roomcontroller.js
│   │   │   ├── messagecontroller.js
│   │   │   ├── uploadcontroller.js
│   │   │   ├── matchmakingcontroller.js
│   │   │   └── api/
│   │   │       └── authcontroller.js
│   │   │
│   │   └── Database/
│   │       └── Database.js          ← Mongoose connect
│   │
│   ├── socket/                      ← Socket.io handlers
│   │   ├── index.js                 ← initSocket(), getIO()
│   │   ├── roomHandler.js
│   │   ├── chatHandler.js
│   │   ├── presenceHandler.js
│   │   ├── matchmakingHandler.js
│   │   └── liveKitHandler.js        ← NEW: LiveKit token request via socket
│   │
│   ├── redis/
│   │   └── redisClient.js           ← ioredis, redisPub, redisSub, KEYS, checkRateLimit
│   │
│   ├── livekit/                     ← NEW folder (thay mediasoup/)
│   │   └── tokenService.js          ← Tạo LiveKit access token
│   │
│   └── uploads/                     ← Multer storage
│
├── client/                          ← React frontend
│   ├── .env                         ← env thật frontend (gitignored)
│   ├── .env.example
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   ├── Dockerfile
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── constants/
│       │   └── index.js
│       ├── utils/
│       │   └── helpers.js
│       ├── lib/
│       │   └── apiClient.js         ← Axios single instance
│       ├── hooks/
│       │   ├── useAuth.js
│       │   ├── useSocket.js
│       │   └── useLiveKit.js        ← NEW (thay useMediasoup)
│       ├── components/
│       │   ├── Lobby.jsx
│       │   ├── RoomCard.jsx
│       │   ├── RoomView.jsx
│       │   ├── CreateRoomModal.jsx
│       │   ├── MatchFindingModal.jsx
│       │   ├── RoomDetailModal.jsx
│       │   ├── ModeSelection.jsx
│       │   ├── LiveKitRoom.jsx      ← NEW: wrapper @livekit/components-react
│       │   └── ui/
│       │       ├── Field.jsx
│       │       ├── GlobalStyles.jsx
│       │       ├── GoldBtn.jsx
│       │       ├── HexBorder.jsx
│       │       ├── Modal.jsx
│       │       ├── RankBadge.jsx
│       │       └── StatusDot.jsx
│       └── pages/
│           ├── LobbyPage.jsx
│           └── LoginPage.jsx
│
├── infra/
│   └── nginx/
│       └── nginx.conf               ← Dev proxy config
│
└── scripts/
    └── seedDb.js                    ← Seed demo data
```

**Files/folders KHÔNG nên tồn tại (cần xóa):**
- `/src/` ở root — React app phải ở `/client/src/`
- `/index.html` ở root
- `/vite.config.js` ở root
- `server/mediasoup/` — đã thay bằng LiveKit, xóa toàn bộ
- `server/infra/coturn/` — không dùng TURN nữa
- Bất kỳ `.env` nào ở root `/`
- `server/Util/turnCredential.js` — deprecated

---

## 5. MONGODB SCHEMAS

### User
```
username    String, required, unique
email       String, unique, sparse
password    String, select: false        ← bcrypt hash
avatar      String
rank        String, enum [IRON..CHALLENGER], default SILVER
guestId     String, unique, sparse
createdAt   Date (auto, timestamps:true)
updatedAt   Date (auto, timestamps:true)
```

### Room
```
ownerId     ObjectId ref User, required
name        String, required
mode        String, enum [RANKED, NORMAL, ARAM, TFT]
slots       Number, min 1 max 5
current     Number, default 0
status      String, enum [RECRUITING, FULL, PLAYING, FINISHED]
createdAt   Date
updatedAt   Date
```

### RoomMember
```
roomId      ObjectId ref Room, required
userId      ObjectId ref User, required
position    String, enum [TOP, JUNGLE, MID, ADC, SUPPORT], optional
joinedAt    Date, default now
Index: { roomId, userId } UNIQUE
```

### Message
```
roomId      ObjectId ref Room, required
userId      ObjectId ref User, required
text        String, required, maxlength 500
attachments [ObjectId ref Attachment]
createdAt   Date
```

### Attachment
```
roomId      ObjectId ref Room
userId      ObjectId ref User, required
messageId   ObjectId ref Message, optional
url         String, required
type        String, enum [IMAGE, VIDEO]
size        Number
mimetype    String
createdAt   Date
```

---

## 6. API ENDPOINTS

### Auth — `/api/auth`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | /register | None | Đăng ký, trả JWT |
| POST | /login | None | Đăng nhập, trả JWT |
| POST | /guest | None | Tạo guest session |
| GET | /me | authMiddleware | Lấy thông tin user hiện tại |
| POST | /convert | authMiddleware | Chuyển guest → registered |

### Rooms — `/api/rooms`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | / | None | Danh sách phòng, filter: mode, status |
| POST | / | requireRegistered | Tạo phòng |
| GET | /:id | None | Chi tiết phòng |
| PATCH | /:id | requireRegistered | Cập nhật phòng (owner only) |
| DELETE | /:id | requireRegistered | Xóa phòng (owner only) |
| POST | /:id/join | requireRegistered | Vào phòng (atomic) |
| POST | /:id/leave | requireRegistered | Rời phòng |
| POST | /:id/kick | requireRegistered | Kick thành viên (owner only) |
| GET | /:id/members | None | Danh sách thành viên |

### Messages — `/api/messages`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | /:roomId | None | Lịch sử chat (paginated) |
| POST | / | requireAuth | Gửi tin nhắn |
| DELETE | /:messageId | requireAuth | Xóa tin nhắn |

### Upload — `/api`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | /upload | requireAuth | Upload ảnh/video (Multer) |
| DELETE | /attachments/:id | requireAuth | Xóa attachment |
| GET | /attachments/room/:roomId | None | Attachments của phòng |

### Matchmaking — `/api/matchmaking`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | /start | requireAuth | Vào hàng chờ |
| POST | /stop | requireAuth | Rời hàng chờ |
| GET | /status | requireAuth | Trạng thái cá nhân |

### LiveKit — `/api/livekit`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | /token | requireAuth | Tạo LiveKit access token cho room |

### Health
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | /health | None | `{ status, db, redis }` |

---

## 7. SOCKET.IO EVENTS

### Client → Server
| Event | Payload | Mô tả |
|-------|---------|-------|
| room:join-lobby | `{ mode }` | Vào lobby channel theo mode |
| room:leave-lobby | none | Rời lobby channel |
| room:join | `{ roomId }` | Vào socket room channel |
| room:leave | `{ roomId }` | Rời socket room channel |
| chat:message | `{ roomId, text, attachmentIds? }` | Gửi chat (rate limit 1/s) |
| presence:update | `{ status }` | online/idle/offline |
| finding:start | `{ mode, rank }` | Vào matchmaking queue |
| finding:stop | none | Rời queue |

### Server → Client
| Event | Payload | Mô tả |
|-------|---------|-------|
| room:created | room object | Phòng mới tạo |
| room:updated | room object | Phòng thay đổi |
| room:deleted | `{ roomId }` | Phòng bị xóa |
| room:member-joined | `{ roomId, member }` | Thành viên vào |
| room:member-left | `{ roomId, userId }` | Thành viên rời |
| chat:message | message object | Tin nhắn mới |
| presence:update | `{ userId, status }` | Trạng thái online |
| finding:queued | `{ position, total }` | Vào queue thành công |
| finding:match-found | `{ room }` | Ghép trận xong |
| finding:stopped | none | Rời queue thành công |
| error | `{ message }` | Lỗi |

---

## 8. AUTHENTICATION FLOW

```
Lần đầu vào app
      ↓
useAuth.js kiểm tra localStorage
      ↓
Không có token/guestId?
      ↓
POST /api/auth/guest
→ Server tạo User với guestId
→ Trả { user, guestId }
→ Frontend lưu guestId vào localStorage
→ Axios interceptor gắn X-Guest-Id header

Đăng ký / Đăng nhập
      ↓
POST /api/auth/register hoặc /login
→ Server trả JWT
→ Frontend lưu token vào localStorage
→ Axios interceptor gắn Authorization: Bearer <token>

requireAuth middleware:
  - JWT → req.user = { id, guestId }
  - X-Guest-Id → req.user = { id: null, guestId }
  - Không có gì → tiếp tục (optional auth)

requireRegistered middleware:
  - JWT hợp lệ → req.user = { id, guestId }
  - Guest hoặc không có → 401
  - Dùng cho: tạo phòng, join, kick, delete
```

---

## 9. MATCHMAKING FLOW

```
Client emit finding:start { mode, rank }
      ↓
matchmakingHandler → MatchmakingService.enterQueue()
      ↓
Redis ZADD finding_pool:{mode}:{rank} score=timestamp member=userId
Redis HSET finding_pool:meta:{userId} { socketId, mode, rank }
      ↓
checkForMatch(): tìm ≥5 players cùng mode, rank ±2 bậc
      ↓
Nếu đủ → tạo Room (RoomService.createRoom)
        → Redis ZREM tất cả user đã match
        → io.to(socketId).emit('finding:match-found', { room })
      ↓
Client nhận finding:match-found → navigate vào RoomView
```

---

## 10. LIVEKIT INTEGRATION

GameMatch dùng LiveKit Cloud thay vì tự host Mediasoup.

### Server side
```
POST /api/livekit/token
  Body: { roomId, participantName }
  Auth: requireAuth
  → LiveKitService.createToken(roomId, userId, participantName)
  → Trả { token, url }
```

`server/livekit/tokenService.js` dùng `livekit-server-sdk`:
```js
const { AccessToken } = require('livekit-server-sdk');
// Tạo token với VideoGrant cho roomId
// Ký bằng LIVEKIT_API_KEY + LIVEKIT_API_SECRET
// Expiry: 4 giờ
```

### Client side
```
RoomView mount
  → GET /api/livekit/token { roomId }
  → Nhận { token, url }
  → <LiveKitRoom token={token} serverUrl={url} />
  → @livekit/components-react render video/audio UI
```

Packages cần thêm:
- Server: `livekit-server-sdk`
- Client: `@livekit/components-react`, `@livekit/client`

---

## 11. REDIS STRUCTURE

```
finding_pool:{mode}:{rank}     Sorted Set  userId → timestamp (FIFO queue)
finding_pool:meta:{userId}     Hash        { socketId, mode, rank, timestamp }
online:{userId}                String      "online"|"idle" (TTL 300s)
ratelimit:{userId}:chat        String      counter (TTL 1s sliding window)
```

Redis adapter Socket.io:
- `redisPub` và `redisSub` là 2 client riêng biệt
- `io.adapter(createAdapter(redisPub, redisSub))`
- Tất cả `io.to(channel).emit()` tự động sync qua Redis

---

## 12. DEPLOYMENT

### Backend → Render

1. Tạo **Web Service** trên Render, connect GitHub repo
2. Root Directory: `server`
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Environment Variables (thêm từng cái):
   ```
   NODE_ENV=production
   MONGO_URI=mongodb+srv://...
   REDIS_URL=rediss://default:...@popular-eft-76035.upstash.io:6379
   JWT_SECRET=<random 64 chars>
   JWT_EXPIRY=7d
   ALLOWED_ORIGIN=https://gamematch.vercel.app
   MAX_FILE_SIZE_MB=50
   LIVEKIT_URL=wss://nodejs-7cdtijc9.livekit.cloud
   LIVEKIT_API_KEY=<key>
   LIVEKIT_API_SECRET=<secret>
   ```
6. Render URL sẽ là: `https://gamematch-api.onrender.com`

⚠️ **Lưu ý Render Free tier:**
- Server sleep sau 15 phút không có request
- Cold start ~30s
- Không hỗ trợ persistent disk → uploads sẽ mất khi redeploy
- Giải pháp uploads: dùng Cloudinary hoặc AWS S3 thay Multer disk storage

### Frontend → Vercel

1. Import GitHub repo vào Vercel
2. Root Directory: `client`
3. Framework: Vite
4. Environment Variables:
   ```
   VITE_API_URL=https://gamematch-api.onrender.com
   VITE_LIVEKIT_URL=wss://nodejs-7cdtijc9.livekit.cloud
   ```
5. Deploy

### Database → MongoDB Atlas
- Đã có, không cần setup thêm
- Đảm bảo IP whitelist: `0.0.0.0/0` (allow all) cho Render

### Redis → Upstash
- Đã có, URL dạng `rediss://` (TLS)
- Free tier: 10,000 commands/day — đủ cho dev/demo

---

## 13. LOCAL DEVELOPMENT

### Với Docker
```bash
docker-compose up -d
# Frontend: http://localhost
# API: http://localhost:4000
# Health: http://localhost:4000/health
```

### Không Docker
```bash
# Terminal 1 — Backend
cd server
cp .env.example .env    # điền env vars
npm install
npm run dev             # nodemon hoặc node server.js

# Terminal 2 — Frontend
cd client
cp .env.example .env    # điền VITE_API_URL=http://localhost:4000
npm install
npm run dev             # http://localhost:5173
```

### Seed data
```bash
# Với Docker
docker exec gamematch-api node scripts/seedDb.js

# Local
cd server
node ../scripts/seedDb.js
```

---

## 14. LUỒNG HOẠT ĐỘNG CHÍNH (User Journey)

### Tìm và vào phòng
```
1. App load → useAuth auto-tạo guest session
2. useSocket connect với guestId
3. Chọn mode (RANKED/NORMAL/ARAM/TFT)
4. GET /api/rooms?mode=RANKED → render danh sách
5. Socket join lobby:RANKED channel
6. Bấm phòng → RoomDetailModal
7. Bấm "Vào phòng" → POST /api/rooms/:id/join
8. Server: check slots, atomic insert RoomMember, emit room:member-joined
9. Client nhận → navigate RoomView
10. Socket emit room:join { roomId } → join room:${roomId} channel
```

### Tạo phòng
```
1. Bấm "Tạo Phòng" → CreateRoomModal
2. Điền info → POST /api/rooms
3. Server tạo Room + RoomMember (owner) → emit room:created
4. Mọi client trong lobby:RANKED nhận room:created → thêm vào list
5. Owner navigate RoomView
6. Socket emit room:join { roomId }
```

### Chat realtime
```
1. Trong RoomView, gõ tin nhắn
2. Socket emit chat:message { roomId, text }
3. Server: checkRateLimit (1/s) → MessageService.sendMessage()
4. MongoDB insert Message
5. Populate user info
6. io.to(room:${roomId}).emit('chat:message', populated)
7. Tất cả client trong room nhận → render
```

### Matchmaking
```
1. Bấm "Tìm Trận" → MatchFindingModal
2. Socket emit finding:start { mode, rank }
3. Server: Redis ZADD + HSET
4. checkForMatch: tìm ≥5 players rank ±2
5. Đủ người → createRoom → emit finding:match-found tới từng socketId
6. Client nhận → navigate RoomView với room mới
```

### Video/Voice (LiveKit)
```
1. Trong RoomView, bấm "Bật Video"
2. POST /api/livekit/token { roomId }
3. Server tạo AccessToken ký bằng API Key/Secret
4. Client nhận token → <LiveKitRoom token serverUrl />
5. LiveKit SDK tự handle WebRTC, TURN, codec negotiation
6. Participants thấy nhau qua LiveKit infrastructure
```

---

## 15. LỖI ĐÃ BIẾT CẦN FIX

Xem file `CURSOR_AUDIT_PROMPT.md` để biết danh sách đầy đủ.

---

