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
│   ├── web/        # Next.js 16 frontend (React 19)
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

This project uses **Biome** (not ESLint/Prettier):

- Single quotes, semicolons always, trailing commas
- Arrow parens always: `(x) => x`
- `noExplicitAny: error`
- Template literals over concatenation
- Imports auto-organised and sorted

### Code Reuse & DRY Principle

**Never copy-paste code.** Extract shared logic:

- **Cross-app**: `packages/utils`, `packages/schemas`, `packages/constants`
- **App-specific**: Dedicated files within the app
- **Feature-specific**: Shared file in the feature directory

Before writing new code, check if similar logic exists that can be imported or generalised.

### React Components

- **No inline props**: Extract computed values to variables before passing to JSX
- **`memo` with `displayName`**: Always set `displayName` before exporting with `memo()`
- **Split large components**: Separate into dedicated files when component exceeds ~100 lines
- **Props type**: Use `Readonly<{}>` for component props instead of `interface`

## Commands

```bash
pnpm sst dev              # Start all services in development mode
pnpm format-and-lint      # Check formatting/linting
pnpm format-and-lint:fix  # Fix formatting/linting issues
pnpm check-types          # Check TypeScript types across all packages
pnpm install              # Install dependencies (triggers sst install)
```

Never run `sst deploy` commands — deployments happen via CI.

## TypeScript Guidelines

- **Strict mode**: No `any` — use `unknown` and narrow, or define proper interfaces
- **Prefer `Readonly<>`**: Wrap object/interface types for immutability
- **Type-only imports**: Use `import type { X } from 'y'` where applicable
- **Shared types**: Define in `packages/schemas`, export from barrel file
- All packages extend from `@tvseri.es/typescript-config/base.json`

## App-Specific Guidelines

### `apps/web` - Next.js Frontend

Next.js 16 with App Router, React 19, Tailwind CSS. State: Zustand, XState. Animation: Motion.

Deployed via OpenNext (`@opennextjs/aws`) through SST.

### `apps/api` - Hono API

Hono on AWS Lambda. Validation: Valibot with `@hono/valibot-validator`.

### `apps/auth` - Authentication

OpenAuth (`@openauthjs/openauth`) with Google OIDC and Email OTP providers.

## Infrastructure (SST)

- **Config**: `sst.config.ts` + `infra/*.ts`
- **Stages**: `production`, `pr-{number}` (preview), local dev

### SST Links

SST uses **links** to connect resources. When a Lambda needs access to a resource (DynamoDB table, secret, queue), it must be explicitly linked in the infrastructure definition.

**Critical:** If you add code using `Resource.SomeTable.name` but forget to link it, the Lambda will fail at runtime with "Resource not found".

### Deployment

Deployments happen via CI only. Never run `sst deploy` manually.

## CI/CD

Located in `.github/workflows/`. Runs `format-and-lint` and `check-types` on PRs, deploys to production on push to main, and creates preview environments (`pr-{n}.dev.tvseri.es`) for PRs.

## Testing

No unit tests yet. When added, they will use **Vitest**.

## Working with Packages

Packages export raw TypeScript (not built/published). Apps transpile and bundle them directly.

### Creating a New Package

1. Create directory in `packages/` with `package.json` (name: `@tvseri.es/{name}`)
2. Extend `@tvseri.es/typescript-config` in `tsconfig.json`
3. Export from `src/index.ts`
4. Add to consuming app: `"@tvseri.es/{name}": "workspace:*"`

### Importing Shared Code

```typescript
import { someConstant } from '@tvseri.es/constants';
import { SomeSchema, type SomeType } from '@tvseri.es/schemas';
import { someUtil } from '@tvseri.es/utils';
```

## MCP Tools

**Always use Context7** when code generation, setup/configuration steps, or library/API documentation is needed. Automatically use the Context7 MCP tools to resolve library IDs and fetch library docs without being explicitly asked.

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
