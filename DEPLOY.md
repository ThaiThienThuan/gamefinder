# Deploy Guide — Render (backend) + Vercel (frontend)

Architecture: **Vercel (client)** → **Render (api + socket)** → **MongoDB Atlas** + **Upstash Redis** + **LiveKit Cloud** + **Cloudinary**.

---

## 1) MongoDB Atlas — reuse free cluster

Free tier cho tối đa 1 cluster. Tái sử dụng cluster hiện có, chỉ tạo DB mới tên riêng.

### Lấy connection URI
1. Vào https://cloud.mongodb.com → Cluster → **Connect** → **Drivers** → chọn Node.js.
2. Copy URI dạng: `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority`
3. Chèn tên DB mới (vd `gamematching`) vào trước `?`:
   ```
   mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/gamematching?retryWrites=true&w=majority
   ```
4. Network Access → **Add IP Address** → `0.0.0.0/0` (cho Render truy cập từ bất kỳ IP nào).

### Clear DB cũ (nếu muốn dùng lại DB tên cũ)
Trên Atlas UI → **Browse Collections** → chọn DB cũ → **Drop Database**. Xong, tạo lại DB tên mới bằng cách connect từ app (DB auto-tạo khi có write đầu tiên).

Hoặc dùng mongosh:
```bash
mongosh "<URI>"
> use ten_db_cu
> db.dropDatabase()
```

---

## 2) Upstash Redis (free)

1. https://console.upstash.com → **Create Database** → tên gì cũng được, region gần Render region (ví dụ `us-east-1`).
2. Scroll xuống **Connect to your database** → chọn **Node.js (ioredis)** → copy connection URL:
   ```
   rediss://default:<password>@<host>.upstash.io:6379
   ```

---

## 3) Cloudinary

Lấy creds từ https://console.cloudinary.com/console → Dashboard:

```
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

Giá trị thật đã lưu cục bộ trong `gamefinder/.env` (file này đã được `.gitignore`).

---

## 4) Render — backend (api + socket)

1. https://dashboard.render.com → **New +** → **Web Service**.
2. Connect GitHub repo. Root directory: `gamefinder/server` (nếu là monorepo).
3. **Build command**: `npm install`
4. **Start command**: `npm start`
5. **Environment** = Node.
6. **Instance type**: Free (đủ test).
7. **Environment variables** — paste từng cái:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `4000` |
   | `MONGO_URI` | `mongodb+srv://.../gamematching?...` |
   | `REDIS_URL` | `rediss://default:xxx@xxx.upstash.io:6379` |
   | `JWT_SECRET` | random 64 chars (vd `openssl rand -hex 32`) |
   | `ALLOWED_ORIGIN` | `https://<your-vercel-domain>.vercel.app` (cập nhật sau khi deploy Vercel) |
   | `CLOUDINARY_CLOUD_NAME` | (từ Cloudinary dashboard) |
   | `CLOUDINARY_API_KEY` | (từ Cloudinary dashboard) |
   | `CLOUDINARY_API_SECRET` | (từ Cloudinary dashboard) |
   | `LIVEKIT_URL` | `wss://<your>.livekit.cloud` |
   | `LIVEKIT_API_KEY` | (từ LiveKit dashboard) |
   | `LIVEKIT_API_SECRET` | (từ LiveKit dashboard) |
   | `RIOT_API_KEY` | `RGAPI-...` (dev key, 24h expiry) |
   | `GOOGLE_CLIENT_ID` | (nếu dùng Google OAuth) |
   | `GOOGLE_CLIENT_SECRET` | |
   | `GOOGLE_CALLBACK_URL` | `https://<render-backend>.onrender.com/api/auth/google/callback` |
   | `SESSION_SECRET` | random 32 chars |

8. Deploy → lấy URL dạng `https://gamematching-api.onrender.com`.

### Sau khi có URL backend
- Update `GOOGLE_CALLBACK_URL` env → redeploy.
- Vào Google Cloud Console → **Credentials** → thêm callback URL vào **Authorized redirect URIs**.
- Atlas: nếu chưa mở 0.0.0.0/0, lấy static outbound IP của Render từ settings và whitelist.

---

## 5) Vercel — frontend

1. https://vercel.com → **Add New Project** → import repo.
2. **Root Directory**: `gamefinder/client`
3. **Framework preset**: Vite (auto-detect).
4. **Build command**: `npm run build` (default).
5. **Output directory**: `dist` (default).
6. **Environment Variables**:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://gamematching-api.onrender.com` |
   | `VITE_SOCKET_URL` | `https://gamematching-api.onrender.com` |
   | `VITE_LIVEKIT_URL` | `wss://<your>.livekit.cloud` |

7. Deploy → lấy URL `https://<project>.vercel.app`.
8. **Quay lại Render** → update `ALLOWED_ORIGIN` = URL Vercel → Render auto-redeploy.

---

## 6) Verify sau deploy

- [ ] Truy cập Vercel URL → load được login page.
- [ ] Login Google hoạt động (nếu đã setup OAuth redirect).
- [ ] Tạo phòng → gửi tin nhắn text → 2 browser thấy realtime.
- [ ] Gửi ảnh trong chat → cả 2 browser load được (từ `res.cloudinary.com/...`).
- [ ] Voice chat: vào phòng, join voice → LiveKit kết nối.
- [ ] Tạo chatroom (game = "Chatroom") với tối đa 30 slots → persistent, không close khi owner offline.
- [ ] User khác join chatroom → toast "⏳ Đã gửi yêu cầu" → owner approve qua API:
  ```
  POST /api/rooms/:id/approve-join { "targetUserId": "..." }
  ```

---

## 7) Gotchas phổ biến

- **Render free tier sleep**: backend ngủ sau 15 phút idle → request đầu chờ 30-60s wake. Cho team biết.
- **CORS errors**: double-check `ALLOWED_ORIGIN` khớp chính xác URL Vercel (https, không trailing slash).
- **Socket.io CORS**: cùng `ALLOWED_ORIGIN` env (file `socket/index.js` dùng chung).
- **Mongo connection refused**: Atlas Network Access phải whitelist 0.0.0.0/0 hoặc IP Render.
- **Cloudinary upload 401**: env `CLOUDINARY_*` phải đủ 3 biến hoặc dùng `CLOUDINARY_URL` single var.
- **Socket.io trên Render**: Render free hỗ trợ WebSocket — nhưng nếu bị rớt, fallback long-polling vẫn chạy.
- **Bundle size Vercel**: nếu build timeout, chuyển `VITE_API_URL` đúng rồi redeploy.

---

## 8) Env file samples

### `gamefinder/server/.env` (local reference — KHÔNG commit)
```
NODE_ENV=development
PORT=4000
MONGO_URI=mongodb+srv://.../gamematching?...
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379
JWT_SECRET=<64-hex>
ALLOWED_ORIGIN=http://localhost:3000
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
LIVEKIT_URL=wss://...livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
RIOT_API_KEY=RGAPI-...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
SESSION_SECRET=<32-hex>
```

### `gamefinder/client/.env`
```
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
VITE_LIVEKIT_URL=wss://...livekit.cloud
```
