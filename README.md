# Seeloud - Static Site Deployment Platform

Seeloud is a modern deployment platform that simplifies deploying static sites directly from Git repositories. Connect your GitHub repo, and Seeloud handles cloning, building, and hosting—all in one seamless workflow.

## Overview

Seeloud enables developers to deploy web applications with minimal configuration. Simply provide a repository URL, and the platform automatically:
- Clones your repository
- Builds your project in Docker
- Streams real-time build logs to the browser
- Uploads assets to distributed storage
- Serves your application instantly

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                                 │
│  • User Registration & Login                                           │
│  • Dashboard & Project Management                                      │
│  • Real-time Build Logs via WebSocket                                  │
│  • Live Status Updates                                                 │
│  • GitHub Integration                                                  │
└────────────────┬────────────────────────────┬──────────────────────────┘
                 │ HTTP/REST                  │ WebSocket
                 │                            │
        ┌────────▼─────────┐        ┌────────▼──────────┐
        │  API Server      │        │  WS Service       │
        │  (Express.js)    │        │  (Bun native)     │
        │  • Auth          │        │  • JWT Auth       │
        │  • Projects      │        │  • DB Replay      │
        │  • Deployments   │        │  • Redis Sub      │
        │  • File Serving  │        │  • Live Forward   │
        └────────┬─────────┘        └────────┬──────────┘
                 │                           │
          ┌──────┼──────────────┬────────────┤
          │      │              │            │
          │      │         ┌────▼────┐       │
          │      │         │  Redis  │       │
          │      │         │  • Queue│       │
    ┌─────▼──────▼───┐     │  • Pub  │   ┌───▼──────────┐
    │  PostgreSQL    │     │   Sub   │   │ Worker       │
    │  • Users       │     └────▲────┘   │ (Node.js)    │
    │  • Projects    │          │        │ • Clone      │
    │  • BuildLogs   │          │        │ • Build      │
    │  • EnvVars     │          │        │ • Stream     │
    └────────────────┘          │        │ • Upload     │
                                │        └───┬──────────┘
                         ┌──────┴────────────┘
                         │ HTTP Posts
                         │ (logs & status)
                         │
                    ┌────▼──────────┐
                    │ Cloudflare R2 │
                    │ • Static Files│
                    │ • Built Apps  │
                    └───────────────┘
```

## Tech Stack

### Frontend
- **Next.js 16** - React framework
- **React 19** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Component library

### Backend & Services
- **Express.js** - REST API
- **Bun** - JavaScript runtime (API, WS service, worker)
- **TypeScript** - Type-safe development
- **Prisma** - ORM for database
- **JWT (jose)** - Authentication
- **bcryptjs** - Password hashing
- **ioredis** - Redis client for pub/sub

### Infrastructure
- **PostgreSQL** - Relational database
- **Redis + BullMQ** - Job queue for deployments
- **Redis Pub/Sub** - Real-time message broadcast
- **Cloudflare R2** - S3-compatible object storage
- **Docker** - Build environment isolation
- **Turbo** - Monorepo orchestration

## Project Structure

```
seeloud/
├── apps/
│   ├── web/              # Next.js frontend (port 3000)
│   │   ├── app/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── dashboard/
│   │   └── components/
│   │       └── build-logs-panel.tsx
│   │
│   ├── api/              # Express REST API (port 3001)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── deploy.ts
│   │   │   │   ├── github.ts
│   │   │   │   ├── app.ts
│   │   │   │   └── internal.ts    # ← POST /internal/logs & /internal/status
│   │   │   └── lib/
│   │   │       ├── redis.ts       # ← Redis publisher
│   │   │       └── jwt.ts
│   │   └── index.ts
│   │
│   ├── ws/               # Bun WebSocket service (port 3002)
│   │   ├── src/
│   │   │   ├── handler.ts        # ← JWT auth, DB replay, subscriptions
│   │   │   └── redis.ts          # ← Redis subscriber, projectSubscribers map
│   │   └── index.ts              # ← Bun.serve with WebSocket upgrade
│   │
│   └── worker/           # BullMQ deployment processor
│       ├── src/
│       │   ├── lib/
│       │   │   └── docker.ts     # ← Piped stdout/stderr, onLog callback
│       │   └── worker.ts         # ← postLog/postStatus helpers
│       └── index.ts
│
├── packages/
│   ├── db/               # Shared Prisma setup
│   │   └── prisma/
│   │       └── schema.prisma     # ← Added BuildLog model
│   ├── crypto/           # Shared encryption
│   ├── eslint-config/
│   └── typescript-config/
│
├── turbo.json
└── package.json
```

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Bun** 1.3.10 or later
- **Docker & Docker Compose** (for PostgreSQL and Redis)
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

   Copy `.env.example` files (or use existing `.env` in dev):
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
   
   # apps/worker/.env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/seeloud"
   WORKER_SECRET="dev-worker-secret-change-in-production"
   API_BASE_URL="http://localhost:3001"
   
   # apps/ws/.env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/seeloud"
   JWT_SECRET="your-secure-random-secret-key"
   REDIS_HOST="localhost"
   REDIS_PORT="6379"
   WS_PORT="3002"
   
   # apps/web/.env.local
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_WS_URL=ws://localhost:3002
   ```

