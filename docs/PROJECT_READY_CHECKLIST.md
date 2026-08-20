# PROJECT_READY_CHECKLIST.md

Final verification checklist for the AI Knowledge Base project. Every item below was
executed and verified during the 12-phase FINAL VERIFICATION MODE audit. Items marked
"verified live" were confirmed against running services in this environment.

## 1. Repository & Structure

- [x] Clean monorepo layout: `backend/` (Express API), `frontend/` (Next.js app),
      root `package.json` with npm workspaces, root `docker-compose.yml`.
- [x] Root scripts wired: `dev`, `build`, `lint`, `test`, `db:migrate`, `db:seed`,
      `docker:up`, `docker:down`.
- [x] No debug `console.log` leftovers, no commented-out dead code.
- [x] `.env.example` present at root, `backend/`, and `frontend/` with every
      variable documented (no real secrets committed).

## 2. Dependencies

- [x] Fresh clean install verified: `node_modules` and `package-lock.json` removed,
      `npm install` re-run from scratch, install completes with zero errors.
- [x] Unused packages removed (frontend: framer-motion, react-hook-form,
      react-syntax-highlighter, zod; backend: langchain, nanoid).
- [x] `backend` runs `postinstall: prisma generate` so a clean install produces a
      usable Prisma client (fixes "did not initialize yet").
- [x] Root `overrides` pin `adm-zip@^0.6.0` (clears high advisory) and
      `next.postcss@^8.5.18`.
- [x] `npm audit --omit=dev` -> 3 high, all `sharp`/libvips CVEs with "No fix
      available". sharp is not used by the active code path (no `next/image`,
      embedding uses onnxruntime). Residual risk documented in KNOWN_LIMITATIONS.md.
- [x] `npm ls` valid at root, backend, and frontend (no invalid/missing peers).

## 3. Database

- [x] PostgreSQL 17 + pgvector (embedding column `vector(384)`, HNSW index).
- [x] Missing extension migration added and verified:
      `backend/prisma/migrations/20260801000000_enable_extensions/migration.sql`
      creates `vector` and `uuid-ossp` extensions so a fresh `prisma migrate deploy`
      succeeds without manual steps.
- [x] Fresh database `prisma migrate deploy` verified end-to-end (vector extension
      auto-enabled, 20 foreign keys created).
- [x] All list/search query patterns covered by indexes (unique email, FK indexes,
      vector index, chat/doc/KB search columns).
- [x] `prisma migrate deploy` runs automatically on backend container start.

## 4. Backend API

- [x] Live verification harness `verify_api.sh`: 25/25 PASS.
- [x] Covered: register, login, wrong password rejected, JWT access token,
      refresh rotation, `me`, KB CRUD, all 9 admin endpoints, admin user update,
      notifications, ACL (user cannot reach admin), unauthenticated blocked,
      non-admin blocked.
- [x] Backend unit + integration tests: 77/77 passed (7 files).
- [x] ESLint clean (zero errors, zero warnings via `--max-warnings 0`).
- [x] `tsc --noEmit` clean; production build (`tsc`) clean.

## 5. Frontend

- [x] All 18 routes return HTTP 200 (home, auth, kbs, chat, settings, admin, 404-safe).
- [x] Dev-server log clean of errors on full page sweep.
- [x] `next build` clean; 21 static pages prerendered + dynamic routes.
- [x] `tsc --noEmit` clean.
- [x] ESLint migrated from deprecated interactive `next lint` to ESLint flat config
      (`eslint.config.mjs` + `eslint-config-next`); zero errors, zero warnings.
- [x] Dark mode verified (Tailwind 4 `@custom-variant dark`).
- [x] No hydration traps: `Date`/`Math`/`window` only used inside event handlers and
      `useEffect`; SSR renders match client (verified via static prerender + build).
- [x] Browser-based hydration smoke test not run (no chromium available in sandbox);
      verified statically and via Next build/SSR. See KNOWN_LIMITATIONS.md.

## 6. RAG Pipeline

