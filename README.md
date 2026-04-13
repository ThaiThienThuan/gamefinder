# GameMatching — Nền tảng tìm đồng đội chơi game

> MERN Stack + Socket.io + LiveKit Cloud | Cyberpunk Theme

---

## 1. Tổng quan

GameMatching là nền tảng tìm đồng đội chơi game đa thể loại. Người dùng có thể tạo phòng, tìm trận tự động, chat realtime, voice chat, video call và chia sẻ màn hình — tất cả trong giao diện phong cách Cyberpunk.

### Tính năng chính
- Hỗ trợ **12 game** với mode, rank, role riêng biệt
- Tạo / tìm phòng theo rank, mode, vị trí
- Chat realtime trong phòng (giao diện Discord-style)
- Voice chat, Video call, Screen share qua **LiveKit Cloud**
- Push-to-Talk (PTT), Noise Suppression, điều chỉnh âm lượng từng user
- Tìm trận tự động (matchmaking) theo rank
- Guest vào ngay không cần đăng ký
- Mỗi user chỉ được tạo/tham gia 1 phòng tại 1 thời điểm
- Nút "Đi tới phòng của tôi" khi user quên phòng đang ở

---

## 2. Tech Stack

| Layer | Technology | Ghi chú |
|-------|-----------|---------|
| Frontend | React 18 + Vite 5 + TailwindCSS 3 | SPA, Cyberpunk theme |
| Backend | Node.js + Express 4 | REST API + Socket.io |
| Database | MongoDB (Mongoose 8) | Atlas cho production |
| Realtime | Socket.io 4 | Redis adapter cho multi-instance |
| Cache/Queue | Redis 7 (ioredis) | Matchmaking, presence, rate limit |
| Voice/Video | LiveKit Cloud | WebRTC — voice, video, screen share |
| Auth | JWT + bcrypt | 7 ngày expiry, hỗ trợ Guest mode |
| Upload | Multer | Disk storage → /uploads |
| Logging | Morgan | HTTP request log |
| Container | Docker Compose | Dev only |

### Production Deploy
- **API**: Render.com
- **Frontend**: Vercel
- **Database**: MongoDB Atlas
- **Cache**: Upstash Redis (TLS)
- **Voice**: LiveKit Cloud

---

## 3. Game được hỗ trợ (12 game)

| # | Game ID | Tên hiển thị | Slots | Có Rank | Roles |
|---|---------|-------------|-------|---------|-------|
| 1 | `lol` | League of Legends | 5 | Yes | Top, Jungle, Mid, ADC, Support |
| 2 | `valorant` | Valorant | 5 | Yes | Duelist, Initiator, Controller, Sentinel |
| 3 | `cs2` | Counter-Strike 2 | 5 | Yes | Entry, AWPer, Rifler, Support, IGL, Lurker |
| 4 | `dota2` | Dota 2 | 5 | Yes | Carry, Mid, Offlane, Soft/Hard Support |
| 5 | `apex` | Apex Legends | 3 | Yes | Assault, Skirmisher, Recon, Support, Controller |
| 6 | `overwatch2` | Overwatch 2 | 5 | Yes | Tank, Damage, Support |
| 7 | `cod` | Call of Duty | 4-6 | Yes | Slayer, OBJ, Support, Flex, Anchor |
| 8 | `fortnite` | Fortnite | 4 | Yes | IGL, Fragger, Builder, Support |
| 9 | `pubg` | PUBG | 4 | Yes | IGL, Sniper, Rusher, Support |
| 10 | `r6siege` | Rainbow Six Siege | 5 | Yes | Hard Breacher, Intel, Anchor, Roamer |
| 11 | `rocket-league` | Rocket League | 3 | Yes | Striker, Midfielder, Goalie |
| 12 | `chatroom` | Chatting Room | 10 | No | — |

### Chat Commands trong phòng
Mỗi game có hệ thống lệnh riêng (gõ `/` trong chat):
- **LoL**: `/ahri`, `/yasuo` → tra cứu champion trên League Wiki
- **Valorant**: `/jett`, `/sage` → tra cứu agent trên Valorant Wiki
- **CS2**: `/ak47`, `/awp` → tra cứu weapon
- **R6 Siege**: `/ash`, `/thermite` → tra cứu operator trên Rainbow Six Wiki
- **Call of Duty**: `/m4`, `/search Nuketown` → tra cứu trên Call of Duty Wiki
- Và các game khác...

---

## 4. Cấu trúc thư mục

