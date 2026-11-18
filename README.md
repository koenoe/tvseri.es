# tvseri.es

Track the TV series you watch, and find the ones you haven't seen yet.

## Features

- **Home** built for discovery: a spotlight, top picks, hidden gems and a feature that rotate daily, plus rows from what you watch
- **Discover** with landings per genre, theme, network, country, language and decade
- **Series pages** with seasons, specials, IMDb ratings per episode and where to watch in your region
- **Tracking** per episode, season or series, with Undo on every mark
- **Library** (watching, watchlist, favourites, finished, hidden), a **History** diary and yearly **Stats** with a share card
- **Circle**: follow people and see how your taste matches theirs, and what they watch that you don't
- **Import** your history from a Netflix CSV export, and scrobble from **Plex** through a personal webhook
- **Person pages** with a career timeline, known-for work and awards
- **Search** for series and people, and `@handle` for profiles

## Stack

| | |
|---|---|
| Frontend | Next.js 16 (App Router, Cache Components), React 19, Tailwind v4, Motion, Zustand. Hosted on Vercel |
| API | Hono on AWS Lambda behind CloudFront |
| Auth | OpenAuth with Google and email codes (SES) |
| Data | DynamoDB, with Streams keeping lists and summaries current |
| Dashboard | Vite + TanStack Router/Query + shadcn, for metrics and admin |
| Infra | SST v4 on AWS (`eu-west-2`) |
| Tooling | pnpm, Turborepo, TypeScript 7, Biome, knip, Valibot, Vitest, Playwright |

Series data comes from [TMDB](https://www.themoviedb.org/settings/api), IMDb ratings from [OMDb](https://www.omdbapi.com), curated lists from [MDBList](https://mdblist.com/preferences/) and streaming availability from JustWatch, through TMDB.

## How it works

- **Static first.** Pages are prerendered or partially prerendered: shared content is cached in the static shell, and only what depends on the viewer streams in. The Next.js cache profiles and the API's `Cache-Control` come from the same `CACHE_LIFE` constants.
- **One `auth()` for Next.js.** It works in Server Components, Route Handlers and `proxy.ts`. OpenAuth rotates refresh tokens, so only the proxy refreshes; Server Components only read the session.
- **The API at the edge.** A CloudFront function checks the API key on every request; the viewer's own writes go to their own Lambda, so a slow upstream can't take the capacity marks need.
- **Stream-driven updates.** DynamoDB Streams keep the lists and the per-series summaries current when you mark episodes, and follower counts when you follow someone. A nightly job re-checks watched status and repairs the summaries.
- **Kind to upstreams.** TMDB, OMDb and MDBList answers are cached and served stale while they refresh; each service has a circuit breaker and a per-instance budget.
- **First-party metrics.** Web Vitals and API timings go through SQS into DynamoDB, are aggregated daily and are shown in the dashboard.
- **Cost protection.** An AWS Budget alarm triggers a Lambda that disables the CloudFront distributions in production. Every distribution blocks a list of countries.

The non-obvious rules and quirks are documented next to the code. Start at `apps/web/README.md`, which links the rest, including the API's list placement, import and account deletion.

## Getting started

Requirements: Node 24, pnpm 12, AWS profiles named `tvseries-dev` and `tvseries-production`, and a Vercel account.

1. Install dependencies (this also runs `sst install`):

   ```bash
   pnpm install
   ```

2. Export the environment variables the infra reads: `AWS_HOSTED_ZONE_ID_DEV`, `AWS_HOSTED_ZONE_ID_PROD`, `VERCEL_API_TOKEN` and `VERCEL_TEAM_ID` (`ALERT_EMAIL` is optional: where production alarms are sent).

3. Set the SST secrets for your stage with `sst secret set`:

   ```bash
   pnpm sst secret set TmdbApiKey <value>
   pnpm sst secret set TmdbApiAccessToken <value>
   pnpm sst secret set OmdbApiKey <value>
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
| `pnpm format-and-lint` | Biome check (`pnpm format-and-lint:fix` to write) |
| `pnpm check-types` | TypeScript across all packages and the infra |
| `pnpm knip` | Unused files, exports and dependencies |
| `pnpm test` | Vitest in every package |
| `pnpm --filter @tvseri.es/web e2e` | Playwright on a production build of the web, against a stub API |
| `pnpm --filter @tvseri.es/auth e2e` | Playwright for the sign-in pages |

## Deployment

GitHub Actions handles every deploy:

- Every PR runs format-and-lint, knip, check-types and the unit tests, plus the Playwright suites of the web and the sign-in pages (`e2e.yml`).
- Push to `main` deploys production after format-and-lint, knip, check-types and the unit tests: `www.tvseri.es`, with `tvseri.es` redirecting to www.
- Each PR gets a preview at `www.pr-{n}.dev.tvseri.es`, which is removed when the PR closes.

The web app is on Vercel. The API, auth and dashboard run on AWS.
