# CLAUDE.md

tvseri.es is a TV series tracker. Its main goal is helping users discover shows they haven't watched yet. It's a pnpm + Turborepo monorepo in strict TypeScript, deployed with SST v4 on AWS (the web app runs on Vercel).

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
- **Auth**: use `auth()` from `src/auth`. It resolves the OpenAuth session per context (`RSC`, `RouteHandler`, `Proxy`). RSC is read-only and never refreshes tokens: OpenAuth rotates refresh tokens and RSC can't write the new cookie, so refreshing there would log the user out.
- Client state: Zustand. Animation: Motion. Styling: **Tailwind v3** (the dashboard uses v4, so don't mix syntax).
- Use `next/font`/`next/script`. For above-the-fold `next/image`, use `loading="eager"`; use `priority` sparingly.

## apps/api

Hono on Lambda behind an SST Router (CloudFront). Validate with Valibot via `@hono/valibot-validator`. A CloudFront viewer-request function requires `x-api-key` on every request. The only exception is GET/HEAD on the dashboard's metrics routes, which check an admin Bearer token in the handler (`requireAuthAdmin`).

`src/lambdas/` holds the non-HTTP handlers: DynamoDB stream subscribers (`watched`, `follow`), Plex scrobble and metrics queues, dominant-color extraction, and daily crons (watched-status validation, metrics aggregation).

## Infrastructure

- Region `eu-west-2`. AWS profiles: `tvseries-production` / `tvseries-dev`. Stages: `production`, `pr-{n}`, local.
- Global transforms in `sst.config.ts`: every Lambda is arm64/Node 24 with the AWS SDK bundled; every CloudFront distribution gets geo-blocking (`infra/blockedCountries.ts`), Origin Shield and HTTP/3.
- **SST links**: a Lambda can only use `Resource.X` if X is in its `link` array. If you forget the link, it fails at runtime with "Resource not found".
- The CloudFront budget kill switch (`infra/distributionDisabler.ts`) is deployed in production only.

## CI/CD

`.github/workflows/`:

- `lint.yml`: format-and-lint, check-types and knip on PRs.
- `deploy.yml`: production on push to `main`.
- `deploy-pr.yml` / `cleanup-pr.yml`: preview stage per PR.

Domains: `www.tvseri.es` (Vercel, primary); `tvseri.es` redirects to www via CloudFront; previews at `pr-{n}.dev.tvseri.es`. `api.`, `auth.` and `dashboard.tvseri.es` are on AWS.

## Testing

There are no tests yet. When added, they'll use Vitest.

## Tools

- **Context7**: use it for library/API docs, setup and configuration, without being asked.
- **Exa**: web search for current information.
- **grep.app**: real-world usage examples from public GitHub code.
- **Browser checks**: always use the `agent-browser` CLI, never DevTools MCP or Playwright MCP.

## Skills

Always load these when working on React/frontend code:

- **vercel-react-best-practices**: React/Next.js performance.
- **vercel-composition-patterns**: component APIs, compound components, context.

Load these when the task touches their area (installed in `.claude/skills`, pinned in `skills-lock.json`):

- **next-dev-loop**: verify a web change in the running app.
- **next-cache-components-optimizer**, **next-partial-prefetching-adoption**, **next-bundle-optimizer**: caching, prefetching and bundle work in `apps/web`.
- **hono**: `apps/api` routes and middleware.
- **valibot**: schemas in `packages/schemas` and validation.
- **amazon-dynamodb**, **aws-sdk-js-v3-usage**, **aws-serverless**: tables, SDK calls, Lambdas and queues.
- **turborepo**: pipeline and workspace config.

User-invoked only: `/improve-codebase-architecture`, `/grill-with-docs`.
