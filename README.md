# TaskCircle

TaskCircle is a production-ready full-stack monorepo for collaborative circles, task assignment, and notification reminders.

## Features
- Google OAuth 2.0 only authentication (no passwords/JWT)
- Redis-backed server sessions with secure HTTP-only cookies
- Circles with `PUBLIC` / `PRIVATE` privacy and 8-character join code
- Circle roles: `ADMIN`, `MODERATOR`, `MEMBER`
- Private circle join requests: `PENDING`, `APPROVED`, `REJECTED`
- Task CRUD with statuses `TODO`, `IN_PROGRESS`, `COMPLETED`
- Task priorities `LOW`, `MEDIUM`, `HIGH`
- Assign-to-all (transactional one task per active member + `NEW_TASK` notification)
- Notifications: `NEW_TASK`, `DUE_TODAY`, `DUE_TOMORROW`, `OVERDUE`
- Notification preferences per user
- Scheduler at 09:00 and 17:00 Asia/Kolkata with duplicate prevention

## Architecture
- `frontend/`: React + Vite + React Router + native fetch (`credentials: include`) + plain CSS
- `backend/`: Node.js + Express (ES modules), pg Pool, PostgreSQL, Redis sessions, Passport Google OAuth, node-cron

## Tech Stack
- Frontend: React, Vite, React Router, JavaScript/JSX, CSS
- Backend: Node.js, Express, pg, redis, express-session, connect-redis, passport-google-oauth20, helmet, cors, express-rate-limit, express-validator, node-cron
- Database: PostgreSQL (Neon-compatible)
- Session Store: Redis (managed Redis compatible)
- Containers: Docker + docker-compose

## Folder Structure
```
TaskCircle/
  backend/
    migrations/
    src/
  frontend/
    src/
  .env.example
  .gitignore
  docker-compose.yml
```

## Prerequisites
- Node.js 20+
- npm 10+
- PostgreSQL (or Neon)
- Redis
- Google Cloud OAuth credentials

## Environment Variables
Root `.env.example` includes backend variables:
- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `FRONTEND_URL`

Frontend variable (in `frontend/.env`):
- `VITE_API_URL` (example: `http://localhost:5000`)

## Local Setup
1. Copy env values:
   - root: `.env.example` -> set backend values in environment (or shell)
   - `frontend/.env`: set `VITE_API_URL=http://localhost:5000`
2. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. Run migrations:
   ```bash
   cd backend
   npm run migrate
   ```
4. Start apps:
   ```bash
   # terminal 1
   cd backend
   npm run dev

   # terminal 2
   cd frontend
   npm run dev
   ```

## Google OAuth Setup
In Google Cloud Console:
1. Create OAuth 2.0 Client (Web application)
2. Authorized JavaScript origins:
   - `http://localhost:5173`
   - Render frontend URL (for production)
3. Authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
   - Render backend URL + `/api/auth/google/callback`
4. Set:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_CALLBACK_URL`

## Database + Migrations
- Schema is under `backend/migrations/001_init.sql`
- Runner command:
  ```bash
  cd backend
  npm run migrate
  ```
- Uses pg Pool and production SSL when `NODE_ENV=production` or Neon host detected.

## Docker
### Local docker-compose
```bash
docker compose up --build
```
Services:
- frontend: `http://localhost:5173`
- backend: `http://localhost:5000`
- postgres: `localhost:5432`
- redis: `localhost:6379`

### Production Dockerfiles
- `backend/Dockerfile`: Node production image (`npm start`, listens on Render `PORT`, `0.0.0.0`)
- `frontend/Dockerfile`: multi-stage Vite build + Nginx runtime
- SPA fallback configured by `try_files $uri $uri/ /index.html`

## Render Deployment
Render production should use:
- Neon PostgreSQL for `DATABASE_URL`
- Managed Redis for `REDIS_URL`
- Backend service env vars from root `.env.example`
- Frontend build arg/env `VITE_API_URL` pointing to backend public URL

## API Overview
- Health: `GET /health`
- Auth: `/api/auth/google`, `/api/auth/google/callback`, `/api/auth/me`, `/api/auth/logout`
- Profile: `GET/PATCH /api/profile`, `GET/PATCH /api/profile/notification-preferences`
- Circles: `/api/circles`, `/api/circles/join`, `/api/circles/:circleId`, members, join-requests, tasks, assign-all
- Tasks: `/api/tasks` and `/api/tasks/:taskId`
- My tasks: `/api/my-tasks`
- Notifications: `/api/notifications`, `/api/notifications/unread-count`, mark read endpoints

Responses are consistent:
- success: `{ success: true, message, data }`
- error: `{ success: false, message }`

## Authentication + Session Model
- Server-side Google OAuth identity verification and user upsert
- Session stored in Redis
- Cookie `taskcircle.sid` with `httpOnly`, secure in production, sameSite configured by environment
- No JWTs or browser storage auth tokens

## Scheduler
- `node-cron` schedule: `0 9,17 * * *` timezone `Asia/Kolkata`
- Generates due/overdue reminders respecting user preferences
- Deduplicated by unique index on reminder notifications

## Security
- Helmet headers
- CORS with credentials and configured frontend origin
- Rate limiting on API
- Parameterized SQL via pg
- Centralized error handling and input validation

## Troubleshooting
- **OAuth redirect mismatch**: verify callback URL exactly matches `GOOGLE_CALLBACK_URL` and Google Console redirect URI.
- **CORS/cookie issues**: ensure `FRONTEND_URL` and `VITE_API_URL` are correct; production requires HTTPS and secure cookies.
- **Redis/Postgres connection failures**: verify `REDIS_URL` / `DATABASE_URL` and network allow-lists.
- **Render port issues**: backend binds to `0.0.0.0` and uses `PORT` env.
- **SPA refresh 404**: Nginx uses React Router fallback (`try_files ... /index.html`).
- **Docker startup errors**: run migrations and verify env values are set.

## Integration Testing Limitation
Real end-to-end OAuth and managed cloud integrations require valid external Google/Neon/Redis credentials, which are not available in this sandbox.
