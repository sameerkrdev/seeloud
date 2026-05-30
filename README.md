# Seeloud - Deployment Platform

Seeloud is a modern deployment platform that simplifies deploying static sites and serverless functions directly from Git repositories. Connect your GitHub repo, and Seeloud handles cloning, building, hosting, and function execution—all in one seamless workflow.

## Overview

Seeloud has two main product areas:

**Static site deployments** — Provide a repository URL, and the platform automatically clones, builds in Docker, streams real-time logs, uploads assets to R2, and serves your app on a subdomain (or custom domain).

**Serverless functions (Seeloudfn)** — Upload a zip of Node.js code and get back a public URL that executes your function on every HTTP request inside an isolated [workerd](https://github.com/cloudflare/workerd) V8 process.

**Scheduled jobs (Seeloudcron)** — Schedule a Seeloudfn function to run on a cron, daily/weekly/interval schedule, or a one-shot time, with full run history, retries, and logs.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 16)                        │
│  • Auth (Register / Login / GitHub OAuth)                        │
│  • Static deployment dashboard + real-time build logs            │
│  • Seeloudfn function management (upload, invoke, status)           │
│  • Seeloudcron scheduler (create/edit jobs, run history, logs)        │
│  • Settings (custom domains, environment variables)              │
└────────────────┬──────────────────────┬─────────────────────────┘
                 │ HTTP/REST            │ WebSocket
                 ▼                      ▼
        ┌────────────────┐     ┌─────────────────┐
        │  API Server    │     │  WS Service     │
        │  (Express.js)  │     │  (Bun native)   │
        │  port 3001     │     │  port 3002      │
        │                │     │  • JWT auth     │
        │  /auth         │     │  • DB replay    │
        │  /deploy       │     │  • Redis sub    │
        │  /api/seeloudfn   │     │  • Live forward │
        │  /api/seeloudcron   │     └────────┬────────┘
        │  /seeloudfn/:id   │              │
        │  /internal     │              │
        └───────┬────────┘              │
                │                       │
       ┌────────┼──────────┬────────────┘
       │        │          │
  ┌────▼───┐  ┌─▼────┐  ┌─▼──────────────────────┐
  │Postgres│  │Redis │  │   BullMQ queues          │
  │        │  │      │  │  • deploy-jobs           │
  │Users   │  │Pub/  │  │  • seeloudfn-builds         │
  │Projects│  │Sub   │  │  • seeloudfn-invocations    │
  │BuildLog│  │Queue │  └─────────┬────────────────┘
  │EnvVar  │  └──────┘            │
  │Seeloudfn  │             ┌────────┴──────────────┐
  │Schedul-│             │                       │
  │edJob   │       ┌─────▼──────┐    ┌───────────▼──────────┐
  │JobRun  │       │  Worker    │    │  seeloudfn-runtime      │
  └────────┘       │  (Bun)     │    │  (Bun)               │
                   │            │    │                      │
                   │  • Clone   │    │  • workerd pool      │
                   │  • Build   │    │  • V8 isolation      │
                   │  • Upload  │    │  • BullMQ consumer   │
                   │  • Seeloudfn  │    └──────────────────────┘
                   │    bundle  │
                   └────────────┘
                                                      │
                                            ┌─────────▼──────┐
                                            │ Cloudflare R2  │
                                            │ • Built sites  │
                                            │ • worker.mjs   │
                                            └────────────────┘
