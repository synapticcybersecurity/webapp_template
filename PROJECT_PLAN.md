# Project Plan — WebApp Template (SaaS Starter Kit)

A production-ready, full-stack SaaS starter kit that gives founders and teams a complete foundation to launch subscription-based web applications. Built with React, Express, TypeScript, PostgreSQL, and Docker.

---

## Vision

Provide a batteries-included SaaS template that handles the undifferentiated heavy lifting — auth, billing, teams, infrastructure — so developers can focus on building their product. A new project should go from `git clone` to production-ready in under an hour.

---

## Accomplishments (Completed)

### Milestone 1: Core Foundation

> _Completed — commit `5047afc`_

- [x] TypeScript monorepo with npm workspaces (frontend, backend, shared)
- [x] React 18 + Vite + Tailwind CSS + shadcn/ui frontend
- [x] Express + Prisma + Better Auth backend
- [x] PostgreSQL 16 database with Prisma ORM
- [x] Redis 7 for session storage and caching
- [x] Email/password authentication with email verification
- [x] Password reset flow
- [x] Session-based auth with secure cookies
- [x] Role-based access control (User, Admin)
- [x] User profiles with avatar support
- [x] Admin dashboard for user management (ban/unban, role management)
- [x] Multi-tenant organization management
- [x] Team member invitations with email notifications
- [x] Organization roles (Owner, Admin, Member)
- [x] Postmark email integration
- [x] Shared Zod validation schemas

### Milestone 2: Testing & Code Quality

> _Completed — commit `b2f6031`_

- [x] Vitest testing infrastructure
- [x] React Testing Library setup
- [x] Supertest for API testing
- [x] ESLint + Prettier configured
- [x] Initial test suite (auth middleware, error utilities, component tests)

### Milestone 3: Production Infrastructure

> _Completed — commit `3321c27`_

- [x] Multi-stage Docker builds for backend and frontend
- [x] Docker Compose for development (infra only) and production (full stack)
- [x] nginx reverse proxy with gzip and caching
- [x] Redis production config (maxmemory, eviction policy)
- [x] PostgreSQL health checks and init scripts
- [x] Non-root container users
- [x] Auth pages (login, signup, forgot/reset password, verify email)
- [x] Comprehensive README and documentation

### Milestone 4: Auth Refactor

> _Completed — commit `eaf3b8d`_

- [x] Replaced custom IAM code with Better Auth client APIs
- [x] Simplified auth integration across frontend

---

## Current Status

The template has a solid foundation: authentication, organizations, user management, Docker infrastructure, and basic tests. The next phase focuses on making it a complete SaaS starter kit with billing, deeper test coverage, polished UX, and deployment guides.

**Test coverage:** 3 test files (minimal — needs significant expansion)
**Pages:** 10 (login, signup, forgot/reset password, verify email, dashboard, profile, admin users, org list, org details)
**API routes:** Auth, Users, Organizations, Projects (stub)

---

## Roadmap

### Milestone 5: Payments & Billing

> _Completed_

Integrate Stripe for subscription billing, the most critical missing piece for a SaaS kit.

- [x] Stripe integration (stripe SDK, webhook handler)
- [x] Subscription plans model (Free, Pro, Enterprise)
- [x] Pricing page with plan comparison and interval toggle
- [x] Checkout flow (Stripe Checkout)
- [x] Customer portal for managing subscriptions
- [x] Billing history and invoice display
- [x] Usage-based metering support (optional/pluggable)
- [x] Plan-based feature gating (middleware + frontend guards)
- [x] Webhook handling for subscription lifecycle events
- [x] Prisma schema updates (subscriptions, usage records)
- [x] Seed data for test plans and prices
- [x] Billing management page with usage bars
- [x] Organization billing link in org details

### Milestone 6: Testing & Stability

> _Status: Not Started_

Increase confidence in the codebase and establish CI/CD.

- [ ] Backend unit tests: auth config, controllers, middleware (target 80%+)
- [ ] Backend integration tests: full API endpoint coverage
- [ ] Frontend component tests: auth forms, dashboard, org pages
- [ ] Frontend hook tests: useAuth, custom hooks
- [ ] E2E tests with Playwright (critical flows: signup, login, create org, billing)
- [ ] CI/CD pipeline (GitHub Actions: lint, type-check, test, build)
- [ ] Test database seeding for integration tests
- [ ] API contract tests (shared Zod schemas as source of truth)
- [ ] Coverage reporting and thresholds

### Milestone 7: Features & UX Polish

> _Status: Not Started_

Fill in the gaps that users expect from a modern SaaS application.

- [ ] Settings page (account settings, notification preferences)
- [ ] Onboarding flow for new users (welcome wizard, org setup)
- [ ] In-app notification system (bell icon, notification center)
- [ ] Email notification templates (welcome, invoice, team invite)
- [ ] File/image upload support (S3 or compatible object storage)
- [ ] Avatar upload with image cropping
- [ ] Dark mode / theme toggle
- [ ] Search and filtering on admin and list pages
- [ ] Pagination for all list views
- [ ] Loading skeletons and optimistic UI updates
- [ ] Toast notifications for actions (success, error feedback)
- [ ] Mobile-responsive navigation
- [ ] OAuth providers (GitHub, Google) — wiring and UI

### Milestone 8: DevOps & Deployment

> _Status: Not Started_

Make it easy to deploy and operate in production.

- [ ] Cloud deployment guide (AWS / Railway / Fly.io / Render)
- [ ] Environment variable validation on startup
- [ ] Health check endpoint (`/api/health` with DB + Redis status)
- [ ] Structured JSON logging for production
- [ ] Application monitoring setup (Sentry or similar)
- [ ] Database backup strategy documentation
- [ ] Database migration strategy for production
- [ ] Rate limiting configuration (per-route, per-user)
- [ ] HTTPS / TLS setup documentation
- [ ] Horizontal scaling considerations (stateless backend, sticky sessions)
- [ ] Terraform / IaC templates (stretch goal)

---

## Milestone Priority & Dependencies

```
M5: Payments ──────┐
                    ├──> M7: Features & UX (billing UI depends on M5)
M6: Testing ───────┘         │
                              v
                        M8: DevOps & Deployment
```

**Recommended order:** M5 (Payments) and M6 (Testing) can be worked in parallel. M7 (Features) benefits from having billing in place. M8 (DevOps) is best done last when the feature set is stable.

---

## Success Criteria

The template is "complete" when a developer can:

1. Clone the repo and run locally in under 10 minutes
2. Deploy to production with a single command or guide
3. Accept paying customers (Stripe subscriptions)
4. Manage teams and organizations
5. Have confidence in stability (80%+ test coverage, CI/CD green)
6. Customize branding, plans, and features without touching infrastructure code

---

## Technical Debt & Known Issues

- [ ] Project routes (`project.routes.ts`, `project.controller.ts`) are stubs — decide if this stays as an example or gets removed
- [ ] Only 3 test files exist — far below target coverage
- [ ] OAuth providers commented out — needs UI and documentation
- [ ] No input validation on some frontend forms
- [ ] No API rate limiting beyond basic middleware

---

_Last updated: 2026-03-17_
