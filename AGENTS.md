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
- **Imports**: Auto-organised and sorted
- **Formatting**: Uses `.editorconfig` (2 spaces, UTF-8, final newline)

### Code Reuse & DRY Principle

**Never copy-paste code.** Always extract shared logic into reusable modules:

- **Cross-app utilities**: Place in `packages/utils` for reuse across all apps
- **Cross-app types/schemas**: Place in `packages/schemas`
- **Cross-app constants**: Place in `packages/constants`
- **App-specific shared code**: Create dedicated files within the app's directory structure
- **Feature-specific shared code**: When files in the same feature/directory share logic, extract to a shared file

**Examples:**

```
# Bad: Duplicating a utility function across apps
apps/web/src/utils/formatDate.ts  → defines formatDate()
apps/api/src/utils/formatDate.ts  → copy-pastes formatDate()

# Good: Extract to shared package
packages/utils/src/formatDate.ts  → exports formatDate()
apps/web/...                      → imports from @tvseri.es/utils
apps/api/...                      → imports from @tvseri.es/utils
```

```
# Bad: Duplicating logic within the same app
apps/web/src/components/List.tsx      → defines useListData()
apps/web/src/components/ListGrid.tsx  → copy-pastes useListData()

# Good: Extract to shared hook
apps/web/src/hooks/useListData.ts     → exports useListData()
apps/web/src/components/List.tsx      → imports from hooks
apps/web/src/components/ListGrid.tsx  → imports from hooks
```

Before writing new code, check if similar logic already exists that can be:
1. Imported directly from an existing package or file
2. Extracted into a shared module (package for cross-app, local file for app-specific)
3. Generalised to handle both use cases

## Commands

### Development

```bash
# Start all services in development mode
pnpm sst dev
```

This runs the full stack locally with live reload via SST's dev mode.
Never run any sst deploy commands.

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

### SST Links

SST uses **links** to connect resources (Lambdas, APIs) to other resources (DynamoDB tables, secrets, queues). When a Lambda needs access to a resource, it must be explicitly linked.

**Critical rule:** When modifying a Lambda to use a new resource (e.g., adding DynamoDB table access), you **must** add the resource to the Lambda's `link` array in the infrastructure definition.

**Example:**

```typescript
// infra/dynamo/watched.ts
watched.subscribe(
  'WatchedSubscriber',
  {
    handler: 'apps/api/src/lambdas/watched.handler',
    link: [
      cache,           // ← Lambda can access Cache table
      dominantColor,   // ← Lambda can invoke dominantColor function
      lists,           // ← Lambda can access Lists table
      secrets.tmdbApiKey, // ← Lambda can read TMDB API key
    ],
  },
);
```

**If you add code that uses `Resource.SomeTable.name` but forget to link it, the Lambda will fail at runtime with a "Resource not found" error.**

Before adding imports like `import { Resource } from 'sst';` to a Lambda file, verify the resource is linked in the corresponding `infra/*.ts` file.

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
