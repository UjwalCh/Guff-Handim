# Guff Handim 🔒

A private, end-to-end encrypted messaging app inspired by WhatsApp — built with React, Node.js, Socket.IO, and MySQL.

## Features

| Feature | Status |
|---------|--------|
| End-to-end encryption (X25519 + XSalsa20-Poly1305) | ✅ |
| Phone OTP authentication | ✅ |
| Real-time messaging (Socket.IO) | ✅ |
| Group chats with E2EE | ✅ |
| File, photo & video sharing | ✅ |
| Voice & video calls (WebRTC) | ✅ |
| Read receipts & typing indicators | ✅ |
| Message reactions & replies | ✅ |
| Disappearing messages | ✅ |
| Status / Stories (24h) | ✅ |
| User blocking & reporting | ✅ |
| Push token registration (ready for FCM/APNs) | ✅ |
| JWT + refresh token rotation | ✅ |
| Rate limiting, Helmet.js, CORS | ✅ |
| Super Admin panel (web) | ✅ |
| Reports queue, moderation, bans, audit logs | ✅ |
| Broadcast, OTP monitoring, privacy tools | ✅ |

## Security Architecture

```
Client A                    Server                     Client B
   │                           │                           │
   │  keygen (X25519)          │                           │
   │  pubKey → store           │     pubKey → store        │
   │                           │                           │
   │  fetch B's public key ──► │                           │
   │                           │                           │
   │  encrypt(msg, B.pub, A.sk)│                           │
   │─────── ciphertext ───────►│──────── ciphertext ──────►│
   │                           │  (stored encrypted)       │ decrypt(cipher, A.pub, B.sk)
   │                           │                           │ ✓ plaintext
```

- Server **never** sees plaintext messages
- Keys generated client-side using [TweetNaCl.js](https://tweetnacl.js.org)
- Refresh tokens are SHA-256 hashed before DB storage
- OTPs are bcrypt-hashed; invalidated after use
- All uploads validated by MIME type whitelist

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, React Query |
| Encryption | TweetNaCl.js (nacl.box + nacl.secretbox) |
| Realtime | Socket.IO |
| Voice/Video | WebRTC (simple-peer) |
| Backend | Node.js, Express |
| Database | MySQL + Sequelize ORM |
| Auth | Phone OTP (Twilio) + JWT |
| Files | Multer + Sharp (thumbnails) |

## Project Structure

```
ChatApp/
├── backend/
│   ├── src/
│   │   ├── app.js          — Express server entry
│   │   ├── config/         — Database config
│   │   ├── models/         — Sequelize models (User, Chat, Message, …)
│   │   ├── middleware/      — Auth, rate-limit, upload, validation
│   │   ├── controllers/     — Business logic
│   │   ├── routes/          — API routes
│   │   ├── socket/          — Socket.IO handlers + WebRTC signaling
│   │   └── utils/           — JWT, OTP, helpers, logger
│   └── uploads/             — Uploaded files (images, videos, docs)
└── frontend/
    └── web/
        └── src/
            ├── utils/encryption.js  — Client-side E2EE (TweetNaCl)
            ├── store/               — Zustand state (auth, chat, call)
            ├── hooks/               — useSocket, useWebRTC
            ├── components/          — Chat, Auth, Group, Call, Status, Media
            └── pages/               — LoginPage, ChatPage, StatusPage, SettingsPage
```

## Setup

### Prerequisites
- Node.js 18+

### 1. Local Database (default)

No separate DB install is required for local setup.

By default, `.env` uses SQLite:

```env
DB_DIALECT=sqlite
SQLITE_STORAGE=./dev.sqlite
```

If you prefer MySQL, change `DB_DIALECT=mysql` and fill MySQL credentials.

For persistent cloud deployments (recommended), use Postgres:

```env
DB_DIALECT=postgres
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME
DB_SSL=true
```

`DB_SSL=true` is typically required for hosted Postgres providers.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your secrets (JWT, admin bootstrap credentials)
npm run dev
```

The backend runs on **http://localhost:3001**. Tables are auto-created on first start.

### 3. Frontend

```bash
cd frontend/web
npm install
npm run dev
```

The frontend runs on **http://localhost:5173**.

### 4. Admin Panel

Admin login page:

```text
http://localhost:5173/admin/login
```

Default local admin bootstrap values (change immediately in production):

```env
ADMIN_USERNAME=owner
ADMIN_PASSWORD=ChangeMe!12345
ADMIN_PHONE=+10000000000
```

Admin panel includes:

- Dashboard analytics
- User management (suspend/restore/verify)
- Reports queue workflow
- Chat/message/file moderation tools
- Broadcast announcements
- OTP abuse monitoring
- System settings and feature toggles
- Ban/blocklist management (phone/IP/device)
- Audit logs
- Privacy export/delete tools
- Session/device revocation

### 5. Environment Variables (backend/.env)

```
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

DB_DIALECT=sqlite
SQLITE_STORAGE=./dev.sqlite

# Postgres (recommended for production persistence)
# DB_DIALECT=postgres
# DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME
# DB_SSL=true

DB_HOST=localhost
DB_PORT=3306
DB_NAME=securechat
DB_USER=root
DB_PASSWORD=yourpassword

JWT_SECRET=<64+ char random string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=5

# Optional — leave blank in dev to print OTP to console
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

> **Dev tip:** If Twilio is not configured, OTPs are printed to the backend console.

## API Overview

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/send-otp | Send OTP to phone |
| POST | /api/auth/verify-otp | Verify OTP, get tokens |
| PUT  | /api/auth/setup-profile | Set name, avatar, public key |
| POST | /api/auth/refresh-token | Rotate refresh token |
| POST | /api/auth/logout | Revoke session |
| GET  | /api/users/search | Search users |
| GET  | /api/chats | Get all chats |
| POST | /api/chats | Create/get direct chat |
| GET  | /api/chats/:id/messages | Get messages (paginated) |
| POST | /api/chats/:id/messages | Send message |
| POST | /api/groups | Create group |
| POST | /api/files/upload | Upload file |
| GET  | /api/statuses | Get status updates |
| POST | /api/statuses | Create status |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| new-message | Server→Client | New encrypted message |
| typing | Both | Typing indicator |
| user-online/offline | Server→Client | Presence updates |
| messages-read | Server→Client | Read receipts |
| reaction-update | Server→Client | Emoji reaction changed |
| webrtc-offer/answer/ice | Both | WebRTC call signaling |
| added-to-group | Server→Client | Added to group notification |

## React Native (Mobile)

The backend is fully compatible with a React Native mobile app. To build mobile:

1. Create a React Native project in `frontend/mobile/`
2. Use the same backend API (`BACKEND_URL` instead of proxy)
3. Replace `socket.io-client` with the React Native compatible build
4. Replace `simple-peer` with `react-native-webrtc`
5. Store keys in `react-native-keychain` instead of localStorage

## Production Checklist

- [ ] Enable HTTPS (TLS) — required for WebRTC
- [ ] Set `NODE_ENV=production`
- [ ] Configure Twilio for real SMS OTP
- [ ] Use `sequelize.sync({ force: false })` (migrations in prod)
- [ ] Set strong `JWT_SECRET` and `COOKIE_SECRET`
- [ ] Configure S3 or similar for file storage
- [ ] Set up TURN server for WebRTC (STUN only fails behind strict NATs)
- [ ] Add proper logging and monitoring
- [ ] Configure push notifications (FCM/APNs)

## License

MIT