4. **Start local services**
   ```bash
   docker-compose -f apps/api/docker-compose.yml up -d
   ```

5. **Run database migrations**
   ```bash
   cd packages/db
   bunx prisma db push
   cd ../..
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
- **Worker**: Processes deployment jobs in background

### Running Individual Services

**Frontend only:**
```bash
cd apps/web && bun run dev
```

**API only:**
```bash
cd apps/api && bun run dev
```

**WS Service only:**
```bash
cd apps/ws && bun run dev
```

**Worker only:**
```bash
cd apps/worker && bun run dev
```

### Using the Platform

1. **Register/Login** at http://localhost:3000
2. **Connect GitHub** (optional, for private repos and browsing repos)
3. **Deploy**: Paste repo URL or select from GitHub, configure env vars
4. **Watch logs**: Click a project row to open the build log panel
5. **Access app**: Once deployed, click "Open app" to view your site

## Real-Time Build Log Features

- **Live streaming**: See Docker build output as it happens (npm install, build steps, etc.)
- **Persistent logs**: All build logs stored in database for historical review
- **Status sync**: Project status (CLONING → BUILDING → DEPLOYED) updates in real-time
- **Auto-replay**: If you refresh during a build, logs replay from start then resume live
- **Multi-client**: Multiple browsers watching the same project all receive the same stream
- **Error visibility**: stderr output highlighted in red for easy error spotting

## Database Schema

Key tables:
- **User** - Auth & GitHub token storage (encrypted)
- **Project** - Deployment records, status tracking
- **EnvVar** - Build environment variables (encrypted)
- **BuildLog** - Individual build log lines (indexed by projectId, ordered by auto-increment ID)

## Contributing

### Setting Up for Development

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make changes following the code standards.

3. Run checks:
   ```bash
   bun run lint
   bun run check-types
   ```

4. Commit your changes:
   ```bash
   git commit -m "feat: describe your changes"
   ```

5. Push and create a pull request:
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Convention

```
feat: add new feature
fix: resolve issue
refactor: improve code structure
docs: update documentation
style: formatting changes
test: add or update tests
chore: maintenance tasks
```

## Deployment

### Production Checklist

1. Set strong `JWT_SECRET` and `WORKER_SECRET` (use `openssl rand -hex 32`)
2. Configure all R2/Cloudflare credentials
3. Set `FRONTEND_URL` to your production domain
4. Ensure PostgreSQL and Redis are provisioned
5. Scale WS service horizontally; it's stateless (clients reconnect if needed)
6. Use environment-specific `.env` files, not .env.local

### Environment Variables for Production

All variables from Installation section, plus:
- `WORKER_SECRET` - Shared secret between API and Worker (32+ chars)
- `JWT_SECRET` - Secure random key for JWT signing (32+ chars)
- `ENV_ENCRYPTION_KEY` - 64-character hex string for env var encryption
- `FRONTEND_URL` - Production frontend domain

## Troubleshooting

### Connection Issues
- Ensure containers running: `docker-compose -f apps/api/docker-compose.yml ps`
- Check PostgreSQL: `psql $DATABASE_URL -c "SELECT 1"`
- Verify Redis: `redis-cli ping`
- WS service: Check port 3002 is accessible

### Build Logs Not Showing
- Verify WS service is running: `curl http://localhost:3002` (should 404)
- Check `WORKER_SECRET` matches between API and Worker `.env` files
- Ensure `NEXT_PUBLIC_WS_URL` is set correctly in web `.env.local`
- Check browser console for WebSocket errors

### Infinite WebSocket Connections
- This was caused by `onStatusChange` callback being in the effect dependency array
- Fixed by storing the callback in a `useRef` so the effect only depends on `projectId`
- If you experience reconnection loops, check that parent isn't creating new function references

### Build Failures
- Clear node_modules: `rm -rf node_modules && bun install`
- Reset database: `cd packages/db && bunx prisma db push --accept-data-loss`
- Check Docker is running for build execution

### Port Conflicts
- Frontend: `next dev --port <PORT>`
- API: Set `PORT` env var
- WS: Set `WS_PORT` env var

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Support

For issues, feature requests, or questions:
- Open an issue on GitHub
- Check existing documentation
- Review architecture diagrams above

---

**Last Updated**: April 2026  
**Architecture**: Monorepo with microservices (API, WS, Worker) + real-time log streaming via Redis pub/sub
