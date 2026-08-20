# KNOWN_LIMITATIONS.md

Honest list of known limitations and residual risks. None of these block the
verified functionality; they are documented so operators can make informed
decisions.

## 1. Dependency security advisories (sharp / libvips)

- `npm audit --omit=dev` reports 3 high-severity advisories, all in
  `sharp` (libvips CVEs: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590,
  CVE-2026-35591, GHSA-f88m-g3jw-g9cj) with "No fix available".
- `sharp` is pulled in transitively by `next` (image optimization) and by
  `@huggingface/transformers`. It is NOT on the active code path: the app uses
  no `next/image`, and embedding/PDF processing do not use sharp.
- npm refuses a clean override of the version pinned by the dependency graph, so
  no safe override exists today. Monitor the advisories and bump when a fixed
  `sharp` releases.

## 2. Docker images not built in the sandbox

- No `docker` binary exists in the audit environment, so `docker compose up
  --build` could not be executed here.
- The compose YAML parses, the multi-stage Dockerfiles were reviewed, and two
  real build blockers were found and fixed (backend `prisma generate`
  postinstall during image build; `.dockerignore` placement).
- Action required: run `npm run docker:up` on a machine with Docker and confirm
  all three containers reach healthy state. This is the only item in the audit
  that could not be proven end-to-end.

## 3. Browser-level hydration not exercised

- No Chromium/puppeteer is available in the sandbox, so the client-side
  hydration check could not be run in a real browser.
- Verified instead by static prerender + `next build` SSR output (no
  `Date`/`Math`/`window` in render paths; no `dangerouslySetInnerHTML`) plus a
  full HTTP 200 route sweep. A quick `curl`-level check cannot detect every
  hydration mismatch, so a manual browser pass is recommended.

## 4. Chat answers are not streamed

- The Gemini provider exposes a streaming interface internally, but the chat API
  returns full responses (no SSE). Large answers have a longer perceived
  latency. Streaming could be added later as an enhancement.

## 5. No response-cache layer

- There is no Redis/in-memory cache for API responses or chat history. At
  single-user / small-team scale this is fine; under heavy read load, caching
  (e.g. `cache-control` headers or Redis) would help.

## 6. Unpaginated list endpoints

- Knowledge base list, document list, and chat history return all rows for the
  current user (bounded by per-user scoping and database indexes). Admin lists
  (users, logs, API usage) and notifications are paginated. If a single user can
  hold thousands of documents/chats, add `page`/`pageSize` to these three.

## 7. Local embedding model behavior

- Embeddings use a local sentence-transformers model downloaded on first use
  into `EMBEDDING_CACHE_DIR`. The first embedding/chat request has a one-time
  latency cost, and a writable, persistent cache directory is required.
- On serverless hosts (Vercel) with ephemeral storage this is a real constraint;
  the backend should run on a long-lived host (see DEPLOYMENT_GUIDE.md).

## 8. Email sending

- By default `LOG_EMAILS_INSTEAD_OF_SEND=true` logs verification/reset emails
  instead of sending them. Production requires real SMTP settings and
  `EMAIL_VERIFICATION_REQUIRED=true` if verification is desired.

## 9. RAG quality is model-dependent

- Retrieval quality depends on the embedding model (`EMBEDDING_MODEL`), chunk
  size/overlap, `RAG_TOP_K`, and the LLM (`GEMINI_MODEL`). Without a
  `GEMINI_API_KEY`, chat answers fall back to retrieval-only behavior (verified),
  which is useful but less natural. Tuning knobs exist via env vars.

## 10. Not evaluated in this environment

- Cross-browser rendering and mobile layouts (single-engine static check only).
- Load testing beyond rate-limit verification (no concurrency/stress suite was
  run; DoS-style testing is out of scope by policy).
- Multi-tenant hard isolation beyond per-user ownership checks (single
  Postgres schema is shared; ownership is enforced at the application layer).

## 11. Minor

- `next lint` was deprecated upstream; the project migrated to ESLint flat
  config, so the legacy command no longer applies.
- The `postinstall: prisma generate` hook adds a small time cost to `npm install`
  but makes clean installs reliable.