```

## Tech Stack

### Frontend
- **Next.js 16** / **React 19** — App Router, server components
- **TypeScript 5.9** — Type-safe development
- **Tailwind CSS v4** — Utility-first CSS
- **shadcn/ui** — Radix-based component library

### Backend & Services
- **Express.js** — REST API (port 3001)
- **Bun** — JavaScript runtime for all backend services
- **TypeScript** — Type-safe development
- **Prisma** — ORM for PostgreSQL
- **pino** — Structured JSON logging (`@repo/logger`)
- **JWT (jose)** — Stateless authentication
- **bcryptjs** — Password hashing
- **BullMQ** — Job queue for deployments and function invocations
- **ioredis** — Redis client for pub/sub

### Infrastructure
- **PostgreSQL** — Relational database (users, projects, build logs, Seeloudfn/Seeloudcron data)
- **Redis** — BullMQ job queue + pub/sub for real-time log streaming
- **Cloudflare R2** — S3-compatible object storage (built sites + function bundles)
- **Docker** — Build environment isolation for static deployments
- **workerd** — Cloudflare's V8 sandbox for serverless function execution
- **Caddy** — Reverse proxy with on-demand TLS for custom domains
- **Turbo** — Monorepo task orchestration

## Project Structure

```
seeloud/
├── apps/
│   ├── web/                    # Next.js frontend (port 3000)
│   │   └── app/
│   │       ├── dashboard/
│   │       │   ├── page.tsx         # Static deployments list
│   │       │   ├── settings/        # Account settings
│   │       │   ├── seeloudfn/          # Serverless function list
│   │       │   └── seeloudcron/          # Scheduler (list, new, detail)
│   │       ├── login/
│   │       └── register/
│   │
│   ├── api/                    # Express REST API (port 3001)
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── auth.ts          # POST /auth/register|login|logout
│   │       │   ├── deploy.ts        # CRUD /deploy
│   │       │   ├── domains.ts       # Custom domain management
│   │       │   ├── github.ts        # GitHub OAuth + repo listing
│   │       │   ├── seeloudfn.ts        # /api/seeloudfn upload/list/delete
│   │       │   ├── seeloudfn-invoke.ts # /seeloudfn/:id proxy to BullMQ
│   │       │   ├── seeloudcron.ts        # /api/seeloudcron/jobs CRUD + trigger
│   │       │   ├── seeloudcron-runs.ts   # /api/seeloudcron/runs history
│   │       │   ├── internal.ts      # Worker-only log/status endpoints
│   │       │   └── app.ts           # Subdomain asset serving
│   │       └── lib/
│   │           ├── redis.ts         # Redis publisher
│   │           ├── jwt.ts
│   │           ├── r2.ts
│   │           └── subdomain.ts
│   │
│   ├── ws/                     # Bun WebSocket service (port 3002)
│   │   └── src/
│   │       ├── handler.ts           # JWT auth, DB replay, subscriptions
│   │       └── redis.ts             # Redis subscriber
│   │
│   ├── worker/                 # BullMQ deployment processor
│   │   └── src/
│   │       ├── worker.ts            # deploy-jobs consumer
│   │       ├── seeloudfnBuild.ts       # seeloudfn-builds consumer (esbuild bundle)
│   │       └── lib/
│   │           ├── docker.ts
│   │           ├── git.ts
│   │           └── r2.ts
│   │
│   ├── seeloudfn-runtime/         # Serverless function executor
│   │   └── src/
│   │       ├── runtime.ts           # seeloudfn-invocations BullMQ consumer
│   │       ├── workerdPool.ts       # LRU workerd process pool
│   │       └── r2.ts                # Download worker.mjs from R2
│   │
│   └── seeloudcron/                 # Scheduled job engine
│       └── src/
│           ├── poller.ts            # 60s tick, dispatches due jobs
│           ├── dispatch.ts          # Per-job orchestration + retries
│           └── schedule.ts          # nextRunAt computation
│
├── packages/
│   ├── db/                     # Shared Prisma setup
│   │   └── prisma/schema.prisma
│   ├── logger/                 # Shared pino logger factory
│   │   └── src/index.ts        # createLogger(service) with redaction
│   ├── crypto/                 # Env var encryption helpers
│   ├── eslint-config/          # Shared ESLint config
│   └── typescript-config/      # Shared tsconfig bases
│
├── docker/                     # Per-service Dockerfiles
│   ├── api/
│   ├── web/
│   ├── worker/
│   ├── ws/
│   ├── seeloudfn-runtime/
│   └── seeloudcron/
│
├── turbo.json
└── package.json
```

## Getting Started

### Prerequisites

- **Bun** 1.3.10 or later
- **Docker & Docker Compose** (for PostgreSQL, Redis, and local builds)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd seeloud
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**

   ```bash
   # apps/api/.env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/seeloud"
   JWT_SECRET="your-secure-random-secret-key"
   WORKER_SECRET="dev-worker-secret-change-in-production"

   R2_ENDPOINT="https://your-account.r2.cloudflarestorage.com"
   R2_ACCESS_KEY_ID="your-access-key"
   R2_SECRET_ACCESS_KEY="your-secret-key"
   R2_BUCKET_NAME="your-bucket-name"

   REDIS_HOST="localhost"
   REDIS_PORT="6379"

   ENV_ENCRYPTION_KEY="aac8c44d5d0a8bf8992552d4fdb59c95b12ea030dda9fd5e87dee833965db23d"

   GITHUB_CLIENT_ID="your-github-client-id"
   GITHUB_CLIENT_SECRET="your-github-secret"
   GITHUB_REDIRECT_URI="http://localhost:3001/auth/github/callback"

   BASE_DOMAIN="localhost"   # Used for subdomain routing + Caddy TLS checks

   # apps/worker/.env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/seeloud"
   WORKER_SECRET="dev-worker-secret-change-in-production"
   API_BASE_URL="http://localhost:3001"
   R2_ENDPOINT="..."
   R2_ACCESS_KEY_ID="..."
   R2_SECRET_ACCESS_KEY="..."
   R2_BUCKET_NAME="..."
   REDIS_HOST="localhost"

   # apps/ws/.env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/seeloud"
   JWT_SECRET="your-secure-random-secret-key"
   REDIS_HOST="localhost"
   REDIS_PORT="6379"
   WS_PORT="3002"

   # apps/seeloudfn-runtime/.env
   REDIS_HOST="localhost"
   R2_ENDPOINT="..."
   R2_ACCESS_KEY_ID="..."
   R2_SECRET_ACCESS_KEY="..."
   R2_BUCKET_NAME="..."

   # apps/seeloudcron/.env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/seeloud"
   REDIS_HOST="localhost"
   WORKER_SECRET="dev-worker-secret-change-in-production"
   API_BASE_URL="http://localhost:3001"

   # apps/web/.env.local
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_WS_URL=ws://localhost:3002
   ```

4. **Start infrastructure services**
   ```bash
   docker compose -f apps/api/docker-compose.yml up -d
   ```

5. **Run database migrations**
   ```bash
   cd packages/db && bunx prisma db push && cd ../..
   ```

### Running the Application

Start all services in development mode:

```bash
bun run dev
```

This starts:
- **Frontend**: http://localhost:3000 (Next.js)
- **API**: http://localhost:3001 (Express)
- **WS Service**: ws://localhost:3002 (Bun WebSocket)
- **Worker**: processes deploy-jobs and seeloudfn-builds queues
- **seeloudfn-runtime**: processes seeloudfn-invocations queue
- **seeloudcron**: scheduled job poller

### Running Individual Services

```bash
cd apps/web && bun run dev
cd apps/api && bun run dev
cd apps/ws && bun run dev
cd apps/worker && bun run dev
cd apps/seeloudfn-runtime && bun run dev
cd apps/seeloudcron && bun run dev
```

### Using the Platform

1. **Register/Login** at http://localhost:3000
2. **Connect GitHub** (optional) for private repos and repo browsing
3. **Deploy a site**: paste repo URL or select from GitHub, configure env vars, watch live logs
4. **Deploy a function (Seeloudfn)**: upload a zip, get back an invoke URL
5. **Schedule a job (Seeloudcron)**: pick a function, configure a cron/interval/daily schedule

## API Routes

### Auth (`/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login, returns JWT |

