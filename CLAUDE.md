# CLAUDE.md

tvseri.es is a TV series tracker: what you've watched, where you are in a show, and when the shows you follow continue. Discovery lives on Home and Discover. It's a pnpm + Turborepo monorepo in strict TypeScript, deployed with SST v4 on AWS (the web app runs on Vercel).

## Ownership

- Work as the owner, not as a guest. In the code that your task touches, merge duplicate code, fix the bugs you find, and change the structure when it's in the way. Don't add a new function beside an old one that does the same job.
- You maintain this code for the long term. Keep it secure, performant and accessible to WCAG 2.2 level AA.
- The user still sets the task and makes the product decisions. Make the engineering choices yourself, and say what you chose.
- Ownership doesn't lift any other rule. The repo's own `CLAUDE.md` still applies. A destructive, hard-to-reverse or outward-facing action still needs the user's confirmation.
- A problem in code that the task doesn't touch gets reported, not fixed. Don't fix it until the user asks.

## Layout

```
apps/
  web/        Next.js 16 + React 19 frontend (Vercel)
  api/        Hono API on Lambda, plus the queue/stream/cron Lambdas in src/lambdas
  auth/       OpenAuth service (Google OIDC + email OTP via SES)
  dashboard/  Internal admin dashboard: Vite, TanStack Router/Query, shadcn (dashboard.tvseri.es)
packages/
  constants/          Shared constants, including CACHE_LIFE
  schemas/            Valibot schemas and shared types
  utils/              Shared utilities
  kill-switch/        Budget kill-switch handlers
  typescript-config/  Shared tsconfigs; every package extends base.json
infra/        SST resources, loaded from sst.config.ts
tools/
  agents/     `pnpm agents:*`: shared ports, queued builds and e2e for parallel agents (tools/agents/README.md)
  load/       Load rig: the API in-process against a synthetic TMDB (`pnpm --filter @tvseri.es/load-rig load`)
```

Packages ship raw TypeScript. Apps bundle them directly, so there's no build step.

## Commands

```bash
pnpm install              # also runs `sst install`; pnpm is enforced (v12, Node 24)
pnpm dev                  # = sst dev: all services, web via Next dev server
pnpm format-and-lint      # biome check .
pnpm format-and-lint:fix
pnpm check-types          # turbo run check-types
pnpm knip                 # unused files/exports/deps (runs in CI)
pnpm test                 # turbo run test: Vitest in every package that has a `test` script
pnpm --filter @tvseri.es/web e2e   # Playwright on a production build (port 3100): instant() navigation + redirects
```

The pre-commit hook runs `biome check --write` through lint-staged.

**Never run `sst deploy` or `sst remove`.** CI handles all deployments.

## Security

- Never read `.env` files, API keys, certificates, or screenshots/devtools output.
- Read secrets through SST (`Resource.X.value`) or `process.env`. Never hardcode them.

## Code style

Biome, not ESLint/Prettier: single quotes, semicolons, trailing commas, `(x) => x`, template literals over concatenation, imports sorted. `noExplicitAny` is an error.

- **No copy-paste.** Shared logic goes in `packages/*` (cross-app), a dedicated file in the app (app-wide), or a shared file in the feature folder. Check for existing code before writing new code.
- **TypeScript**: no `any`; use `unknown` and narrow. Wrap object types in `Readonly<>`. Use `import type` for type-only imports. Shared types live in `packages/schemas` and are exported from its barrel.

### React

- No inline computed props: assign to a variable before passing to JSX.
- `memo()` components set `displayName` before export.
- Props are typed as `Readonly<{...}>`, not `interface`.
- Split components past ~100 lines; avoid big JSX blocks.
- Avoid `useEffect` unless there's no alternative.
- Colocate code that changes together.

## apps/web

- **Cache Components is on** (`cacheComponents: true`). The `use cache` profiles in `next.config.ts` are generated from `CACHE_LIFE` in `@tvseri.es/constants`, which is also used for the API's `Cache-Control`. Change caching there, not per route.
- Fetch data in Server Components. Avoid `cookies()`/`headers()` where they'd make a route dynamic for no reason.
- Watch the size of props serialised from RSC to client components.
- Request interception lives in `src/proxy.ts` (Next 16), not `middleware.ts`.
- **Auth**: use `auth()` from `src/auth`. It resolves the OpenAuth session per context (`RSC`, `RouteHandler`, `Proxy`). Only the proxy refreshes tokens (one refresh per refresh token per instance, `src/auth/refresh.ts`); RSC and route handlers are read-only and read the cookie it forwards. OpenAuth rotates refresh tokens and RSC can't write the new cookie, so refreshing there would log the user out. Route handlers read it with `readRouteSession(req)`, and `auth()` and `getViewer()` share one token check (`verifySubject`, `src/auth/requestSession.ts`). A route handler that reads the session must be in the proxy's matcher (`src/proxyMatcher.test.ts` checks). A session ends only when its cookie can't be decrypted, the auth server refuses the refresh token (`invalid_grant`), or `/me` says the account is gone (`AccountGone`); any other failure keeps it for the next request. The `__tvseries_user` display cookie is cosmetic: read it only through `readDisplayUsername` (`src/auth/displayUsername.ts`); the proxy only renews or deletes it. The browser uses it for display and pre-paint hints; the server only as a hint to start a profile owner's reads early (`(profile)/_data/ownerHint.ts`). Never trust it for who the viewer is. Sign-in links use `loginHref` (`src/auth/loginHref.ts`). Sign-in is `apps/auth`: Google OIDC or an email code.
- Client state: Zustand. Animation: Motion. Styling: **Tailwind v4**, CSS-first: the tokens live in `src/app/globals.css` (`@theme`) and Tailwind's default palette, type scale and radii are cleared. Use the type tokens (`text-title-2`, `text-meta`…), the colour steps (`text-white/80`, `/60`, `/40`, `text-cyan`, `text-pink`) and `rounded-{px}`; merge classes with `cn()` from `@/lib/cn`.
- UI primitives live in `src/components/ui` (no primitives library: native `<dialog>`, the Popover API and Motion). `/dev/style-guide` shows them in `next dev`.
- Use `next/font`/`next/script`. For above-the-fold `next/image`, use `loading="eager"`; use `priority` sparingly.

