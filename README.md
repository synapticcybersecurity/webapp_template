# WebApp Template

A production-ready, full-stack web application template built with modern technologies and best practices. This template provides authentication, user management, multi-tenant organization support, and a complete admin dashboard out of the box.

## Features

- **Authentication & Authorization**
  - Email/password authentication with email verification
  - Password reset flow with Better Auth built-in endpoints
  - Session-based auth with secure cookies
  - Role-based access control (User, Admin)
  - Admin approval workflow — new users auto-banned pending approval
  - OAuth providers ready (GitHub, Google) — uncomment to enable

- **Multi-Tenant Organizations**
  - Organization creation and management
  - Team member invitations with email notifications
  - Role-based permissions (Owner, Admin, Member)
  - Centralized tenant scoping — one access-control layer every query goes through
  - Email-domain auto-join: signups land in the organization owning their domain
  - Platform admins can scope into a single tenant for support, or view across all
  - User impersonation with a persistent banner and a full audit trail

- **User Management**
  - User profiles
  - Admin dashboard for user management
  - Ban/unban users with expiration
  - Role management
  - Audit logging for admin actions (approve, reject, ban, unban)

- **Subscription Billing**
  - Stripe integration for subscription payments
  - Free, Pro, and Enterprise plan tiers
  - Stripe Checkout for payment collection
  - Stripe Customer Portal for self-service management
  - Webhook handling for subscription lifecycle events
  - Plan-based feature gating middleware
  - Usage tracking against plan limits

- **Production-Ready Infrastructure**
  - Multi-stage Docker builds for backend and frontend
  - Docker Compose for both development and production
  - PostgreSQL 16 with health checks
  - Redis 7 with production configuration (maxmemory, eviction policy)
  - nginx for frontend serving with gzip and caching
  - Non-root container users

- **Developer Experience**
  - TypeScript monorepo with npm workspaces
  - Hot reload for frontend and backend
  - Shared types and Zod validation schemas
  - ESLint + Prettier configured
  - Vitest testing infrastructure

## Tech Stack

| Layer              | Technology                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| **Frontend**       | React 19, Vite 6, TypeScript, Tailwind CSS 4, shadcn/ui, React Router 7, TanStack Query, Zustand |
| **Backend**        | Node.js 22, Express, TypeScript, Prisma 6, Better Auth 1.7, Winston, Zod                         |
| **Database**       | PostgreSQL 16                                                                                    |
| **Cache**          | Redis 7                                                                                          |
| **Email**          | Postmark                                                                                         |
| **Testing**        | Vitest, React Testing Library, Supertest                                                         |
| **Infrastructure** | Docker, Docker Compose, nginx                                                                    |

## Quick Start

### Prerequisites

- Node.js 22+
- Docker and Docker Compose
- npm 10+

### Development Setup

```bash
# 1. Clone and install
git clone https://github.com/synapticcybersecurity/webapp_template.git
cd webapp_template
npm install

# 2. Set up environment variables
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# 3. Start infrastructure (PostgreSQL, Redis, pgAdmin)
npm run docker:up

# 4. Run database migrations and seed
npm run db:generate
npm run db:migrate
npm run db:seed

# 5. Start development servers
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- pgAdmin: http://localhost:5050

### Production Deployment (Docker)

```bash
# Build and start all services
npm run docker:build
npm run docker:prod

