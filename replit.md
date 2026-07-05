# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

- **Enigma of Alchemist (`artifacts/3d-game`) Google login via Magic.link**: `VITE_MAGIC_PUBLISHABLE_KEY` must be a real key copied from https://dashboard.magic.link (Social Login → Google enabled), and the app's exact origin (dev preview domain and/or published domain) must be added as an allowed redirect URI in both the Magic dashboard and the matching Google Cloud OAuth client. If the key is a placeholder/invalid value, Magic SDK calls (`isLoggedIn`, `getRedirectResult`, `loginWithRedirect`) can hang indefinitely instead of erroring — `src/lib/magic.ts` wraps them with an 8s timeout so the UI always falls back to the login screen instead of hanging forever, but login itself will not complete until a valid key + redirect URI are configured.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
