# tvseri.es

A TV series tracking app

## Features

- **Episode tracking** with progress indicators per season
- **Lists** for favorites, watchlist, in progress, and watched
- **Discover** with filters for genre, country, language, and streaming services
- **Plex scrobbling** via webhooks for automatic tracking
- **CSV import** for migrating watch history
- **User profiles** with follow/following
- **Yearly stats** with charts, world map, and viewing streaks
- **Where to watch** showing streaming availability in your region

## Setup

### Prerequisites

- Node.js 22+
- pnpm 10+
- AWS account with configured profiles

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment variables for AWS hosted zone IDs and SST secrets.

3. Start the development server:

```bash
pnpm sst dev
```

## External APIs

- [TMDB](https://www.themoviedb.org/settings/api) – TV series metadata
- [mdblist](https://mdblist.com/preferences/) – IMDb ratings and curated lists

## Tech Stack

- **Next.js 16** (App Router, Server Components) – React 19 frontend
- **Vercel** – Hosting for Next.js frontend
- **Hono** – API on AWS Lambda
- **OpenAuth** – Authentication (Google, Email OTP)
- **DynamoDB** – Database with Streams for real-time list updates
- **SST v3** – Infrastructure on AWS
- **Turborepo** – Monorepo orchestration
- **XState** – State machines for session management
- **Zustand** – Client state
- **Tailwind CSS** – Styling
- **Valibot** – Schema validation
- **Biome** – Formatting and linting

### Highlights

- **Single `auth()` function** for Next.js extending OpenAuth's client — overloaded for RSC, Route Handlers, and Middleware with a cookie jar abstraction to handle the RSC cookie limitation, paired with XState for client-side token refresh
- **DynamoDB Streams** trigger Lambdas to auto-update lists when episodes are marked watched and follower/following counts when users follow/unfollow
- **Cost protection** via AWS Budget alerts + CloudWatch metrics that auto-disable CloudFront
- **Dominant color extraction** from images with WCAG contrast correction
- **Edge functions** for blocking malicious requests at CloudFront

## Project Structure

```
├── apps/
│   ├── web/                  # Next.js frontend
│   ├── api/                  # Hono API (Lambda)
│   └── auth/                 # OpenAuth service
├── packages/
│   ├── constants/            # Shared constants
│   ├── schemas/              # Valibot schemas & types
│   ├── utils/                # Shared utilities
│   └── kill-switch/          # Cost protection handlers
└── infra/
    ├── api.ts                # API Gateway + Lambda
    ├── auth.ts               # Auth service
    ├── web.ts                # Next.js on Vercel + apex redirect
    ├── dns.ts                # Route 53 config
    ├── email.ts              # SES email
    ├── secrets.ts            # SST Secrets
    ├── scrobbleQueue.ts      # SQS + Lambda for Plex
    ├── watchedStatus.ts      # Daily cron for list updates
    ├── dominantColor.ts      # Image color extraction
    ├── distributionDisabler.ts   # Cost protection
    └── dynamo/
        ├── cache.ts          # Cache table (TTL)
        ├── follow.ts         # Follow relationships + stream subscriber
        ├── lists.ts          # User lists
        ├── users.ts          # User accounts
        ├── watched.ts        # Watched episodes + stream subscriber
        ├── preferredImages.ts    # Admin image overrides
        └── webhookTokens.ts  # Plex webhook tokens
```

## Scripts

- `pnpm sst dev` – Start dev server
- `pnpm format-and-lint` – Check formatting and lint
- `pnpm format-and-lint:fix` – Fix issues
- `pnpm check-types` – TypeScript checks

## Deployment

Deployed via GitHub Actions:

- Push to `main` → Production (`www.tvseri.es`, apex redirects to www)
- PR to `main` → Preview (`pr-{n}.dev.tvseri.es`)

Frontend (`apps/web`) deploys to **Vercel**. API, Auth, and Dashboard remain on **AWS**.