# Or with custom environment
BETTER_AUTH_SECRET=$(openssl rand -base64 32) \
POSTGRES_PASSWORD=secure-password \
npm run docker:prod
```

- Application: http://localhost (frontend + API proxy)
- Backend API: http://localhost:3001

## Test Credentials

After seeding the database:

| Role  | Email             | Password  |
| ----- | ----------------- | --------- |
| Admin | admin@example.com | Admin123! |
| User  | user1@example.com | User123!  |
| User  | user2@example.com | User123!  |

## Project Structure

```
webapp_template/
├── apps/
│   ├── backend/               # Express.js API server
│   │   ├── src/
│   │   │   ├── config/        # Auth, database, email, env validation
│   │   │   ├── controllers/   # Route controllers
│   │   │   ├── middleware/    # Auth, error, validation, subscription
│   │   │   ├── routes/        # API route definitions
│   │   │   ├── services/      # Access control, subscription, audit log
│   │   │   ├── prisma/        # Schema, migrations, seed
│   │   │   └── utils/         # Logger, error classes
│   │   └── Dockerfile         # Multi-stage production build
│   │
│   └── frontend/              # React SPA
│       ├── src/
│       │   ├── components/    # UI, auth, layout, admin components
│       │   ├── contexts/      # Auth and theme providers
│       │   ├── pages/         # Auth, dashboard, admin, org pages
│       │   ├── hooks/         # useAuth and custom hooks
│       │   ├── lib/           # API client, utilities
│       │   └── styles/        # Tailwind 4 theme (no tailwind.config.js)
│       └── Dockerfile         # Multi-stage build with nginx
│
├── packages/
│   └── shared/                # Shared types and Zod validation
│
├── docs/
│   └── adrs/                  # Architecture decision records
│
├── docker/
│   ├── docker-compose.yml     # Full-stack production compose
│   ├── docker-compose.dev.yml # Dev overrides (infra only)
│   ├── nginx/default.conf     # Frontend nginx config
│   ├── redis/redis.conf       # Redis production config
│   └── postgres/init.sql      # DB initialization
│
└── package.json               # Monorepo workspace config
```

## Available Scripts

### Development

| Command                | Description                                       |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Start both frontend and backend with hot reload   |
| `npm run dev:backend`  | Start only the backend server                     |
| `npm run dev:frontend` | Start only the frontend dev server                |
| `npm run docker:up`    | Start infrastructure (PostgreSQL, Redis, pgAdmin) |
| `npm run docker:down`  | Stop infrastructure                               |
| `npm run docker:logs`  | Follow infrastructure logs                        |

### Database

| Command               | Description                       |
| --------------------- | --------------------------------- |
| `npm run db:generate` | Generate Prisma client            |
| `npm run db:migrate`  | Run database migrations           |
| `npm run db:seed`     | Seed database with test data      |
| `npm run db:studio`   | Open Prisma Studio (database GUI) |

### Build & Production

| Command                    | Description                          |
| -------------------------- | ------------------------------------ |
| `npm run build`            | Build all workspaces                 |
| `npm run docker:build`     | Build Docker images                  |
| `npm run docker:prod`      | Start full-stack production (Docker) |
| `npm run docker:prod:down` | Stop production services             |
| `npm run docker:prod:logs` | Follow production logs               |

### Testing & Quality

| Command          | Description               |
| ---------------- | ------------------------- |
| `npm run test`   | Run all tests             |
| `npm run lint`   | Lint all workspaces       |
| `npm run format` | Format code with Prettier |

## API Endpoints

### Authentication (Better Auth)

| Method | Path                        | Description                  |
| ------ | --------------------------- | ---------------------------- |
| POST   | `/api/auth/sign-up/email`   | Register with email/password |
| POST   | `/api/auth/sign-in/email`   | Sign in                      |
| POST   | `/api/auth/sign-out`        | Sign out                     |
| POST   | `/api/auth/forgot-password` | Request password reset       |
| POST   | `/api/auth/reset-password`  | Reset password with token    |
| GET    | `/api/auth/verify-email`    | Verify email address         |
| GET    | `/api/auth/session`         | Get current session          |

### Users

| Method | Path                       | Description                    |
| ------ | -------------------------- | ------------------------------ |
| GET    | `/api/users/pending`       | List pending approvals (admin) |
| GET    | `/api/users/pending/count` | Get pending count (admin)      |
| POST   | `/api/users/:id/approve`   | Approve user (admin)           |
| POST   | `/api/users/:id/reject`    | Reject user (admin)            |

> **Note:** General user management (list users, ban/unban, role changes) is done through Better Auth admin client APIs, not custom endpoints.

### Billing

| Method | Path                           | Description                           |
| ------ | ------------------------------ | ------------------------------------- |
| GET    | `/api/billing/plans`           | List available plans (public)         |
| GET    | `/api/billing/:orgId`          | Get billing overview for org          |
| POST   | `/api/billing/:orgId/checkout` | Create Stripe Checkout session        |
| POST   | `/api/billing/:orgId/portal`   | Create Stripe Customer Portal session |
| GET    | `/api/billing/:orgId/invoices` | List invoices                         |
| POST   | `/api/billing/webhook`         | Handle Stripe webhook events          |

### Metering

| Method | Path                   | Description       |
| ------ | ---------------------- | ----------------- |
| GET    | `/api/metering/:orgId` | Get usage summary |

### Admin (platform administrators only)

| Method | Path                            | Description                              |
| ------ | ------------------------------- | ---------------------------------------- |
| GET    | `/api/admin/organizations`      | List all organizations (cross-tenant)    |
| POST   | `/api/admin/session/active-org` | Scope this session to one organization   |
| DELETE | `/api/admin/session/active-org` | Clear the scope; return to platform-wide |

### Organizations

| Method | Path                                       | Description               |
| ------ | ------------------------------------------ | ------------------------- |
| GET    | `/api/organizations`                       | List user's organizations |
| POST   | `/api/organizations`                       | Create organization       |
| GET    | `/api/organizations/:id`                   | Get organization details  |
| PATCH  | `/api/organizations/:id`                   | Update organization       |
| DELETE | `/api/organizations/:id`                   | Delete organization       |
| POST   | `/api/organizations/:id/members`           | Invite member             |
| DELETE | `/api/organizations/:id/members/:memberId` | Remove member             |
| PATCH  | `/api/organizations/:id/members/:memberId` | Update member role        |

## Authentication Flow

1. **Sign Up** — User registers with email/password. Verification email sent automatically. User is created as banned (pending_approval) and cannot access the app until approved.
2. **Email Verification** — User clicks verification link from email. Redirected to `/verify-email?token=xxx` for automatic verification.
3. **Admin Approval** — Admin approves the user from the pending approvals list. Until approved, the user cannot sign in.
4. **Sign In** — Once approved, user enters credentials. Session created with secure HTTP-only cookie.
5. **Password Reset** — User requests reset email via `/forgot-password`. Clicks link to `/reset-password?token=xxx`. Submits new password.
6. **Protected Routes** — Frontend checks auth status. Unauthenticated users redirected to login. Banned (unapproved) users redirected to login. Admin routes check for admin role.

Ban state and tenant scope are re-read from the database on every request rather
than taken from Better Auth's session cookie cache, so a ban, a session
revocation or a scope change takes effect immediately instead of up to five
minutes later — see
[ADR-004](docs/adrs/004-session-state-read-from-database.md).

A signup whose email domain matches an `OrganizationDomain` is auto-joined to
that organization at step 1, before approval.

## Multi-Tenancy

Organizations are the tenant boundary. Every tenant-scoped query resolves its
scope through `apps/backend/src/services/access-control.service.ts` rather than
querying memberships inline — see
[ADR-001](docs/adrs/001-centralized-tenant-access-control.md).

**Regular users** see the organizations they hold a membership in. They cannot
widen that by any request parameter.

**Platform admins** (`User.role === 'admin'`) see across all tenants by default,
and can scope themselves into one via the header's scope switcher. That writes
`Session.activeOrganizationId`, and while set the admin sees only that tenant —
useful for reproducing a customer's view during support. The action is
audit-logged.

**Impersonation** lets an admin act as a specific user. A persistent banner
makes it unmissable, and both the start and the stop are audit-logged with the
acting admin and the target, because the request log alone cannot tell them
apart.

**Domain auto-join.** An `OrganizationDomain` row maps an email domain to an
organization; a signup from a matching address joins it automatically, and the
first user into an organization becomes its owner. Note the trust boundary this
creates: anyone who can receive mail at a claimed domain will join that tenant
(still subject to admin approval). Only add domains you control.

**Billing entitlement** is enforced separately from access control, by
`requireActiveSubscription()` — see
[ADR-002](docs/adrs/002-subscription-paywall-middleware.md). It no-ops when
`STRIPE_SECRET_KEY` is unset, so the template runs fully without Stripe.

## Bootstrapping the First Admin

Every new user is created banned, pending admin approval — which on a fresh
deployment means nobody can approve anybody. Set `ADMIN_EMAILS` to a
comma-separated list; a signup from a listed address becomes an admin
immediately, with no approval required.

```bash
ADMIN_EMAILS=you@example.com,cofounder@example.com
```

## Architecture Decisions

Decisions with lasting consequences are recorded in [`docs/adrs/`](docs/adrs/):

| ADR                                                            | Decision                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| [001](docs/adrs/001-centralized-tenant-access-control.md)      | Centralize tenant access control behind one service           |
| [002](docs/adrs/002-subscription-paywall-middleware.md)        | Enforce billing entitlement as route middleware               |
| [003](docs/adrs/003-tailwind-4-css-first-theming.md)           | Configure Tailwind 4 in CSS, palette in oklch                 |
| [004](docs/adrs/004-session-state-read-from-database.md)       | Read session scope and ban state from the database            |
| [005](docs/adrs/005-keep-explicit-organization-model-names.md) | Keep explicit `OrganizationMember` / `OrganizationInvitation` |

## Docker Architecture

### Production (`docker compose -f docker/docker-compose.yml up`)

All services run in containers:

```
┌─────────────────────────────────────────────────┐
│  webapp_network                                  │
│                                                  │
│  ┌──────────┐    ┌─────────┐    ┌────────────┐  │
│  │ frontend │───>│ backend │───>│ postgresql │  │
│  │ (nginx)  │    │ (node)  │    │            │  │
│  │ :80      │    │ :3001   │    │ :5432      │  │
│  └──────────┘    └────┬────┘    └────────────┘  │
│                       │                          │
│                       v                          │
│                  ┌─────────┐                     │
│                  │  redis  │                     │
│                  │  :6379  │                     │
│                  └─────────┘                     │
└─────────────────────────────────────────────────┘
```

- **Frontend**: nginx serves React SPA, proxies `/api/` to backend
- **Backend**: Node.js Express API, connects to PostgreSQL and Redis
- **PostgreSQL**: Primary database with health checks
- **Redis**: Session storage and caching with production config

### Development (`npm run docker:up`)

Only infrastructure runs in Docker. Backend and frontend run locally with hot reload for fast development.

### pgAdmin

pgAdmin is available as an optional tool. In development it starts by default. In production, start it explicitly:

```bash
docker compose -f docker/docker-compose.yml --profile tools up pgadmin -d
```

## Environment Variables

### Backend (`apps/backend/.env`)

| Variable                          | Default                 | Description                                                                                                   |
| --------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `PORT`                            | `3001`                  | Server port                                                                                                   |
| `DATABASE_URL`                    | —                       | PostgreSQL connection string                                                                                  |
| `REDIS_URL`                       | —                       | Redis connection string                                                                                       |
| `BETTER_AUTH_SECRET`              | —                       | Auth secret (min 32 chars)                                                                                    |
| `BETTER_AUTH_URL`                 | `http://localhost:3001` | Auth server URL                                                                                               |
| `FRONTEND_URL`                    | `http://localhost:5173` | Frontend URL (for CORS, emails)                                                                               |
| `POSTMARK_API_KEY`                | —                       | Postmark API key                                                                                              |
| `EMAIL_TEST_MODE`                 | `true`                  | Log emails instead of sending                                                                                 |
| `CORS_ORIGIN`                     | `http://localhost:5173` | Allowed CORS origins                                                                                          |
| `SESSION_COOKIE_SECURE`           | `false`                 | Secure cookies (set `true` for HTTPS)                                                                         |
| `SESSION_EXPIRY_DAYS`             | `7`                     | Session duration                                                                                              |
| `LOG_LEVEL`                       | `info`                  | Winston log level                                                                                             |
| `ADMIN_EMAILS`                    | —                       | Comma-separated bootstrap admin allow-list — a signup from a listed address becomes an admin without approval |
| `TRIAL_PERIOD_DAYS`               | `14`                    | Free-trial length applied to new organizations                                                                |
| `STRIPE_SECRET_KEY`               | —                       | Stripe secret key (test mode for dev)                                                                         |
| `STRIPE_WEBHOOK_SECRET`           | —                       | Stripe webhook signing secret                                                                                 |
| `STRIPE_PRICE_PRO_MONTHLY`        | —                       | Stripe Price ID for Pro monthly                                                                               |
| `STRIPE_PRICE_PRO_YEARLY`         | —                       | Stripe Price ID for Pro yearly                                                                                |
| `STRIPE_PRICE_ENTERPRISE_MONTHLY` | —                       | Stripe Price ID for Enterprise monthly                                                                        |
| `STRIPE_PRICE_ENTERPRISE_YEARLY`  | —                       | Stripe Price ID for Enterprise yearly                                                                         |

