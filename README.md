# GameMatch - MERN Stack Platform

A full-stack game matching and team coordination platform built with MERN (MongoDB, Express, React, Node.js).

## Phase A: Project Scaffold + Core REST API

This phase includes:
- MongoDB setup with Mongoose schemas
- Express.js backend with layered architecture (Controller → Service → Repository)
- User authentication (JWT + guest sessions)
- Room management (CRUD, join/leave, member management)
- Chat messaging system
- File uploads (images/videos via Multer)
- Matchmaking queue (in-memory for Phase A)
- Docker Compose orchestration

## Project Structure

```
/gamematch/
├── server/                    # Node.js backend
│   ├── apps/
│   │   ├── Entity/           # Mongoose schemas
│   │   ├── Repository/       # Database queries
│   │   ├── Services/         # Business logic
│   │   ├── controllers/      # Route handlers
│   │   └── Database/         # Connection setup
│   ├── Util/                 # Middleware & utilities
│   ├── redis/                # [REDIS_PLACEHOLDER] Phase C
│   ├── mediasoup/            # [MEDIASOUP_PLACEHOLDER] Phase D
│   ├── uploads/              # Uploaded files
│   └── package.json
│
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── pages/            # Route pages
│   │   ├── hooks/            # Custom hooks
│   │   └── lib/              # Utilities
│   └── package.json
│
├── infra/
│   ├── nginx/                # Reverse proxy config
│   └── coturn/               # [MEDIASOUP_PLACEHOLDER] TURN server
│
├── scripts/
│   └── seedDb.js             # Database seeding
│
└── docker-compose.yml        # Orchestration
```

## Architecture

### Layered Architecture
```
HTTP Request
    ↓
Controller (thin: parse → call service → format response)
    ↓
Service (business logic, validation)
    ↓
Repository (database queries only)
    ↓
Entity/Model (Mongoose schema)
    ↓
MongoDB
```

## Setup & Run

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- MongoDB (via Docker)

### Quick Start

```bash
# 1. Clone/setup project
cd gamematch

# 2. Copy environment file
cp .env.example .env

# 3. Start services
docker-compose up -d

# 4. Seed database
docker exec gamematch-api npm run seed

# 5. Access application
# Frontend: http://localhost
# API: http://localhost:4000
# Health check: http://localhost:4000/health
```

### Local Development (without Docker)

```bash
# Backend
cd server
npm install
MONGO_URI=mongodb://localhost:27017/gamematch npm start

# Frontend (in another terminal)
cd client
npm install
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/guest` - Create guest session
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/convert` - Convert guest to registered user

### Rooms
- `GET /api/rooms` - List rooms (filters: mode, status)
- `POST /api/rooms` - Create room
- `GET /api/rooms/:id` - Get room detail
- `PATCH /api/rooms/:id` - Update room
- `DELETE /api/rooms/:id` - Delete room
- `POST /api/rooms/:id/join` - Join room
- `POST /api/rooms/:id/leave` - Leave room
- `POST /api/rooms/:id/kick` - Kick member
- `GET /api/rooms/:id/members` - List room members

### Messages
- `GET /api/messages/:roomId` - Get room messages
- `POST /api/messages` - Send message
- `DELETE /api/messages/:messageId` - Delete message

### Uploads
- `POST /api/upload` - Upload file
- `DELETE /api/attachments/:attachmentId` - Delete attachment
- `GET /api/attachments/room/:roomId` - Get room attachments

### Matchmaking
- `POST /api/matchmaking/start` - Enter queue
- `POST /api/matchmaking/stop` - Leave queue
- `GET /api/matchmaking/status` - Get personal queue status
- `GET /api/matchmaking/status-all` - Get global queue stats

### Health
- `GET /health` - Health check

## Phase Roadmap

### Phase A (Current)
✅ MongoDB + Mongoose setup
✅ Layered architecture (Controller → Service → Repository)
✅ JWT authentication + guest sessions
✅ Room CRUD + member management
✅ Chat messaging (polling-based)
✅ File uploads
✅ Matchmaking queue (in-memory)
✅ Seed data
✅ Docker Compose

### Phase B (Next)
- Socket.io real-time events
- Live chat and room updates
- Member join/leave notifications
- Matchmaking match notifications

### Phase C (Future)
- Redis integration
- Socket.io Redis adapter
- Matchmaking queue in Redis
- Online presence tracking
- Rate limiting & caching

### Phase D (Future)
- Mediasoup WebRTC/SFU
- Voice/video streaming
- TURN server integration
- Screen sharing
- Recording

## Placeholder Tags

Search for integration points in the codebase:

```bash
# Redis integration points (Phase C)
grep -r "[REDIS_PLACEHOLDER]" server/

# Mediasoup integration points (Phase D)
grep -r "[MEDIASOUP_PLACEHOLDER]" server/
```

## Tech Stack

- **Runtime**: Node.js 18+
- **Backend**: Express.js
- **Database**: MongoDB 6+ (Mongoose)
- **Frontend**: React 18 + Vite
- **HTTP Client**: Axios
- **Auth**: JWT (jsonwebtoken)
- **File Upload**: Multer
- **Validation**: express-validator
- **Logging**: Morgan
- **Container**: Docker & Docker Compose
- **Reverse Proxy**: Nginx

## Code Quality

- **Linting**: ESLint (eslint:recommended)
- **Formatting**: Prettier (singleQuote, semi, printWidth: 100)
- **Error Handling**: Global middleware + try/catch in services

## Acceptance Criteria (Phase A)

✅ `docker-compose up` starts all services
✅ Health check returns `{ status: "ok", db: "connected" }`
✅ Can register and receive JWT
✅ Can create guest session
✅ Can create/list/join rooms
✅ Concurrent join requests prevent duplicate members
✅ Can send/retrieve chat messages
✅ Can upload images (50MB limit)
✅ React app loads at http://localhost
✅ Database seeding works
✅ [REDIS_PLACEHOLDER] and [MEDIASOUP_PLACEHOLDER] comments present
✅ redis/ and mediasoup/ folders with PLACEHOLDER.md exist

## Notes

- **No Socket.io yet** - Phase B will add real-time events
- **No Redis** - Phase C will integrate Redis for caching & queues
- **No Mediasoup** - Phase D will add WebRTC/video streaming
- **Matchmaking is in-memory** - Will move to Redis in Phase C
- **Chat polling-based** - Will use Socket.io in Phase B

## Support

For issues or questions, refer to the specification documents or architecture guidelines.
