# Webapp Template

This file extends the global `~/.claude/CLAUDE.md`. See that file for general engineering rules.

---

## Stack

TypeScript (strict mode), Prisma 6, PostgreSQL 16, Redis 7, Better Auth 1.7, Stripe billing, Docker Compose.

Frontend: React 19, Vite 6, Vitest 4, Tailwind 4, react-router-dom 7, TanStack Query, Zustand.

Monorepo with npm workspaces: `apps/backend`, `apps/frontend`, `packages/shared`.

**External Documentation:**

- Better Auth: https://www.better-auth.com/llms.txt

---

## Work Tracking

This project uses a hierarchy of Initiative → Epic → Story → Task. The vocabulary, label conventions, and lifecycle diagram are in `docs/glossary.md`. The discovery Q&A playbook is at `docs/discovery-qa.md`. Read both at the start of any session where work-tracking decisions might arise.

**Critical behaviors:**

- When the user describes a new product or feature idea, follow `docs/discovery-qa.md`. The playbook produces a draft PRD at `docs/prds/<slug>.md` via structured Q&A.
- After PRD approval, propose Epics and initial Stories as a markdown draft for user review **before** filing GitHub issues. Use `gh issue create --template <template>.md` only after the user signs off on the proposal.
- When making a non-trivial technical decision during implementation (database choice, framework, schema design, integration approach, deployment model), write an ADR using `docs/templates/adr-template.md` to `docs/adrs/NNN-<slug>.md`. Number sequentially.

Skip discovery for tactical work — bugs, refactors, security fixes, focused stories, or single tasks. Use the appropriate `.github/ISSUE_TEMPLATE/` directly.

If the scope is unclear, ask the user once: _"Is this a focused fix/feature or a multi-week effort that deserves a PRD?"_ Then proceed accordingly.

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
- **ESLint**: flat config at `eslint.config.mjs` (ESLint 9) covering all three workspaces. There is no `.eslintrc`, and `--ext` is not a valid flag.
  - The frontend lints with `--max-warnings 0`, so a warning fails CI there. The backend does not.
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
- **E2E:** not yet implemented — a Playwright job is scaffolded in `.github/workflows/e2e.yml` (manual-only until a config + tests exist)
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

- Schema: `apps/backend/src/prisma/schema.prisma` (13 models) — **read it before any database work**
- Migrations: `apps/backend/src/prisma/migrations/` — starts from a baseline capturing the original schema
- **Use Prisma's query builder exclusively** — never `prisma.$queryRaw` or raw SQL; it bypasses type safety and tenant scoping, and breaks on schema changes
- Better Auth tables use `@@map("lowercase")` with `String @id @default(cuid())`
- Models: User, Session, Account, Verification, Organization, OrganizationDomain, OrganizationMember, OrganizationInvitation, Subscription, UsageRecord, AuditLog, Project, Task
- `Account.issuer` is **required** by Better Auth ≥ 1.7. Sign-in matches on `(providerId, issuer, accountId)`; a row without it is invisible to the credential provider and the user is reported as "not found" even though the row and password hash are valid. Credential accounts use the synthetic issuer `local:credential`.
- Passwords live on `Account.password`, hashed by Better Auth (scrypt). There is deliberately no password column on `User` — use `hashPassword` from `better-auth/crypto` if you ever need to write one directly, as `seed.ts` does.
- Model naming deviates from Better Auth's defaults for two tables (`OrganizationMember`, `OrganizationInvitation`) via the plugin's `schema` option — see `docs/adrs/005-keep-explicit-organization-model-names.md`

```bash
npm run db:generate       # Generate Prisma client
npm run db:migrate        # Run migrations (dev)
npm run db:migrate:prod   # Deploy migrations (production)
npm run db:seed           # Seed test data
npm run db:studio         # Prisma Studio GUI
```

- **NEVER reset or wipe the database without explicit user permission** — `prisma migrate reset` or `prisma db push --force-reset` is FORBIDDEN unless the user explicitly asks. If a migration fails or Prisma prompts for a reset, **STOP and ask** before proceeding — data loss is painful to recover from

---

## Better Auth

- Config: `apps/backend/src/config/auth.config.ts`
- Frontend auth state: `apps/frontend/src/contexts/AuthContext.tsx` (`@/hooks/useAuth` re-exports it)
- Plugins: admin, organization
- New users auto-banned (pending admin approval), **except** an email listed in `ADMIN_EMAILS`, which becomes an admin on signup. Without that bypass a fresh deployment has nobody able to approve anyone.
- Signup auto-joins the organization owning the email's domain, if an `OrganizationDomain` row matches. The first user into an org becomes its `owner`.

