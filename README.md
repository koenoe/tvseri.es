# tvseri.es

Track the TV shows you watch, and find the ones you haven't seen yet.

## Features

- **Discover** with filters for genre, country, language and your streaming services
- **Episode tracking** per season, with progress
- **Lists**: favorites, watchlist, in progress, finished, and watch history
- **Where to watch**: streaming availability in your region
- **Plex scrobbling** through a personal webhook
- **CSV import** of existing watch history
- **Profiles** with followers and following
- **Yearly stats**: charts, world map and viewing streaks

## Stack

| | |
|---|---|
| Frontend | Next.js 16 (App Router, Cache Components), React 19, Tailwind, Zustand, Motion. Hosted on Vercel |
| API | Hono on AWS Lambda behind CloudFront |
| Auth | OpenAuth with Google and email OTP (SES) |
| Data | DynamoDB, with Streams driving list and follower updates |
| Dashboard | Vite + TanStack Router/Query + shadcn, for metrics and admin |
| Infra | SST v4 on AWS (`eu-west-2`) |
| Tooling | pnpm, Turborepo, Biome, knip, Valibot |

External data comes from [TMDB](https://www.themoviedb.org/settings/api) (series metadata) and [mdblist](https://mdblist.com/preferences/) (IMDb ratings and curated lists).

## How it works

- **One `auth()` for Next.js.** It works in Server Components, Route Handlers and `proxy.ts`. OpenAuth rotates refresh tokens, so only contexts that can write the session cookie refresh it. Server Components read the session without refreshing.
- **Caching follows the API.** The `use cache` profiles in Next are generated from the same `CACHE_LIFE` constants that set the API's `Cache-Control` headers.
- **Stream-driven updates.** DynamoDB Streams trigger Lambdas that update lists when you mark episodes watched, and follower counts when you follow someone. A daily cron re-checks each user's watched status through a queue.
- **First-party metrics.** Web Vitals and API timings go through SQS into DynamoDB, are aggregated daily, and are shown in the dashboard.
- **Cost protection.** An AWS Budget alarm triggers a Lambda that disables the CloudFront distributions in production.
- **Edge checks.** A CloudFront function requires an API key on API requests, and every distribution blocks a list of countries.
- **Dominant colors** are extracted from artwork and adjusted to pass WCAG contrast.

## Getting started

Requirements: Node 24, pnpm 12, AWS profiles named `tvseries-dev` and `tvseries-production`, and a Vercel account.

1. Install dependencies (this also runs `sst install`):

   ```bash
   pnpm install
   ```

2. Export the environment variables the infra reads: `AWS_HOSTED_ZONE_ID_DEV`, `AWS_HOSTED_ZONE_ID_PROD`, `VERCEL_API_TOKEN` and `VERCEL_TEAM_ID`.

3. Set the SST secrets for your stage:

   ```bash
   pnpm sst secret set TmdbApiKey <value>
   pnpm sst secret set TmdbApiAccessToken <value>
   pnpm sst secret set MdblistApiKey <value>
   pnpm sst secret set GoogleClientId <value>
   pnpm sst secret set SessionSecret <value>
   ```

4. Start everything:

   ```bash
   pnpm dev
   ```

   To point the local dashboard at the production API, set `DASHBOARD_USE_PROD_API=1`.

## Scripts

| Command | |
|---|---|
| `pnpm dev` | Run all services with `sst dev` |
| `pnpm format-and-lint` | Biome check (`:fix` to write) |
| `pnpm check-types` | TypeScript across all packages |
| `pnpm knip` | Unused files, exports and dependencies |

## Project structure

```
apps/
  web/          Next.js frontend
  api/          Hono API and the Lambda handlers in src/lambdas
  auth/         OpenAuth service
  dashboard/    Internal dashboard
packages/
  constants/    Shared constants
  schemas/      Valibot schemas and types
  utils/        Shared utilities
  kill-switch/  Cost-protection handlers
  typescript-config/
infra/
  web.ts                  Vercel project, domains, apex redirect
  api.ts                  API Router + Lambda
  auth.ts                 Auth service
  dashboard.ts            Dashboard static site
  dns.ts, email.ts        Route 53, SES
  secrets.ts              SST secrets
  scrobbleQueue.ts        Plex scrobble queue
  watchedStatus.ts        Daily watched-status check
  metrics.ts              Metrics queue and aggregation crons
  dominantColor.ts        Artwork color extraction
  distributionDisabler.ts Budget kill switch
  blockedCountries.ts     CloudFront geo-blocking
  dynamo/                 Tables: cache, follow, lists, metrics, preferredImages, users, watched, webhookTokens
```

## Deployment

GitHub Actions handles every deploy:

- Push to `main` deploys production: `www.tvseri.es`, with `tvseri.es` redirecting to www.
- Each PR gets a preview at `pr-{n}.dev.tvseri.es`, which is removed when the PR closes.

The web app is on Vercel. The API, auth and dashboard run on AWS.
