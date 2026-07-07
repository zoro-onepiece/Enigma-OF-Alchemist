# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A pnpm-workspace monorepo hosted on Replit ("artifacts monorepo" template). The flagship app is
**Enigma of Alchemist** (`artifacts/3d-game`) — a 3D Web3 puzzle-adventure game where players explore a
procedural Japanese temple garden, solve four alchemical mini-games, and collect on-chain rewards on
Arbitrum Sepolia. Auth is via Magic.link (Google/email), wallets/NFT minting via Openfort.

Other workspace apps: `artifacts/api-server` (backend for the game), `artifacts/hackathon-deck` (slides),
`artifacts/mockup-sandbox` (UI scratch space).

## Commands

Run everything through pnpm from the repo root, or scope to a package with `--filter`.

```bash
pnpm run typecheck                                    # full typecheck: libs first, then artifacts/scripts
pnpm run typecheck:libs                                # tsc --build for lib/* only (composite libs)
pnpm --filter @workspace/<pkg> run typecheck           # typecheck one package (preferred way to verify a single app)
pnpm run build                                         # typecheck + build all packages
pnpm --filter @workspace/api-server run dev            # run the API server (port 5000)
pnpm --filter @workspace/api-spec run codegen          # regenerate Zod schemas + React Query hooks from openapi.yaml
pnpm --filter @workspace/db run push                   # push Drizzle schema changes (dev only)
pnpm --filter @workspace/db run push-force              # same, but forces through column conflicts
```

There is no lint script and no test runner configured in this repo — don't invent `pnpm lint`/`pnpm test` commands.

**Do not run `pnpm dev`/`pnpm run dev` at the workspace root** — it doesn't exist by design. Replit apps run via
workflows (which supply `PORT`/`BASE_PATH`), not ad hoc root-level dev. Use the preview pane / workflow restart to
run an app, and verify with `typecheck`, not `build` (build needs workflow-provided env vars and can fail from bash
even when the code is fine).

Required env: `DATABASE_URL` (Postgres connection string).

## Architecture

### Workspace layout

- `artifacts/*` — deployable, leaf packages (never import from each other; typechecked with `tsc --noEmit`).
- `lib/*` — shared libraries, composite TS projects that emit declarations via `tsc --build`.
- `scripts` — one workspace package for utility scripts (`scripts/src/*.ts`), typechecked like a leaf package.
- Root `tsconfig.json` is a solution file referencing only `lib/*` composite packages — never add artifacts to it.
- `tsconfig.base.json` holds shared strict compiler defaults.

If cross-package types disagree between editor/tsserver and CLI, trust `pnpm run typecheck`.

### Contract-first API flow

`lib/api-spec/openapi.yaml` is the single source of truth for the API. Endpoints are defined there first, then:

```
lib/api-spec/openapi.yaml
   → pnpm --filter @workspace/api-spec run codegen
   → lib/api-zod/src/generated/api.ts            (Zod schemas — used by the server to validate req/res)
   → lib/api-client-react/src/generated/api.ts   (React Query hooks — used by frontends)
```

Route handlers in `artifacts/api-server/src/routes/*` validate input/output against the generated Zod schemas and
should stay thin (validate → call DB → respond); push logic into `src/lib/`. When editing the spec: every
request/update body must be `$ref`'d to a `components/schemas` entry named after the *entity* (`NoteInput`,
`NoteUpdate`), never `<OperationId>Body` — Orval already generates a Zod schema with that exact name, and a
matching component name collides (TS2308) at the `typecheck:libs` step, not at codegen time.

### Database

`lib/db/src/schema/` — one file per table, re-exported from `schema/index.ts`. Each model defines the Drizzle
table, a `createInsertSchema` (drizzle-zod) insert schema, and derived types. Import tables from `@workspace/db`
directly (it re-exports the full schema barrel), not from deep paths. Use `timestamp(..., { withTimezone: true })`
for instants, `date(..., { mode: "string" })` for calendar-only values (keep those as `YYYY-MM-DD` strings, not
`Date`/`toISOString()`, to avoid timezone shifts).

### API server conventions (Express 5)

- Never use `console.log`/`console.error` in server code — use `req.log` inside handlers, the singleton `logger`
  (`src/lib/logger.ts`, pino) elsewhere. Request logging is automatic via `pino-http` middleware in `app.ts`.
- Express 5 breaking changes to watch for: wildcard routes need `/{*splat}` (bare `*` crashes); optional params are
  `/todos{/:id}` not `/todos/:id?`; `req.params.id` is `string | string[]`, always parse explicitly; async handlers
  should be typed `Promise<void>` and use `res.status().json(); return;` (never `return res.status().json()`).
