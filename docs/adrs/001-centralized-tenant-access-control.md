---
number: 001
title: Centralize tenant access control behind one service
status: accepted
date: 2026-09-05
deciders: hhoffman
related: Epic #25, Story #27
---

# ADR-001: Centralize tenant access control behind one service

## Context

This is a multi-tenant template: organizations own data, users hold memberships, and a platform administrator sits above both. Every query against tenant-owned data therefore needs an answer to one question — _which organizations may this request see?_

Before this decision there was no shared answer. `project.controller.ts` derived scope inline in all five handlers, and the five copies had drifted into three different rules:

- `listProjects` unioned personal projects with every org the user belonged to.
- `updateProject` required `owner` or `admin` in the org.
- `deleteProject` required `owner`.
- `getProject` accepted any membership.
- `createProject` checked membership existence only.

Each was defensible alone. Collectively they meant no one could state the system's access rules without reading every handler, and a new domain model would get a sixth variation. That is the shape a cross-tenant data leak arrives in: not a dramatic bug, but one handler whose copy of the rule is subtly weaker than its neighbours.

A second force: platform administrators need to see across tenants for support, and also need to _scope themselves into_ a single tenant to reproduce a customer problem without the others in view. "No filter" and "filter to one org" are genuinely different states, and both are legitimate.

## Decision

We will route every tenant-scoped authorization decision through `apps/backend/src/services/access-control.service.ts`. No controller queries `organizationMember` directly.

The core primitive is:

```ts
getAccessibleOrgIds(ctx): Promise<string[] | null>
```

with three deliberate outcomes:

- **`string[]`** — scope to exactly these organization IDs.
- **`[]`** (empty array) — the caller can see nothing. This must still be applied as a filter; Prisma's `{ in: [] }` correctly matches zero rows.
- **`null`** — platform-wide, no filter. Returned **only** for a system admin with no active organization.

Because `null` is dangerous if mishandled, callers do not branch on it. They use the wrappers:

- `orgScopeWhere(ctx)` returns a spreadable `where` fragment — `{}` for platform-wide, `{ organizationId: { in: [...] } }` otherwise. This is why the sentinel never reaches a query builder.
- `assertOrgAccess(ctx, orgId)` / `assertOrgRole(ctx, orgId, roles)` throw `ForbiddenError`.

Tenant scope for a request comes from `Session.activeOrganizationId`, read from the database (see ADR-004), and is consulted **only for system admins** — a non-admin cannot widen their own scope by setting it.

`ctxFromRequest` throws rather than returning a guest context when `req.user` is absent, because that state means the route forgot `requireAuth`.

## Consequences

**Positive**

- The access rules are readable in one file, and reviewable as a unit.
- New domain models inherit correct scoping by using the same three functions; `project.controller.ts` is the worked example.
- The admin "scope into one tenant" capability exists without a second code path — it is the same primitive with a different input.
- The rules are testable in isolation, and are: 23 unit tests cover the sentinel semantics specifically, including the empty-array-vs-null distinction that a naive refactor would collapse.

**Negative**

- A `string[] | null` return type is a trap for anyone who ignores the wrappers and passes the raw value into Prisma. Mitigated by the wrappers, the doc comment, and tests — but it remains a sharp edge, chosen because the alternative (below) is worse.
- `getOrgRole` returns `'owner'` for platform admins in every organization. That is a real privilege grant, made so support can act while scoped in. It is the reason those routes are expected to write an audit log.
- One more indirection between a controller and its data.

**Neutral**

- Scope is resolved per request rather than cached. At template scale that is one indexed query folded into the auth middleware's existing lookup; a high-traffic deployment may want to revisit it.

## Considered alternatives

### Alternative 1: Leave scoping inline in each controller

The status quo. Rejected: it is precisely what produced three incompatible rules across five handlers in a single file. The failure mode is silent and security-relevant, and it gets worse with each new model.

### Alternative 2: Return `string[]` always, with platform-wide as "every org id"

Removes the `null` sentinel and the trap that comes with it. Rejected because it requires loading every organization ID on every admin request, turning an unbounded table scan into a per-request cost, and it silently breaks the moment an organization is created mid-request. The sentinel is uglier but honest about the distinction between "these orgs" and "no filter".

### Alternative 3: Prisma middleware / client extension applying scope globally

Attractive because it is impossible to forget. Rejected for a template: it makes every query's behavior depend on ambient request state, which is hard to follow and harder to debug, and it breaks down for the legitimate unscoped cases (admin listings, webhooks, background jobs) that then need an escape hatch — which becomes the new thing people forget to use correctly.

### Alternative 4: Postgres row-level security

The strongest isolation guarantee, enforced by the database rather than the application. Rejected as too heavy for a template: it requires per-request session variables, complicates migrations and connection pooling, and pushes authorization into a layer most consumers of this template will not expect to look at. Worth revisiting for a deployment with a hard compliance boundary.

## Notes

The `null` sentinel and the empty-array case are the two things to preserve in any future refactor. `access-control.service.test.ts` asserts both explicitly, including that an empty array is _not_ null — a distinction that looks like a nitpick and is in fact the difference between "sees nothing" and "sees everything".