### GitHub OAuth
| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/github` | Start GitHub OAuth flow |
| GET | `/auth/github/callback` | GitHub OAuth callback |
| GET | `/github/repos` | List authenticated user's repos |

### Static Deployments (`/deploy`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/deploy` | Create a new deployment |
| GET | `/deploy` | List user's projects |
| GET | `/deploy/:id` | Get a single project |
| DELETE | `/deploy/:id` | Delete a project |
| GET | `/deploy/:id/envvars` | List env vars |
| POST | `/deploy/:id/envvars` | Add env var |
| DELETE | `/deploy/:id/envvars/:varId` | Delete env var |
| POST | `/deploy/:projectId/domains` | Add custom domain |
| GET | `/deploy/:projectId/domains` | List custom domains |
| DELETE | `/deploy/:projectId/domains/:domainId` | Remove custom domain |

### Serverless Functions (`/api/seeloudfn`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/seeloudfn/upload` | Upload a function zip |
| GET | `/api/seeloudfn` | List user's functions |
| GET | `/api/seeloudfn/:id` | Get function details |
| DELETE | `/api/seeloudfn/:id` | Delete a function |
| GET | `/seeloudfn/:id` | Invoke a function (any method) |

### Scheduled Jobs (`/api/seeloudcron`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/seeloudcron/jobs` | Create a scheduled job |
| GET | `/api/seeloudcron/jobs` | List jobs |
| GET | `/api/seeloudcron/jobs/:id` | Get a job |
| PATCH | `/api/seeloudcron/jobs/:id` | Update a job |
| DELETE | `/api/seeloudcron/jobs/:id` | Delete a job |
| POST | `/api/seeloudcron/jobs/:id/trigger` | Manually fire a job |
| GET | `/api/seeloudcron/jobs/:id/runs` | Paginated run history |
| GET | `/api/seeloudcron/runs/:runId` | Single run + logs |

