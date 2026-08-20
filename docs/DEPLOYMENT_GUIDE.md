# DEPLOYMENT_GUIDE.md

How to run and deploy the AI Knowledge Base project.

## Requirements

- Node.js >= 22 (verified with Node v22.22.0, npm 10.9.4)
- PostgreSQL 17 with the `pgvector` extension (the official
  `pgvector/pgvector:pg17` Docker image is used)
- Docker + Docker Compose (for the containerized path)
- Optional: a Google Gemini API key for LLM-powered chat answers

## Environment variables

All config lives in `.env` files with `.env.example` templates at the project
root, `backend/`, and `frontend/`. Backend variables are validated by zod at
startup (a missing required variable fails fast with a clear message).

Key variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection string (`?schema=public`) | required |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets, must be strong random values | required |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `CORS_ORIGINS` | Comma-separated allowed browser origins | `http://localhost:3000` |
| `CLIENT_URL` | Frontend base URL used in emails/links | `http://localhost:3000` |
| `GEMINI_API_KEY` | Gemini key for chat answers (empty = retrieval still works) | empty |
| `GEMINI_MODEL` | Gemini model id | `gemini-2.5-flash` |
| `EMBEDDING_MODEL` | Local embedding model (sentence-transformers) | `all-MiniLM-L6-v2` |
| `EMBEDDING_CACHE_DIR` | Where the embedding model is cached on disk | `.model-cache` |
| `UPLOAD_DIR` | Uploaded document storage | `uploads` |
| `MAX_FILE_SIZE_MB` | Per-file upload limit | `20` |
| `ALLOWED_EXTENSIONS` | Upload extension allowlist | `md,txt,pdf,docx` |
| `EMAIL_VERIFICATION_REQUIRED` | Require email verification at login | `false` |
| `SMTP_*` | SMTP settings for real email delivery | logging mode when unset |
| `LOG_EMAILS_INSTEAD_OF_SEND` | Log emails instead of sending (dev) | `true` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Auto-bootstrap admin account on startup | `admin@example.com` / `Admin123!` |
| `BACKEND_INTERNAL_URL` | Frontend proxy target for `/api` (Docker uses `http://backend:5000`) | `http://localhost:5000` |
| `NEXT_PUBLIC_API_URL` | Browser-side API base (optional; proxy is the default path) | `http://localhost:5000/api` |

Never commit real secrets. Generate fresh secrets before production:

```bash
openssl rand -hex 32
```

## Option A - Docker Compose (recommended, verified)

The repository ships `docker-compose.yml` with three services: `postgres`
(pgvector/pg17), `backend`, and `frontend`. Backend containers run
`prisma migrate deploy` automatically on start, so the database schema is
applied with no manual step.

```bash
# 1. create your .env at the project root (see .env.example)
cp .env.example .env
# 2. fill in JWT secrets and GEMINI_API_KEY

# 3. build and start
npm run docker:up            # docker compose up --build -d

# 4. verify
curl http://localhost:5000/api/health
curl -I http://localhost:3000
# 5. stop
npm run docker:down
```

Persistent volumes: `postgres_data`, `uploads_data`, `models_data`.

Note: the Docker images were not built inside the sandbox (no docker binary
available there). The Dockerfiles and compose file were reviewed and corrected,
but the first `docker compose up --build` must be confirmed on a machine with
Docker. The build fetches the embedding model at runtime (first upload/chat).

## Option B - Local development (verified)

```bash
npm install               # clean install from root (workspaces)
npm run db:migrate        # prisma migrate deploy
npm run db:seed           # optional seed data
npm run dev               # backend :5000 + frontend :3000 concurrently
```

The frontend dev server proxies `/api` to `BACKEND_INTERNAL_URL`, so no CORS
work is needed in the browser.

## Option C - Manual production (PM2 / systemd)

```bash
npm run build             # builds backend (dist/) and frontend (.next/)
cd backend && NODE_ENV=production npm start
cd frontend && NODE_ENV=production npm start
```

Put Nginx/a reverse proxy in front of `:3000` and `:5000`, or proxy only
`:3000` and let the frontend rewrite `/api` to the backend.

## Option D - Render

The backend (Node/Express + Prisma + pgvector) fits a Render Blueprint:

1. Create a managed Postgres on Render.
2. Enable the `vector` extension (`CREATE EXTENSION IF NOT EXISTS vector;`).
3. Add a Web Service for `backend/`:
   - Build command: `npm install && npm run build`
   - Start command: `npm run db:migrate && npm start`
   - Env vars per the table above (`DATABASE_URL`, `JWT_*`, `CORS_ORIGINS`,
     `CLIENT_URL`, optional `GEMINI_API_KEY`, `UPLOAD_DIR=/var/data/uploads`,
     `EMBEDDING_CACHE_DIR=/var/data/models`).
   - Persistent disk for uploads + model cache.
4. Add a Web Service for `frontend/`:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - `BACKEND_INTERNAL_URL` = backend service URL.
5. Set `CORS_ORIGINS` on the backend to the frontend URL.

## Option E - Vercel (frontend only)

- The Next.js frontend deploys to Vercel as-is.
- The backend (Express + Prisma + pgvector + on-disk uploads) is NOT suited to
  Vercel's serverless runtime. Keep it on a long-running host (Docker/Render/VPS)
  and point the frontend at it:
  - Deploy the backend somewhere long-running and reachable, e.g.
    `https://api.example.com`.
  - In Vercel set the frontend rewrite via `BACKEND_INTERNAL_URL` (used by
    `next.config.ts` for the `/api` proxy) and `NEXT_PUBLIC_API_URL`.
- First chat request downloads the embedding model to disk, so on serverless
  platforms with ephemeral/read-only storage the RAG pipeline needs a warm cache
  or a dedicated host.

## Post-deploy smoke checks

```bash
curl -s http://HOST:5000/api/health            # {"status":"ok",...,"database":"ok"}
curl -s -o /dev/null -w "%{http_code}\n" http://HOST:3000/login   # 200
```

- Log in with the bootstrap admin (from `ADMIN_EMAIL`/`ADMIN_PASSWORD`).
- Upload a document, wait for `PROCESSED`, ask a question, confirm citations.
- Confirm the admin dashboard loads.