```
gamefinder/
├── package.json                  # Root monorepo (workspaces: server, client)
├── docker-compose.yml            # Dev: mongo + redis + api + client + nginx
├── .env.example                  # Template env vars
├── README.md
│
├── server/                       # ── Backend ──
│   ├── .env                      # Env thật (gitignored)
│   ├── .env.example
│   ├── package.json
│   ├── Dockerfile
│   ├── server.js                 # Entry point, HTTP server, graceful shutdown
│   ├── app.js                    # Express setup, middleware, CORS, routes
│   │
│   ├── Config/
│   │   └── Setting.json          # Default config (overridden by env vars)
│   │
│   ├── Util/
│   │   ├── VerifyToken.js        # authMiddleware, requireAuth, requireRegistered
│   │   └── generateGuestId.js
│   │
│   ├── apps/
│   │   ├── Entity/               # Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── Room.js           # 12 games, modes, rank, positions, voiceChat
│   │   │   ├── RoomMember.js
│   │   │   ├── Message.js
│   │   │   └── Attachment.js
│   │   │
│   │   ├── Repository/           # DB queries only (no business logic)
│   │   │   ├── UserRepository.js
│   │   │   ├── RoomRepository.js
│   │   │   ├── RoomMemberRepository.js
│   │   │   ├── MessageRepository.js
│   │   │   └── AttachmentRepository.js
│   │   │
│   │   ├── Services/             # Business logic
│   │   │   ├── UserService.js        # Register, login, guest, convert
│   │   │   ├── RoomService.js        # CRUD, join/leave/kick, 1-room limit
│   │   │   ├── MessageService.js     # Chat + rate limit
│   │   │   ├── MatchmakingService.js # Redis sorted set queue
│   │   │   ├── LiveKitService.js     # LiveKit token generation
│   │   │   └── UploadService.js      # File upload/delete
│   │   │
│   │   ├── controllers/          # Route handlers (thin layer)
│   │   │   ├── index.js              # Route aggregator
│   │   │   ├── roomcontroller.js
│   │   │   ├── messagecontroller.js
│   │   │   ├── uploadcontroller.js
│   │   │   ├── matchmakingcontroller.js
│   │   │   └── api/
│   │   │       └── authcontroller.js
│   │   │
│   │   └── Database/
│   │       └── Database.js       # Mongoose connect
│   │
│   ├── socket/                   # Socket.io handlers
│   │   ├── index.js              # initSocket(), auth middleware
│   │   ├── roomHandler.js        # Room/lobby/voice (server-managed state)
│   │   ├── chatHandler.js        # Chat + rate limiting
│   │   ├── presenceHandler.js    # Online/offline tracking
│   │   └── matchmakingHandler.js # Queue management
│   │
│   ├── redis/
│   │   └── redisClient.js        # ioredis, pub/sub, queue, presence, rate limit
│   │
│   ├── livekit/
│   │   └── tokenService.js       # LiveKit access token (4h TTL)
│   │
│   └── uploads/                  # Multer file storage
│
├── client/                       # ── Frontend ──
│   ├── .env                      # Env thật (gitignored)
│   ├── .env.example
│   ├── package.json
│   ├── Dockerfile
│   ├── index.html
│   ├── vite.config.js            # host: true (LAN access)
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   │
│   └── src/
│       ├── main.jsx              # React root
│       ├── App.jsx               # Main routing + state management
│       │
│       ├── components/
│       │   ├── ModeSelection.jsx     # Game mode picker
│       │   ├── Lobby.jsx             # Room list + create/join
│       │   ├── RoomView.jsx          # Room view (Discord-style layout)
│       │   ├── RoomCard.jsx          # Room card in lobby
│       │   ├── CreateRoomModal.jsx   # Create room form
│       │   ├── RoomDetailModal.jsx   # Room preview before join
│       │   ├── MatchFindingModal.jsx # Matchmaking queue UI
│       │   ├── LiveKitRoom.jsx       # Voice/video/screen share wrapper
│       │   └── ui/
│       │       ├── Field.jsx
│       │       ├── GlobalStyles.jsx  # Cyberpunk CSS
│       │       ├── GoldBtn.jsx
│       │       ├── Modal.jsx
│       │       └── ...
│       │
│       ├── hooks/
│       │   ├── useAuth.js            # JWT auth, login/register/guest
│       │   ├── useSocket.js          # Socket.io connection + events
│       │   └── useLiveKit.js         # LiveKit token + state
│       │
│       ├── constants/
│       │   ├── games.js              # 12 games config (modes, ranks, roles)
│       │   ├── theme.js              # Cyberpunk color palette
│       │   ├── valorantAgents.js     # Valorant agent list
│       │   └── gameCommands/         # Per-game chat commands
│       │       ├── index.js
│       │       ├── lol.js
│       │       ├── valorant.js
│       │       ├── cs2.js
│       │       ├── r6siege.js        # → Rainbow Six Wiki (Fandom)
│       │       ├── cod.js            # → Call of Duty Wiki (Fandom)
│       │       └── ...
│       │
│       ├── lib/
│       │   └── apiClient.js          # Axios instance
│       │
│       └── pages/
│           ├── GameSelectionPage.jsx  # Game carousel
│           ├── LoginPage.jsx
│           └── RegisterPage.jsx
│
├── infra/
│   └── nginx/
│       └── nginx.conf            # Dev reverse proxy
│
└── scripts/
    └── seedDb.js                 # Seed demo data
```