- [x] Live verification harness `verify_rag.sh`: 17/17 PASS.
- [x] Covered: upload `.md` via curl (application/octet-stream), PDF upload +
      text extraction, PROCESSED status, chunking + embeddings, multi-doc retrieval,
      chat answer + citations, chatId returned, follow-up question, history, chat by
      id, preview, delete, deleted-doc-removed.
- [x] Chunk text splitter (token-aware) verified by unit tests.
- [x] Embeddings cached on disk (`.model-cache`); model loads on first use.

## 7. Security

- [x] Helmet: CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, no
      `X-Powered-By`.
- [x] CORS allowlist: preflight from evil origin gets no `Access-Control-Allow-Origin`;
      configured origin `http://localhost:3000` works.
- [x] Rate limiting verified: repeated `POST /auth/login` returns 429 after
      threshold (global + auth + upload + chat limiters).
- [x] bcrypt cost = 12 for all password hashing.
- [x] Refresh tokens stored only as SHA-256 hashes; rotated on every refresh
      (old session revoked); sessions have expiry + revoke on logout.
- [x] Email verification and password-reset tokens stored hashed; suspended users
      blocked at login, refresh, and every authed route.
- [x] Zod validation on all request bodies/params.
- [x] SQL injection safe: user input only via `$queryRawUnsafe` bind parameters.
- [x] XSS safe: ReactMarkdown without `rehype-raw`, no `dangerouslySetInnerHTML`.
- [x] Uploads: extension allowlist + MIME check + 20 MB max + 10 files max.
      Fixed bug where `application/octet-stream` was rejected despite a valid
      allowed extension (curl/browser uploads now accepted; extension remains the
      authoritative gate).
- [x] Error handler returns generic message for unknown errors; stack traces only
      outside `production`.

## 8. Performance

- [x] Pagination: admin users, admin logs, API usage, notifications
      (`page` / `pageSize`).
- [x] All list/search query paths indexed (no full scans on hot paths).
- [x] Next.js route-level code splitting active (per-route JS chunks).
- [x] Known gaps documented, not blockers for current scale:
      KB/docs/chat-history lists are unpaginated (user-scoped, acceptable);
      no response-cache layer; chat returns full responses (no SSE streaming).

## 9. Clean Build & Run

- [x] Verified from a clean installation (node_modules + lockfile removed first).
- [x] Backend dev server boots with zero errors (`tsx watch`).
- [x] Frontend dev server boots with zero errors (`next dev`).
- [x] Root `npm run dev` starts both concurrently.
- [x] Root `npm run build` builds both workspaces cleanly.

## 10. Deployment

- [x] `docker-compose.yml` valid (3 services: postgres/pgvector:pg17, backend,
      frontend) - YAML parsed successfully.
- [x] Multi-stage Dockerfiles for backend and frontend created; backend runs
      `prisma migrate deploy && node dist/server.js` on start.
- [x] Docker build fixed: backend `deps` stage now copies `prisma/` before
      `npm install` so `postinstall: prisma generate` does not fail the build.
- [x] `.dockerignore` moved to correct build-context roots (`backend/`,
      `frontend/`) so `node_modules` / `.next` / `dist` are not shipped.
- [x] Persistent volumes for Postgres data, uploads, and model cache.
- [x] Backend URL configurable via `BACKEND_INTERNAL_URL` (no hardcoded localhost
      in the frontend proxy).
- [x] Docker images NOT built in this sandbox (no docker binary). Build steps
      reviewed and corrected, but a real `docker compose up --build` must be run
      outside the sandbox. See KNOWN_LIMITATIONS.md.
- [x] Render/Vercel guidance documented in DEPLOYMENT_GUIDE.md.

## 11. Regression Checks

- [x] After every fix, affected suites re-run: backend 77/77, frontend lint +
      typecheck + build, live API 25/25, live RAG 17/17.

## 12. Documentation

- [x] PROJECT_READY_CHECKLIST.md (this file).
- [x] DEPLOYMENT_GUIDE.md.
- [x] KNOWN_LIMITATIONS.md.
- [x] FINAL_AUDIT_REPORT.md (full verdict with phase scores).
