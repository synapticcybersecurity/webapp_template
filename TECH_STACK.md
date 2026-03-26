# Tech Stack

## Infrastructure

- **Docker** — Multi-stage builds for backend and frontend
- **PostgreSQL 16** — Primary database with Prisma ORM
- **Redis 7** — Session storage and caching (production-tuned)
- **nginx** — Frontend serving with gzip, caching, and API proxy

## Backend

- **Node.js 22** / **Express.js** — API server
- **TypeScript** — Type safety across the stack
- **Better Auth 1.5.6** — Authentication, sessions, organizations, admin
- **Prisma** — Database ORM with migrations
- **Stripe** — Subscription billing, checkout, customer portal
- **Postmark** — Transactional email delivery
- **Zod** — Request validation
- **Winston** — Structured logging
- **Helmet** — Security headers and CSP
- **csrf-csrf** — CSRF protection (double-submit cookie)

## Frontend

- **React 18** / **Vite** — SPA with hot reload
- **TypeScript** — Shared types with backend
- **Tailwind CSS** / **shadcn/ui** — Component library
- **React Router DOM** — Client-side routing
- **TanStack Query** — Server state management
- **Axios** — HTTP client with interceptors
- **Zustand** — Client state management

## Testing

- **Vitest 2.x** — Test runner for backend and frontend
- **React Testing Library** — Component testing
- **Supertest** — API endpoint testing

## CI/CD

- **GitHub Actions** — Lint, typecheck, test, build pipeline
- **Node.js 22** — CI runtime