---

## 5. Kiến trúc hệ thống

### Layered Architecture

```
HTTP Request / Socket Event
        │
   Controller / Socket Handler    ← thin: parse → gọi service → trả về
        │
      Service                     ← business logic, validation
        │
    Repository                    ← Mongoose queries ONLY
        │
   Entity (Model)                 ← Mongoose schema
        │
     MongoDB
```

### Socket.io Architecture

```
Client emit event
        │
  socket/[domain]Handler.js      ← thin, như controller
        │
  apps/Services/[X]Service.js    ← business logic
        │
  Service emit event sau DB op
        │
  Redis Adapter broadcast         ← sync tất cả server instances
        │
  Client nhận event
```

### Voice Room Architecture (Server-managed)

```
Client voice:join
        │
  roomHandler.js                  ← Map<roomId, Map<userId, voiceState>>
        │
  Broadcast voice:members         ← full member list tới ALL room subscribers
        │
  Client render voice UI          ← single source of truth từ server
```

### Deployment

```
Vercel (Static)              Render (API)
client/ build                server/
    │                            │
    └── VITE_API_URL ──────────> Express + Socket.io
                                     │
                              MongoDB Atlas
                              Upstash Redis
                              LiveKit Cloud
```

---

## 6. MongoDB Schemas

### User
| Field | Type | Note |
|-------|------|------|
| username | String | unique, required |
| email | String | unique, sparse |
| password | String | bcrypt hash, select: false |
| avatar | String | |
| rank | String | enum: IRON → CHALLENGER, default: SILVER |
| guestId | String | unique, sparse |
| timestamps | auto | createdAt, updatedAt |

### Room
| Field | Type | Note |
|-------|------|------|
| ownerId | ObjectId → User | required |
| game | String | enum: 12 games |
| name | String | required |
| mode | String | game-specific (ranked, normal, etc.) |
| slots | Number | 1-16 |
| current | Number | default: 0 |
| status | String | RECRUITING / FULL / PLAYING / FINISHED |
| rankMin, rankMax | String | rank range filter |
| positions | [String] | role requirements |
| stylePreference | String | |
| voiceChat | Boolean | default: true |
| note | String | |

### RoomMember
| Field | Type | Note |
|-------|------|------|
| roomId | ObjectId → Room | |
| userId | ObjectId → User | |
| position | String | flexible (no enum restriction) |
| joinedAt | Date | |
| Index | compound | { roomId, userId } UNIQUE |

### Message
| Field | Type | Note |
|-------|------|------|
| roomId | ObjectId → Room | |
| senderId | ObjectId → User | |
| text | String | |
| attachmentIds | [ObjectId → Attachment] | |
| createdAt | Date | |

### Attachment
| Field | Type | Note |
|-------|------|------|
| roomId, userId | ObjectId | |
| url, type, size, mimetype | Mixed | IMAGE / VIDEO |

---

## 7. API Endpoints

### Auth — `POST /api/auth`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | /register | — | Đăng ký (username, email, password) |
| POST | /login | — | Đăng nhập → JWT token |
| POST | /guest | — | Tạo guest session |
| GET | /me | Required | Lấy user hiện tại |
| POST | /convert | Required | Guest → registered |

### Rooms — `/api/rooms`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | / | — | List phòng (filter: game, mode, status) |
| POST | / | Registered | Tạo phòng (1 phòng/user) |
| GET | /:id | — | Chi tiết phòng |
| PATCH | /:id | Registered | Sửa phòng (owner) |
| DELETE | /:id | Registered | Xóa phòng (owner) |
| POST | /:id/join | Registered | Vào phòng (atomic, idempotent) |
| POST | /:id/leave | Registered | Rời phòng |
| POST | /:id/kick | Registered | Kick thành viên (owner) |
| GET | /:id/members | — | Danh sách thành viên |
| GET | /my-active | Registered | Phòng đang tham gia |