- `__dirname`/`import.meta.url` point at bundled `dist/` output, not source — resolve runtime paths (uploads, data
  dirs) from an explicit workspace-root-relative path instead.
- String field validation: use `content == null` (not `!content`) for optional-but-not-required text fields — an
  empty string is often a valid value.

### Service routing

A shared reverse proxy routes traffic by path per artifact's `.replit-artifact/artifact.toml` (`paths = ["/api"]`
etc). Always hit services through the proxy (`localhost:80/api/...`), never a raw service port directly. In app
code, prefer relative URLs — the proxy already handles both dev preview and published domains. Don't add Vite proxy
configs or custom base URLs for cross-service calls.

### Game app (`artifacts/3d-game`)

React Three Fiber game. `Scene.tsx` (`components/scene/`) composes the 3D world; `components/3d/` holds
Player/Monster/PuzzleObject/environment meshes; `components/puzzles/` holds the four mini-games (match-3, rune
memory, sigil pairs, etc. — driven through `PuzzleModal.tsx`); `store/gameStore.ts` / `soundStore.ts` are Zustand
stores; `components/ui/` is the shadcn/radix component set (generic, not game-specific).

Auth/wallet wiring is **plain React state in `App.jsx`**, calling `src/lib/magic.ts` directly — there is no
`MagicProvider`/`useMagic()` context layer. `src/components/web3/` is a vestigial stub; don't assume a
Provider/hook file exists there just because a task description references one — check the current tree first.

This sandbox has **no GPU** — WebGL/Canvas content can't be screenshotted or visually verified here. Validate
Canvas-internal logic (camera math, collision, skinned-mesh alignment) via typecheck and geometry/math reasoning,
then tell the user visual confirmation needs their own browser.

Non-obvious 3D/R3F pitfalls already hit in this codebase (see `.agents/memory/*.md` for full detail on each):

- `Box3().setFromObject()` is unreliable on skinned/rigged meshes (bind-pose only, ignores bone deformation) — use
  bone world positions after `updateMatrixWorld(true)` instead, and require `isBone` when matching by name.
- A manual orbit camera's `target → camera` offset vector is the *opposite* of its look direction; camera-relative
  movement must negate it.
- Instancing a multi-part GLB (stem/bloom/leaf as separate materials) needs one `InstancedMesh` per part sharing one
  transform array — not one group per placement.
- `<bufferAttribute>` takes `args={[array, itemSize]}`, not separate `count`/`array`/`itemSize` props; drei's
  `<PositionalAudio>` has no `volume` prop — call `ref.current.setVolume()` instead.
- GLTFLoader silently drops legacy `KHR_materials_pbrSpecularGlossiness` materials (untextured/white mesh, only a
  console warning) — needs patching to `pbrMetallicRoughness` in the GLB.
- Magic SDK calls (`isLoggedIn`, `getRedirectResult`, `loginWithRedirect`) can hang forever instead of erroring if
  `VITE_MAGIC_PUBLISHABLE_KEY` is invalid — always wrap with a timeout; check the key before deep-diagnosing an
  "OAuth loop" report.

### Web3 / NFT minting (`artifacts/api-server/src/routes/nft/mint.ts`)

Gasless minting via Openfort to Arbitrum Sepolia is scaffolded but not finished — several `TODO`s remain (verifying
the Magic DID token instead of trusting an `x-player-address` header, confirming puzzle completion server-side
before minting, idempotency per `(puzzleId, address)`). Treat this route as a template, not a completed feature,
before relying on its security properties.

## Package management

- Workspace packages use the `@workspace/` prefix; each declares its own deps (not shared implicitly).
- Use `catalog:` for deps already pinned in `pnpm-workspace.yaml`'s catalog.
- Static/client-only artifacts (Vite React apps): all deps → `devDependencies`. Server artifacts: runtime imports →
  `dependencies`, build tools/`@types/*` → `devDependencies`. Libraries: shared runtimes (`react`) → `peerDependencies`.
- Don't use `pnpm add --no-frozen-lockfile`.

## Pointers

- `replit.md` — Replit-agent-maintained project doc (stack, gotchas, Magic.link config requirements).
- `.local/skills/pnpm-workspace/` — fuller detail behind every section above (`references/db.md`, `openapi.md`, `server.md`).
- `.agents/memory/*.md` — deeper write-ups of the R3F/GLB gotchas summarized above.
