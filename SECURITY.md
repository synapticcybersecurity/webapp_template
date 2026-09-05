# Security

This document describes the security measures, configuration, and practices for this application.

## Security Architecture

### Authentication

- **Library**: [better-auth](https://www.better-auth.com/) v1.7
- **Password hashing**: bcrypt (handled internally by better-auth)
- **Sessions**: Database-backed with configurable expiry (default 7 days)
- **Email verification**: Required on signup
- **Admin approval**: New users are auto-banned pending admin approval
- **Rate limiting**: Auth endpoints limited to 10 requests/minute

### Authorization

- **Role-based access control**: `user` and `admin` roles
- **Organization membership**: Owner/admin/member roles per organization
- **Ban enforcement**: `requireAuth` middleware checks ban status on every request, revokes sessions for banned users, and supports temporary bans via `banExpires`
- **Admin impersonation**: Limited to 15-minute sessions

### CSRF Protection

- **Method**: Double-submit cookie pattern via [csrf-csrf](https://github.com/Psifi-Solutions/csrf-csrf)
- **Token delivery**: Frontend fetches from `GET /api/csrf-token`, sends via `X-CSRF-Token` header
- **Exemptions**: Stripe webhooks (use signature verification), better-auth routes (handled internally)

### Security Headers

Configured via [Helmet.js](https://helmetjs.github.io/):

- **Content-Security-Policy**: Strict directives — `default-src 'self'`, Stripe domains whitelisted for scripts/frames/API
- **X-Frame-Options**: DENY (via `frame-ancestors: 'none'`)
- **X-Content-Type-Options**: nosniff
- **Strict-Transport-Security**: Enabled
- **Referrer-Policy**: Strict

### CORS

- Origins configured via `CORS_ORIGIN` environment variable (comma-separated)
- **Wildcard rejected**: Startup validation prevents `CORS_ORIGIN=*` when credentials are enabled
- Credentials allowed for session-based auth

### Rate Limiting

- **Global API**: 100 requests per 15 minutes (configurable via `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`)
- **Auth endpoints**: 10 requests per minute

### Request Security

- **Timeout**: Configurable via `REQUEST_TIMEOUT` (default 30s) to prevent resource exhaustion
- **Request ID**: Every request assigned a UUID (or forwarded `X-Request-ID`) for log correlation
- **Body size limit**: 10MB for JSON and URL-encoded payloads

### Cookie Security

| Attribute | Value                                              |
| --------- | -------------------------------------------------- |
| httpOnly  | `true`                                             |
| secure    | Enforced `true` in production (startup validation) |
| sameSite  | `lax` (configurable)                               |
| prefix    | `webapp`                                           |

### Input Validation

- **Zod schemas** validate all request bodies, query parameters, and URL parameters
- **HTML escaping** applied to all user input in email templates (`escapeHtml()`)

### Stripe Integration

- Webhook signatures verified via `stripe.webhooks.constructEvent()`
- Raw body preserved for webhook routes (skips JSON parsing)
- All Stripe keys from environment variables

### Audit Logging

- Admin actions (approve, reject) are logged to the `audit_logs` table
- Each entry records: acting user, action, target entity, details (JSON), and IP address
- Logs survive user deletion (`onDelete: SetNull`)

## Environment Variables

All secrets are loaded from environment variables. **Never commit `.env` files.**

| Variable                | Required   | Description                                                         |
| ----------------------- | ---------- | ------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`    | Yes        | Min 32 chars. Generate with `openssl rand -base64 32`               |
| `STRIPE_SECRET_KEY`     | Yes        | Stripe API secret key                                               |
| `STRIPE_WEBHOOK_SECRET` | Yes        | Stripe webhook signing secret                                       |
| `POSTMARK_API_KEY`      | Yes        | Email service API key                                               |
| `DATABASE_URL`          | Yes        | PostgreSQL connection string (use `?sslmode=require` in production) |
| `SESSION_COOKIE_SECURE` | Yes (prod) | Must be `true` in production                                        |
| `CORS_ORIGIN`           | Yes        | Comma-separated allowed origins. Never use `*`                      |
| `CSRF_SECRET`           | No         | Defaults to `BETTER_AUTH_SECRET` if not set                         |
| `REQUEST_TIMEOUT`       | No         | Default `30s`                                                       |

See `apps/backend/.env.example` for the complete list.

## Production Checklist

- [ ] `NODE_ENV=production`
- [ ] `BETTER_AUTH_SECRET` set to a strong random value (min 32 chars)
- [ ] `SESSION_COOKIE_SECURE=true`
- [ ] `CORS_ORIGIN` set to specific production domains (no wildcards)
- [ ] `DATABASE_URL` includes `?sslmode=require`
- [ ] All Stripe keys are production keys (`sk_live_`, `pk_live_`)
- [ ] `EMAIL_TEST_MODE=false` with valid Postmark credentials
- [ ] HTTPS terminated at reverse proxy/load balancer
- [ ] Log level set appropriately (no `debug` in production)

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly. Do not open a public GitHub issue. Instead, contact the maintainers directly.

## Audit History

| Date       | Scope         | Findings                            | Status    |
| ---------- | ------------- | ----------------------------------- | --------- |
| 2026-03-22 | Full codebase | 0 critical, 3 high, 3 medium, 3 low | All fixed |

### Resolved Findings (2026-03-22)

- **HIGH**: Banned users with active sessions could access API — fixed with ban check in `requireAuth`
- **HIGH**: No CSRF protection — added double-submit cookie pattern
- **HIGH**: Dependency vulnerabilities (kysely) — patched via `npm audit fix`
- **MEDIUM**: Default CSP too permissive — configured strict directives
- **MEDIUM**: CORS wildcard not validated — added startup rejection
- **MEDIUM**: Admin impersonation too long (1hr) — reduced to 15 minutes
- **LOW**: No request timeout — added 30s default
- **LOW**: SESSION_COOKIE_SECURE not enforced in production — added startup check
- **LOW**: No request ID for log correlation — added UUID middleware

### Open Items

- Dependency vulnerabilities in dev dependencies (minimatch, esbuild/vite, tar) — require breaking upgrades, low production risk
- See [open security issues](https://github.com/synapticcybersecurity/webapp_template/issues?q=is%3Aopen+label%3Asecurity) for remaining items