### Messages — `/api/messages`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | /:roomId | — | Lịch sử chat |
| POST | / | Required | Gửi tin nhắn |
| DELETE | /:messageId | Required | Xóa tin nhắn |

### Upload — `/api`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | /upload | Required | Upload file (max 50MB) |
| DELETE | /attachments/:id | Required | Xóa attachment |
| GET | /attachments/room/:roomId | — | Attachments của phòng |

### Matchmaking — `/api/matchmaking`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | /start | Required | Vào hàng chờ |
| POST | /stop | Required | Rời hàng chờ |
| GET | /status | Required | Trạng thái queue |

### LiveKit — `/api/livekit`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | /token | Required | Tạo LiveKit access token |

### Health
| Method | Path | Mô tả |
|--------|------|-------|
| GET | /health | `{ status, db }` |

---

## 8. Socket.io Events

### Room & Lobby
| Direction | Event | Payload | Mô tả |
|-----------|-------|---------|-------|
| C→S | `room:join-lobby` | `{game, mode}` | Vào lobby channel |
| C→S | `room:leave-lobby` | — | Rời lobby |
| C→S | `room:join` | `{roomId}` | Vào room channel |
| C→S | `room:leave` | `{roomId}` | Rời room channel |
| S→C | `room:created` | room | Phòng mới (broadcast lobby) |
| S→C | `room:updated` | room | Phòng thay đổi |
| S→C | `room:deleted` | `{roomId}` | Phòng bị xóa |
| S→C | `room:member-joined` | `{roomId, member}` | Thành viên vào |
| S→C | `room:member-left` | `{roomId, userId}` | Thành viên rời |

### Voice (Server-managed state)
| Direction | Event | Payload | Mô tả |
|-----------|-------|---------|-------|
| C→S | `voice:join` | `{roomId, userId, name, muted}` | Tham gia voice |
| C→S | `voice:leave` | `{roomId, userId}` | Rời voice |
| C→S | `voice:state` | `{roomId, userId, muted, speaking}` | Cập nhật trạng thái |
| C→S | `voice:get-members` | `{roomId}` | Yêu cầu danh sách |
| S→C | `voice:members` | `{roomId, members[]}` | Full member list (single source of truth) |
| S→C | `voice:state` | state object | State update từ user khác |

### Chat
| Direction | Event | Payload | Mô tả |
|-----------|-------|---------|-------|
| C→S | `chat:message` | `{roomId, text}` | Gửi tin nhắn (rate limit 1/s) |
| S→C | `chat:message` | message object | Tin nhắn mới |

### Matchmaking
| Direction | Event | Payload | Mô tả |
|-----------|-------|---------|-------|
| C→S | `finding:start` | `{mode, rank}` | Vào queue |
| C→S | `finding:stop` | — | Rời queue |
| S→C | `finding:queued` | `{position, total}` | Đã vào hàng chờ |
| S→C | `finding:match-found` | `{room}` | Ghép trận xong |
| S→C | `finding:stopped` | — | Đã rời queue |

---

## 9. LiveKit Integration

### Voice Chat
- **RoomAudioRenderer** tự động subscribe remote audio tracks
- **Mute/Unmute**: `track.mute()/unmute()` (giữ track published, phản hồi nhanh)
- **PTT (Push-to-Talk)**: Nhấn giữ phím V → unmute, thả → mute
- **Noise Suppression**: Krisp-based (LiveKit built-in)
- **Speaking Detection**: `localParticipant.isSpeaking` polling 100ms → viền sáng
- **Per-user Volume**: Web Audio API GainNode (0-200%)
- **Mic Gain**: Input gain slider
- **Audio Config**: 48kHz, 64kbps, DTX enabled, RED encoding

### Video Call
- **Camera**: VP8, max 2560x1440, 3Mbps
- **Toggle**: Bật/tắt camera từ Voice Connected panel

### Screen Share
- **Manual getDisplayMedia**: hỗ trợ chia sẻ audio (Chrome Tab sharing)
- **Encoding**: 1920x1080, 30fps, 2Mbps max
- **Resizable**: Kéo thả để phóng to/thu nhỏ vùng video
- **Per-track hide/show**: Mỗi user có thể ẩn/hiện từng track

### Token Flow
```
Client → POST /api/livekit/token {roomId, participantName}
Server → LiveKit AccessToken (4h TTL, full permissions)
Client → Connect to LiveKit Cloud via token
```

---

## 10. Redis Structure

