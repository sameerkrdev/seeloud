# web

The Next.js 16 frontend for Seeloud. Uses React 19, Tailwind CSS v4, and shadcn/ui.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Login with email/password or GitHub OAuth |
| `/register` | New account registration |
| `/dashboard` | Static deployment list + real-time build log panel |
| `/dashboard/settings` | Account settings |
| `/dashboard/seeloudfn` | Serverless function list (Seeloudfn) |
| `/dashboard/seeloudcron` | Scheduled job list (Seeloudcron) |
| `/dashboard/seeloudcron/new` | Create a new scheduled job |
| `/dashboard/seeloudcron/[id]` | Scheduled job detail + run history |

## Development

```bash
bun run dev          # start dev server on port 3000
bun run build        # production build
bun run check-types  # TypeScript type check
bun run lint         # ESLint
```

## Environment Variables

```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3002
```