## apps/api

Hono on Lambda behind an SST Router (CloudFront), deployed as two functions with the same code and links: the edge sends the viewer's own writes to a write function (`infra/apiWriteRoutes.ts`; a new route needs a row in `test/apiBulkhead.test.ts`). Validate with Valibot via `@hono/valibot-validator`. A CloudFront viewer-request function requires `x-api-key` on every request (`infra/apiEdgeInjection.ts`, mirrored by `src/middleware/apiKey.ts`). The exceptions: OPTIONS; GET/HEAD on the dashboard's metrics routes, which check an admin Bearer token in the handler (`requireAuthAdmin`); and POST on the scrobble webhook route with a `token` the edge finds in its KeyValueStore (media servers can't send the key; the route checks the token again).

Upstreams: TMDB (series data, watch providers via JustWatch), OMDb (IMDb ratings), MDBList (our curated lists only). Each has a circuit breaker and a per-instance budget (`src/lib/upstream`); answers are cached and served stale while they refresh.

`src/lambdas/` holds the non-HTTP handlers: DynamoDB stream subscribers (`watched`: lists and per-show summaries; `follow`), the Plex scrobble, metrics, account-deletion and import-undo queues, dominant-color extraction, and daily crons (watched-status validation and summary repair, metrics aggregation).

## Infrastructure

- Region `eu-west-2`. AWS profiles: `tvseries-production` / `tvseries-dev`. Stages: `production`, `pr-{n}`, local.
- Global transforms in `sst.config.ts`: every Lambda is arm64/Node 24 with the AWS SDK bundled; every CloudFront distribution gets geo-blocking (`infra/blockedCountries.ts`), Origin Shield and HTTP/3.
- **SST links**: a Lambda can only use `Resource.X` if X is in its `link` array. If you forget the link, it fails at runtime with "Resource not found".
- The CloudFront budget kill switch (`infra/distributionDisabler.ts`) is deployed in production only.

## CI/CD

`.github/workflows/`:

- `ci.yml`: format-and-lint, knip, check-types and unit tests on PRs and `main`; the web's Playwright suite (stub API, four shards) on PRs.
- `deploy.yml`: production on push to `main`, gated on the same checks.
- `deploy-pr.yml` / `cleanup-pr.yml`: preview stage per PR.

Domains: `www.tvseri.es` (Vercel, primary); `tvseri.es` redirects to www via CloudFront; previews at `pr-{n}.dev.tvseri.es`. `api.`, `auth.` and `dashboard.tvseri.es` are on AWS.

## Testing

Vitest, test-first (the `tdd` skill): each package's `vitest.config.ts`, run by `pnpm test` (turbo). Tests sit next to the code as `*.test.ts(x)` (`apps/api` keeps its route tests in `test/`, with an in-memory DynamoDB double); Node by default, `// @vitest-environment jsdom` for a test that renders React. Async Server Components are not unit-tested.

`apps/web/e2e` holds Playwright specs that run on `next build && next start` with Next's testing API (`EXPOSE_TESTING_API=1`) against a stub API and auth server (`e2e/stub-api`, `e2e/stub-auth`): one `instant()` test per route and entry point, placeholder parity, plus redirects as real no-follow requests. Never run `instant()` on `next dev`. The suite holds user journeys and regressions only a browser shows: no frame or timing samplers, no exact pixels, no width × data matrices (one phone and one desktop width per page kind, more only where a bug was); a layout rule that needs no browser is a unit test.

Several agents share one machine through `pnpm agents:*` (`tools/agents/README.md`): `agents:serve`/`agents:stop` for servers on their own ports (`--stub` wires the stub API), `agents:e2e [-- e2e/<spec>.ts]` and `agents:heavy` queue builds and Playwright, `agents:checks` runs lint, types, knip, tests and the web build in one slot.

## Tools

- **Context7**: use it for library/API docs, setup and configuration, without being asked.
- **Exa**: web search for current information.
- **grep.app**: real-world usage examples from public GitHub code.
- **Browser checks**: the Claude Chrome plugin against `http://localhost:3000` (`sst dev`). Never agent-browser, DevTools MCP or Playwright MCP.

## Skills

Always load these when working on React/frontend code:

- **vercel-react-best-practices**: React/Next.js performance.
- **vercel-composition-patterns**: component APIs, compound components, context.

Load these when the task touches their area (installed in `.claude/skills`, pinned in `skills-lock.json`):

- **next-dev-loop**: verify a web change in the running app (its `/_next/mcp` half; browser checks use the Chrome plugin).
- **next-cache-components-optimizer**, **next-partial-prefetching-adoption**, **next-bundle-optimizer**: caching, prefetching and bundle work in `apps/web`.
- **hono**: `apps/api` routes and middleware.
- **valibot**: schemas in `packages/schemas` and validation.
- **amazon-dynamodb**, **aws-sdk-js-v3-usage**, **aws-serverless**: tables, SDK calls, Lambdas and queues.
- **turborepo**: pipeline and workspace config.

User-invoked only: `/improve-codebase-architecture`, `/grill-with-docs`.
