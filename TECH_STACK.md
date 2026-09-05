# Tech Stack

## Infrastructure

- **Docker** — Multi-stage builds for backend and frontend
- **PostgreSQL 16** — Primary database with Prisma ORM
- **Redis 7** — Session storage and caching (production-tuned)
- **nginx** — Frontend serving with gzip, caching, and API proxy

## Backend

- **Node.js 22** / **Express.js** — API server
- **TypeScript** — Type safety across the stack
- **Better Auth 1.7** — Authentication, sessions, organizations, admin, impersonation
- **Prisma 6** — Database ORM with migrations
- **Stripe** — Subscription billing, checkout, customer portal
- **Postmark** — Transactional email delivery
- **Zod** — Request validation
- **Winston** — Structured logging
- **Helmet** — Security headers and CSP
- **csrf-csrf** — CSRF protection (double-submit cookie)

## Frontend

- **React 19** / **Vite 6** — SPA with hot reload
- **TypeScript** — Shared types with backend
- **Tailwind CSS 4** / **shadcn/ui** — CSS-first theming (no `tailwind.config.js`), light/dark/system
- **React Router DOM 7** — Client-side routing
- **TanStack Query** — Server state management
- **Axios** — HTTP client with interceptors
- **Zustand** — Client state management
- **Sonner** — Toast notifications

## Testing

- **Vitest 4.x** — Test runner for all three workspaces
- **React Testing Library** — Component testing
- **Supertest** — API endpoint testing

## CI/CD

- **GitHub Actions** — Lint, typecheck, test, build pipeline
- **Node.js 22** — CI runtime
