# Webapp Template

This file extends the global `~/.claude/CLAUDE.md`. See that file for general engineering rules.

---

## Stack

TypeScript (strict mode), Prisma ORM, PostgreSQL 16, Redis 7, Better Auth 1.5.6, Stripe billing, Docker Compose.

Monorepo with npm workspaces: `apps/backend`, `apps/frontend`, `packages/shared`.

**External Documentation:**

- Better Auth: https://www.better-auth.com/llms.txt

---

## Development Model (Hybrid Docker)

- **Infrastructure runs in Docker** (Postgres, Redis, pgAdmin): `npm run docker:up`
- **App code runs on the host** for hot-reload: `npm run dev`
- **Production runs fully in Docker**: `npm run docker:prod`

```bash
# Start infrastructure
npm run docker:up

# Start dev servers (backend + frontend concurrently)
npm run dev

# Or individually
npm run dev:backend
npm run dev:frontend
```

Do NOT run `npm install` or application commands inside Docker containers in dev — only use Docker for infrastructure and production builds.

---

## Type Checking

Vitest and esbuild strip types without checking them. **Passing tests does NOT mean the code compiles.**

Before marking any change complete:

```bash
npx tsc --noEmit --project apps/backend/tsconfig.json
npx tsc --noEmit --project apps/frontend/tsconfig.json
npx tsc --noEmit --project packages/shared/tsconfig.json
```

All must exit 0. If there are pre-existing errors in files you did not touch, flag them to the user.

---

## Code Style

- **Prettier**: semi: true, singleQuote: true, trailingComma: all, printWidth: 100, tabWidth: 2
- **ESLint**: root config extends typescript-eslint + prettier
- **Naming**: camelCase for variables/functions, PascalCase for types/components, kebab-case for files
- Avoid `any` — use `unknown` and narrow, or define proper types

---

## Testing

```bash
# All workspaces
npm run test

# Individual
npm run test:backend
npm run test:frontend

# Coverage
npm run test:coverage --workspace=apps/backend
npm run test:coverage --workspace=apps/frontend
```

- **Framework:** Vitest (all packages)
- **Frontend:** jsdom + React Testing Library
- **E2E:** Playwright (Chromium)
- **Test location:** `src/__tests__/` directories in each workspace
- **Shared package:** has its own test suite for validation schemas

---

## Linting & Formatting

```bash
npm run lint
npm run lint:fix
npm run format:check
npm run format
```

Husky pre-commit hook runs Prettier via lint-staged on TS/JSON/MD files.

---

## Database and Prisma

- Schema: `apps/backend/src/prisma/schema.prisma` (12 models) — **read it before any database work**
- Better Auth tables use `@@map("lowercase")` with `String @id @default(cuid())`
- Models: User, Session, Account, Verification, Organization, OrganizationMember, OrganizationInvitation, Subscription, UsageRecord, AuditLog, Project, Task

```bash
npm run db:generate       # Generate Prisma client
npm run db:migrate        # Run migrations (dev)
npm run db:migrate:prod   # Deploy migrations (production)
npm run db:seed           # Seed test data
npm run db:studio         # Prisma Studio GUI
```

- **NEVER reset or wipe the database without explicit user permission** — `prisma migrate reset` or `prisma db push --force-reset` is FORBIDDEN unless the user explicitly asks

---

## Better Auth

- Config: `apps/backend/src/config/auth.config.ts`
- Frontend auth hooks: `apps/frontend/src/hooks/useAuth.ts`
- Plugins: admin, organization
- New users auto-banned (pending admin approval)

**Express middleware ordering is critical — do not change** (in `apps/backend/src/index.ts`):

1. Helmet
2. CORS
3. **Better Auth handler BEFORE `express.json()`** — `app.all('/api/auth/*', toNodeHandler(auth))`
4. `express.json()` and `express.urlencoded()`
5. CSRF protection
6. Request logging
7. Routes

---

## Project Architecture

**Application type:** Full-stack web app template — multi-tenant SaaS with auth, organizations, billing, and role-based access.

**Key directories:**

```
apps/backend/
  src/
    index.ts                    # Express entry point
    config/                     # auth, database, redis, email, stripe
    controllers/                # Route handlers
    middleware/                  # auth, error, validation, csrf, rate-limit
    routes/                     # Express routers
    services/                   # Business logic
    prisma/                     # Schema, migrations, seed
    types/                      # TypeScript types
    utils/                      # Logger, error classes
    __tests__/                  # Tests

apps/frontend/
  src/
    App.tsx                     # Routes and layout
    components/                 # UI (auth, layout, organization, common)
    pages/                      # Auth, dashboard, admin, org, billing
    hooks/                      # useAuth and custom hooks
    lib/                        # API client, utilities
    types/                      # TypeScript types
    __tests__/                  # Tests

packages/shared/
  src/
    types/                      # Shared TypeScript interfaces
    validation/                 # Zod schemas for request validation
    utils/                      # Shared utilities
```

**Ports:**
| Service | Port |
|-----------|------|
| Frontend | 5173 |
| Backend | 3001 |
| Postgres | 5432 |
| Redis | 6379 |
| pgAdmin | 5050 |

**Key decisions:**

- Auth: Better Auth with email/password, admin approval workflow, organizations
- Monorepo: npm workspaces with shared types/validation package
- State: TanStack Query for server data, Zustand for client state
- Styling: Tailwind CSS 3.4 + shadcn/ui
- Billing: Stripe subscriptions with usage metering
- Email: Postmark (test mode in dev)
- CSRF: csrf-csrf middleware

---

## Seed Data

- Test users: `admin@example.com` / `Admin123!`, `user1@example.com` / `User123!`, `user2@example.com` / `User123!`
- Test org: "Acme Corporation" with members