```
queue:{mode}                Sorted Set    userId → timestamp (matchmaking FIFO)
user:{userId}               Hash          {socketId, mode, rank, timestamp}
online:{userId}             String        status (TTL 5 min)
rate:{userId}:{timestamp}   Counter       sliding window 1/s
```

Redis adapter: `redisPub` + `redisSub` cho Socket.io multi-instance broadcast.

---

## 11. Authentication Flow

```
Guest Access:
  POST /auth/guest → guestId + JWT → localStorage
  Axios header: X-Guest-Id

Registered User:
  POST /auth/register hoặc /login → JWT → localStorage
  Axios header: Authorization: Bearer <token>

Middleware:
  authMiddleware    → parse token/guestId → req.user
  requireAuth       → reject nếu không có auth
  requireRegistered → reject guest (chỉ registered users)

Guest → Registered:
  POST /auth/convert {guestId, username, email, password}
```

---

## 12. Local Development

### Với Docker
```bash
# Clone repo
git clone <repo-url>
cd gamefinder

# Khởi động tất cả services
docker-compose up -d

# Frontend: http://localhost:3000
# API:      http://localhost:4000
# Health:   http://localhost:4000/health
```

### Không Docker
```bash
# Cài dependencies
npm run install:all

# Terminal 1 — Backend
cd server
cp .env.example .env       # Điền env vars
npm run dev                 # http://localhost:4000

# Terminal 2 — Frontend
cd client
cp .env.example .env        # VITE_API_URL=http://localhost:4000
npm run dev                 # http://localhost:5173
```

### Truy cập LAN (test mobile)
- Vite đã bật `host: true` → truy cập qua IP LAN (VD: `http://192.168.1.x:5173`)
- Thêm IP LAN vào `ALLOWED_ORIGIN` trong server `.env`
- Mobile cần HTTPS cho mic access (giới hạn trình duyệt)

### Seed data
```bash
npm run seed
# hoặc
node scripts/seedDb.js
```

---

## 13. Environment Variables

### Server (`server/.env`)
```env
MONGO_URI=mongodb://root:password@localhost:27017/gamematch?authSource=admin
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-jwt-secret-min-32-characters-change-me-later
JWT_EXPIRY=7d
NODE_ENV=development
PORT=4000
LOG_LEVEL=dev
ALLOWED_ORIGIN=http://localhost:3000,http://localhost:5173
MAX_FILE_SIZE_MB=50
UPLOAD_DIR=./uploads
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

### Client (`client/.env`)
```env
VITE_API_URL=http://localhost:4000
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
```

**Lưu ý:** KHÔNG commit file `.env` — chỉ commit `.env.example`.

---

## 14. Production Deployment

### Backend → Render
1. Web Service, Root Directory: `server`
2. Build: `npm install` | Start: `node server.js`
3. Env vars: `NODE_ENV=production`, MongoDB Atlas URI, Upstash Redis URL, LiveKit credentials

### Frontend → Vercel
1. Root Directory: `client`, Framework: Vite
2. Env vars: `VITE_API_URL`, `VITE_LIVEKIT_URL`

### External Services
- **MongoDB Atlas**: IP whitelist `0.0.0.0/0` cho Render
- **Upstash Redis**: URL dạng `rediss://` (TLS)
- **LiveKit Cloud**: Tạo project tại livekit.io, lấy API Key/Secret

---

## 15. RoomView — Giao diện Discord-style

```
┌─────────────────────────────────────────────────────┐
│  LEFT SIDEBAR (240px)  │   CENTER COLUMN   │ RIGHT SIDEBAR (240px) │
│                        │                   │                       │
│  Voice Channel         │   Video Area      │   Members List        │
│  ┌──────────────────┐  │   (resizable)     │   ┌─────────────────┐ │
│  │ User1 🎤         │  │   ┌───────────┐   │   │ Owner ★         │ │
│  │ User2 🔇         │  │   │ Screen    │   │   │ Member1         │ │
│  │ User3 🎤 (glow)  │  │   │ Share     │   │   │ Member2         │ │
│  └──────────────────┘  │   └───────────┘   │   │ ...             │ │
│                        │                   │   └─────────────────┘ │
│  Controls:             │   Chat Messages   │                       │
│  [Mute] [PTT] [NS]    │   (Discord-style)  │                       │
│  [Camera] [Share]      │   ┌───────────┐   │                       │
│  [Volume] [Gain]       │   │ avatar+msg│   │                       │
│                        │   └───────────┘   │                       │
│                        │   [Input ______]  │                       │
└─────────────────────────────────────────────────────┘
```

---