### Internal (worker-only, `Bearer WORKER_SECRET`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/internal/logs` | Append a build log line |
| POST | `/internal/status` | Update project build status |
| POST | `/internal/job-logs` | Append a job run log line |
| PATCH | `/internal/job-runs/:runId` | Update job run status |
| GET | `/internal/domain-check` | Caddy on-demand TLS callback |

## Database Schema

Key models:
- **User** — Auth, encrypted GitHub token
- **Project** — Deployment records, status, subdomain
- **BuildLog** — Per-line build output (indexed by projectId)
- **EnvVar** — Build-time env vars (AES-encrypted values)
- **CustomDomain** — Custom domains with SSL provisioning status
- **SeeloudfnFunction** — Serverless function metadata
- **ScheduledJob** — Cron/interval/daily/weekly/once job config
- **JobRun** — Execution attempt record with status and duration
- **JobRunLog** — Per-line log output for each job run

## Logging

All backend services use `@repo/logger`, a shared Pino-based logger factory:
- **Dev**: colored pretty-print via `pino-pretty`
- **Prod**: JSON output
- Automatic redaction of `authorization`, `password`, `token`, `githubToken`, `encryptedValue`

```ts
import { createLogger } from '@repo/logger'
const logger = createLogger('my-service')
```

## Contributing

### Development workflow

1. Create a branch: `git checkout -b feat/your-feature`
2. Make changes and run checks:
   ```bash
   bun run lint
   bun run check-types
   ```
3. Run API tests: `cd apps/api && bun test`
4. Commit with conventional commit messages and open a PR.

### Commit Message Convention

```
feat: add new feature
fix: resolve bug
refactor: improve structure
docs: update documentation
test: add or update tests
chore: maintenance
```

## Production Deployment

### Docker

Each service has a Dockerfile in `docker/<service>/`. Use `docker-compose-prod.yml` (in repo root or `apps/api/`) with the `.env.compose.example` as a starting point.

### Checklist

1. Generate strong secrets: `openssl rand -hex 32`
2. Set `JWT_SECRET`, `WORKER_SECRET`, `ENV_ENCRYPTION_KEY` (64-char hex)
3. Configure all R2 credentials in API, Worker, and seeloudfn-runtime
4. Set `BASE_DOMAIN` to your apex domain
5. Ensure PostgreSQL and Redis are provisioned
6. WS service is stateless — safe to scale horizontally

## Troubleshooting

### Build logs not appearing
- Confirm WS service is running and `NEXT_PUBLIC_WS_URL` is correct
- Verify `WORKER_SECRET` matches between API and Worker
- Check browser console for WebSocket errors

### Function invocations timing out
- Confirm `seeloudfn-runtime` is running and consuming the `seeloudfn-invocations` queue
- Check `WORKERD_BIN` or the `workerd` npm package is installed
- Inspect Redis queue depth with `redis-cli llen bull:seeloudfn-invocations:wait`

### Port conflicts
- API: set `PORT` env var (default 3001)
- WS: set `WS_PORT` env var (default 3002)
- Frontend: `next dev --port <N>`

## License

MIT. See LICENSE file for details.

---

**Last Updated**: May 2026
**Architecture**: Monorepo (Turbo) — API, WS, Worker, seeloudfn-runtime, seeloudcron + Next.js frontend