**Session state is read from the database, not the cookie cache.** `session.cookieCache` is enabled, but `requireAuth` re-reads `activeOrganizationId`, `impersonatedBy` and ban state from the session row. Do not "optimise away" that query — see `docs/adrs/004-session-state-read-from-database.md`.

**Express middleware ordering is critical — do not change** (in `apps/backend/src/app.ts`):

1. Timeout + Request ID
2. Helmet
3. CORS
4. Cookie parser
5. Rate limiting
6. **Better Auth handler BEFORE `express.json()`** — `app.all('/api/auth/*', toNodeHandler(auth))`
7. `express.json()` and `express.urlencoded()` (skips Stripe webhook — needs raw body)
8. CSRF protection (skips webhooks and auth routes)
9. Request logging
10. Routes

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

| Service  | Port |
| -------- | ---- |
| Frontend | 5173 |
| Backend  | 3001 |
| Postgres | 5432 |
| Redis    | 6379 |
| pgAdmin  | 5050 |

**Key decisions:**

- Auth: Better Auth with email/password, admin approval workflow, organizations
- Monorepo: npm workspaces with shared types/validation package
- State: TanStack Query for server data, Zustand for client state
- Styling: Tailwind CSS 4 + shadcn/ui — **CSS-first, there is no `tailwind.config.js`**; the theme lives in `apps/frontend/src/styles/globals.css` under `@theme`
- Billing: Stripe subscriptions with usage metering, gated by `requireActiveSubscription`
- Email: Postmark (test mode in dev)
- CSRF: csrf-csrf middleware

Decisions with lasting consequences are recorded in `docs/adrs/`. Read those before changing tenancy, billing enforcement, session handling or theming.

---

## Multi-Tenancy

**Every tenant-scoped query must go through `apps/backend/src/services/access-control.service.ts`.** Do not query `organizationMember` directly in a controller — that is what produced three conflicting scoping rules in one file before this layer existed. `project.controller.ts` is the worked example to copy.

```ts
const ctx = ctxFromRequest(req);

// Filter a list:
const where = { ...(await orgScopeWhere(ctx)), status: 'active' };

// Authorize one organization, or a role within it:
await assertOrgAccess(ctx, organizationId);
await assertOrgRole(ctx, organizationId, ['owner', 'admin']);
```

`getAccessibleOrgIds` returns `string[] | null`. **`null` means platform-wide (no filter) and is returned only for an unscoped system admin; an empty array means "sees nothing" and must still be applied as a filter.** Use the wrappers above rather than branching on the raw value — that is what keeps the sentinel out of a query builder. See `docs/adrs/001-centralized-tenant-access-control.md`.

Platform admins can scope themselves into a single tenant (`POST /api/admin/session/active-org`), which sets `Session.activeOrganizationId`. That field is consulted **only** for admins — a regular user cannot widen their own scope with it.

**Billing enforcement is separate from access control.** Pair `requireActiveSubscription()` with `requireAuth` on billable routes; it no-ops without `STRIPE_SECRET_KEY` and always passes platform admins. See `docs/adrs/002-subscription-paywall-middleware.md`.

**Audit sensitive actions** with `logAdminAction` / `logAuthEvent` from `services/audit-log.service.ts`. Impersonation, bans and role changes already are.

---

## Theming

- Light/dark/system via `apps/frontend/src/contexts/ThemeContext.tsx`; the toggle is in the header.
- **Never hard-code palette colors** (`bg-gray-50`, `text-green-600`). They do not respond to the theme — a `bg-gray-50` page stays light in dark mode and `text-green-800` on `bg-green-100` becomes unreadable. Use the semantic tokens: `background`, `foreground`, `muted`, `card`, `border`, `primary`, `destructive`, `success`, `warning`, `info`.
- `index.html` carries an inline pre-paint script that applies the stored theme before React mounts. Without it dark-mode users get a white flash on every load. Do not remove it.
- `Layout` is mounted once as a route element rendering an `<Outlet/>`. Pages must **not** import and wrap themselves in it.

---

## Seed Data

- Test users: `admin@example.com` / `Admin123!`, `user1@example.com` / `User123!`, `user2@example.com` / `User123!`
- Test org: "Acme Corporation" with members
- The seed writes credential `Account` rows using `hashPassword` from `better-auth/crypto`. Do not write password hashes any other way — an earlier version wrote bcrypt to a `User.hashedPassword` column that Better Auth never reads, so no seeded account could sign in.
