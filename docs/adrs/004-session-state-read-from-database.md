---
number: 004
title: Read session tenant scope and ban state from the database, not the cookie cache
status: accepted
date: 2026-09-05
deciders: hhoffman
related: Epic #25, Story #27, ADR-001
---

# ADR-004: Read session tenant scope and ban state from the database, not the cookie cache

## Context

Better Auth offers `session.cookieCache`, which serves a signed snapshot of the session from a cookie for a configurable window. This template enables it with a five-minute `maxAge`. It is a genuine performance win: most requests avoid a session lookup entirely.

The snapshot is exactly that — a snapshot. It reports whatever was true when the cookie was minted. That is fine for stable identity fields like `id` and `email`. It is not fine for anything that can change mid-session and that a security decision depends on.

Two such fields exist here, and both were being read from the cached object:

- **`Session.activeOrganizationId`** — the tenant scope that ADR-001's access-control layer filters every query by.
- **`User.banned`** — the flag that blocks suspended and not-yet-approved accounts.

This was not theoretical. Scoping an admin to a tenant and immediately re-querying returned data from _all_ tenants: the database row had been updated and the API still answered from the cookie. The same window applied to bans — a banned user kept working for up to five minutes, including a user banned specifically because they were compromised.

The pre-existing code already made a database round trip for the ban check (`prisma.user.findUnique`), so the cost argument for trusting the cache was not actually being realised.

## Decision

`requireAuth` will resolve tenant scope and ban state from the database, in a single query on the session row that also carries the user's ban fields:

```ts
const sessionRecord = await prisma.session.findUnique({
  where: { id: session.session.id },
  select: {
    activeOrganizationId: true,
    impersonatedBy: true,
    user: { select: { banned: true, banReason: true, banExpires: true } },
  },
});
```

Better Auth's returned session is still used to _authenticate_ the request — the cookie cache continues to do its job of avoiding signature and identity work. What changes is that the security-relevant, mutable fields are read fresh.

A missing `sessionRecord` is treated as unauthenticated, which also closes session revocation: a deleted session row no longer works for the remainder of the cookie window.

## Consequences

**Positive**

- Tenant scope changes take effect on the very next request. Verified: an admin scoping to one tenant goes from 6 visible projects to 4 immediately.
- Bans and session revocation take effect immediately.
- **No additional cost.** This replaces the `user.findUnique` that was already there with one `session.findUnique` that returns both. One indexed query, as before.
- `impersonatedBy` is authoritative too, so the impersonation banner cannot be stale.

**Negative**

- Every authenticated request touches the database. That was already true, but it is now a documented requirement rather than an incidental one, and it means the cookie cache cannot be tuned upward to eliminate the query.
- The relationship between "cached session" and "live session row" is subtle, and a future contributor could reasonably think the extra query is redundant. Hence the comment in the code and this ADR.

**Neutral**

- The cookie cache remains enabled and still avoids identity and signature work.

## Considered alternatives

### Alternative 1: Trust the cookie cache

Fastest, and the default reading of the library's API. Rejected: it is what produced the observed cross-tenant read and the delayed ban. A five-minute window on a security boundary is not a performance optimisation, it is a vulnerability with a timer.

### Alternative 2: Disable `cookieCache` entirely

Correct, and simpler to explain. Rejected because it discards the parts of the cache that are genuinely safe and useful — identity fields do not change mid-session — while solving nothing that the targeted query does not already solve.

### Alternative 3: Shorten `cookieCache.maxAge` to a few seconds

Narrows the window without new code. Rejected because it only makes the bug rarer, not absent, which is the worst outcome: an intermittent cross-tenant read is far harder to diagnose than a consistent one.

### Alternative 4: Refresh the session cookie when scope changes

Keeps reads cache-only. Rejected because it fixes exactly one mutation path. Bans, revocations and any future admin action on another user's session would each need the same treatment, and each would be a new opportunity to forget.

## Notes

`require-auth.test.ts` pins this directly: the mocked cached session carries `activeOrganizationId: 'org-STALE'` while the database returns `'org-FRESH'`, and the test asserts the fresh value wins. If someone later "optimises away" the query, that test fails with an obvious message rather than a silent leak.