### Frontend (`apps/frontend/.env`)

| Variable                      | Default                 | Description            |
| ----------------------------- | ----------------------- | ---------------------- |
| `VITE_API_URL`                | `http://localhost:3001` | Backend API URL        |
| `VITE_APP_NAME`               | `Your App Name`         | Application name       |
| `VITE_ENABLE_ORGANIZATIONS`   | `true`                  | Enable org features    |
| `VITE_STRIPE_PUBLISHABLE_KEY` | —                       | Stripe publishable key |

See `.env.example` files for all available variables.

## Customization

### Adding New Pages

1. Create page component in `apps/frontend/src/pages/`
2. Add route in `apps/frontend/src/App.tsx`
3. Add navigation link in `apps/frontend/src/components/layout/Header.tsx`

### Adding New API Endpoints

1. Create controller in `apps/backend/src/controllers/`
2. Create route file in `apps/backend/src/routes/`
3. Register route in `apps/backend/src/app.ts`

### Enabling OAuth Providers

1. Uncomment the `socialProviders` section in `apps/backend/src/config/auth.config.ts`
2. Add OAuth credentials to `apps/backend/.env`
3. Run migrations if schema changes are needed

### Adding UI Components

```bash
# Add shadcn/ui components
npx shadcn-ui@latest add [component-name]
```

## Security

- Passwords hashed with bcrypt
- Secure HTTP-only session cookies
- CSRF protection via double-submit cookie pattern (csrf-csrf)
- Rate limiting on API and auth endpoints
- Input validation with Zod schemas
- SQL injection prevention via Prisma
- XSS protection with helmet security headers
- CORS properly configured
- Redis commands (FLUSHDB, FLUSHALL, DEBUG) disabled in production
- Docker containers run as non-root users

## License

MIT
