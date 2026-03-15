# Free Deployment Guide (Vercel + Render)

This setup keeps costs at $0 on free tiers.

## Architecture

- Frontend: Vercel (free)
- Backend API + Socket.IO: Render web service (free)
- Database: Free managed Postgres (recommended for persistent data)

## 1. Deploy Backend on Render

1. Push this repo to GitHub.
2. In Render, create a **Blueprint** from repo root using `render.yaml`.
3. Set secrets/env vars in Render for service `chatapp-backend`:
   - `JWT_SECRET`
   - `ADMIN_JWT_SECRET`
   - `COOKIE_SECRET`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `ADMIN_PHONE`
4. Optional for real SMS OTP:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
5. After first deploy, copy backend URL, e.g. `https://chatapp-backend.onrender.com`.

For persistent accounts/messages/admin data, use free Postgres (Neon/Supabase/Render Postgres) and set:
- `DB_DIALECT=postgres`
- `DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME`
- `DB_SSL=true`

If your provider does not require SSL, set `DB_SSL=false`.

## 2. Deploy Frontend on Vercel

1. Import repo to Vercel.
2. Set project root to `frontend/web`.
3. Add env vars:
   - `VITE_API_BASE_URL=https://<your-render-backend>/api`
   - `VITE_SOCKET_URL=https://<your-render-backend>`
4. Deploy.

## 3. Allow Frontend Origins in Backend

Set backend env var `FRONTEND_URLS` to a comma-separated list:

- `https://<your-vercel-domain>`
- `http://localhost:5173`

Example:

`FRONTEND_URLS=https://your-app.vercel.app,http://localhost:5173`

## 4. Test Checklist

1. Open frontend URL.
2. Signup/Login user.
3. Admin login with bootstrap account.
4. Real-time messaging works (Socket connection).
5. File upload + media preview works.
6. Admin role tabs load with no 403 for allowed actions.

## 5. Notes

- Free Render services sleep when idle; first request may take ~30-60s.
- SQLite with `/tmp` storage is ephemeral and can lose data after restarts/deploys.
- For production reliability and media heavy usage, move to paid plans.
