# AGENTS.md

> Guidelines for AI coding agents working on the tvseri.es codebase.

## Project Overview

**tvseri.es** is a TV series tracking application built as a monorepo using:

- **Package Manager**: pnpm (v10.x) - enforced via `preinstall` script
- **Node.js**: v22.x (see `.node-version`)
- **Build Orchestration**: Turborepo
- **Infrastructure**: SST (Serverless Stack) v3 on AWS
- **Language**: TypeScript (strict mode, no `any`)

## Monorepo Structure

```
├── apps/
│   ├── web/        # Next.js 19 frontend (React 19)
│   ├── api/        # Hono API (AWS Lambda)
│   └── auth/       # OpenAuth authentication service
├── packages/
│   ├── constants/  # Shared constants
│   ├── schemas/    # Valibot schemas & shared types
│   ├── utils/      # Shared utilities
│   └── typescript-config/  # Shared TS configs
└── infra/          # SST infrastructure definitions
```

## Code Style & Formatting

### Biome Configuration

This project uses **Biome** (not ESLint/Prettier) for formatting and linting.

**Key rules:**

- **Quotes**: Single quotes (`'`)
- **Semicolons**: Always
- **Trailing commas**: All
- **Arrow parens**: Always (`(x) => x`)
- **No `any`**: `noExplicitAny: error`
- **Template literals**: Use template strings over concatenation
- **Imports**: Auto-organized and sorted
- **Formatting**: Uses `.editorconfig` (2 spaces, UTF-8, final newline)

## Commands

### Development

```bash
# Start all services in development mode
pnpm sst dev
```

This runs the full stack locally with live reload via SST's dev mode.

### After Making Changes

**Always run these commands after modifying code:**

```bash
# Format and lint (will error on issues)
pnpm format-and-lint

# Fix formatting and lint issues automatically
pnpm format-and-lint:fix

# Check TypeScript types across all packages
pnpm check-types
```

### Installation

```bash
pnpm install
```

> Note: `pnpm install` triggers `sst install` via `postinstall` to set up SST types.

## TypeScript Guidelines

### Strict Mode

- **No `any`**: Use `unknown` and narrow types, or define proper interfaces
- **Prefer `Readonly<>`**: Use `Readonly<>` types when possible for immutability
- All packages extend from `@tvseri.es/typescript-config/base.json`
- Use type-only imports where applicable: `import type { X } from 'y'`

### Shared Types

- Define shared types/schemas in `packages/schemas`
- Use Valibot for runtime validation schemas
- Export from the package's `index.ts` barrel file

## App-Specific Guidelines

### `apps/web` - Next.js Frontend

- **Framework**: Next.js 19 with App Router
- **React**: 19.2.0
- **Styling**: Tailwind CSS 3.x
- **State**: Zustand, XState
- **Animation**: Motion (Framer Motion)
- **Deployment**: OpenNext (`@opennextjs/aws`) via SST

> **OpenNext**: SST uses [OpenNext](https://opennext.js.org/) under the hood to deploy Next.js to AWS Lambda + CloudFront. The `open-next.config.ts` file in `apps/web` configures this. When troubleshooting deployment issues, check both SST and OpenNext docs.

Key directories:

- `src/app/` - App Router pages and layouts
- `src/components/` - React components
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility libraries
- `src/utils/` - Helper functions

### `apps/api` - Hono API

- **Framework**: Hono (running on AWS Lambda)
- **Validation**: Valibot with `@hono/valibot-validator`
- **AWS SDK**: DynamoDB, SQS, Lambda, CloudFront, SES

Key directories:

- `src/routes/` - API route handlers
- `src/middleware/` - Hono middleware
- `src/lib/` - Business logic
- `src/lambdas/` - Standalone Lambda functions (crons, queues)

### `apps/auth` - Authentication

- **Framework**: OpenAuth (`@openauthjs/openauth`)
- **Providers**: Google OIDC, Email OTP (Code)
- **UI**: Custom Hono-based UI components

## Infrastructure (SST)

### Configuration

- **Config file**: `sst.config.ts`
- **Infrastructure modules**: `infra/*.ts`
- **Stages**: `production`, `pr-{number}` (preview), local dev

### Key Resources

| Resource | Description |
|----------|-------------|
| `infra/web.ts` | Next.js deployment (CloudFront + Lambda) |
| `infra/api.ts` | API Router + Lambda function |
| `infra/auth.ts` | OpenAuth service |
| `infra/dynamo.ts` | DynamoDB tables |
| `infra/dynamo/*.ts` | Individual table definitions |
| `infra/secrets.ts` | SST Secrets (API keys, etc.) |

### Deployment

```bash
# Deploy to a stage
pnpm sst deploy --stage <stage-name>

# Deploy to production (CI only - runs on push to main)
pnpm sst deploy --stage production
```

## CI/CD Workflows

Located in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `lint.yml` | Push/PR to main | Runs `format-and-lint` and `check-types` |
| `deploy.yml` | Push to main | Deploys to production |
| `deploy-pr.yml` | PR to main | Creates preview environment at `pr-{n}.dev.tvseri.es` |
| `cleanup-pr.yml` | PR closed | Removes preview environment |

## Testing

> **Note**: No unit tests are configured yet. When added, they will use **Vitest**.

## Working with Packages

Packages are **not built or published** — they export raw TypeScript that apps import directly. Each app (web, api, auth) is responsible for transpiling and bundling.

### Creating a New Package

1. Create directory in `packages/`
2. Add `package.json` with name `@tvseri.es/{name}`
3. Extend `@tvseri.es/typescript-config` in `tsconfig.json`
4. Export from `src/index.ts`
5. Add to consuming app's dependencies: `"@tvseri.es/{name}": "workspace:*"`

### Importing Shared Code

```typescript
import { someConstant } from '@tvseri.es/constants';
import { SomeSchema, type SomeType } from '@tvseri.es/schemas';
import { someUtil } from '@tvseri.es/utils';
```

## Common Patterns

### API Route Handler (Hono)

```typescript
import { Hono } from 'hono';
import { vValidator } from '@hono/valibot-validator';
import * as v from 'valibot';

const app = new Hono();

const schema = v.object({
  id: v.string(),
});

app.get('/:id', vValidator('param', schema), async (c) => {
  const { id } = c.req.valid('param');
  // ...
  return c.json({ data });
});

export default app;
```

### DynamoDB Access

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Resource } from 'sst';

const client = new DynamoDBClient({});
const tableName = Resource.TableName.name;
```

## Agent Checklist

Before submitting changes:

- [ ] Run `pnpm format-and-lint:fix`
- [ ] Run `pnpm check-types`
- [ ] Ensure no `any` types are introduced
- [ ] Use single quotes, 2-space indentation
- [ ] Sort object keys alphabetically
- [ ] Use template literals for string concatenation
- [ ] Add types to `packages/schemas` if creating shared types
- [ ] Test locally with `pnpm sst dev` if possible
