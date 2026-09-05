---
number: 002
title: Enforce billing entitlement as route middleware with a cached lookup
status: accepted
date: 2026-09-05
deciders: hhoffman
related: Epic #25, Story #27, ADR-001
---

# ADR-002: Enforce billing entitlement as route middleware with a cached lookup

## Context

The template had a populated `Subscription` model kept current by a Stripe webhook, and nothing anywhere consulted it. Billing state was recorded and never enforced.

Enforcing it raises three questions that pull in different directions:

1. **Where does the check live?** Inline in handlers repeats the mistake ADR-001 exists to prevent. In the access-control layer conflates two different concepts.
2. **What about a tenant that has not paid yet?** A brand-new organization has no `Subscription` row at all. If "no subscription" means "blocked", the first thing a new customer sees is a payment wall instead of the product.
3. **What is the cost per request?** A naive check is a database round trip on every request to every billable route.

There is also a template-specific constraint: most people cloning this repo will not have Stripe credentials, and the app must be fully usable without them. A paywall that blocks a fresh clone is worse than no paywall.

## Decision

We will enforce entitlement as Express middleware, `requireActiveSubscription()`, mounted alongside `requireAuth` on billable routes:

```ts
const requireEntitlement = [requireAuth, requireActiveSubscription()];
```

It is deliberately **separate from access control**. Access control answers "may you see this tenant's data"; the paywall answers "is this tenant paid up". Conflating them produces confusing errors — a user with no organization would get told to buy a subscription rather than told they have no organization.

Three bypasses, in order:

1. **Billing not configured** (`STRIPE_SECRET_KEY` unset) — no-op, so the template works out of the box.
2. **Platform admins** — always pass, so support access does not depend on a customer's billing state.
3. **No organization** — pass, and let the access-control layer produce its own, accurate error.

`isActive` is true when _either_ a live `Subscription` exists (`active`, `trialing`, or `past_due`) _or_ `Organization.trialEndsAt` is in the future. New organizations get `trialEndsAt` set by the organization plugin's `beforeCreateOrganization` hook.

`past_due` counts as entitled. Dunning is a billing problem; cutting a customer off the moment a card fails is worse for both parties than a few days of grace.

The lookup is cached in Redis for five minutes, invalidated per-organization by the Stripe webhook. Redis is treated as **strictly optional**: every cache interaction is wrapped, and a failure degrades to a database read. A cache problem must never deny access to a paying customer.

Refusals respond `403` with `code: 'SUBSCRIPTION_REQUIRED'`, which the frontend API client keys on to route to billing rather than treating it as a generic permission failure.

## Consequences

**Positive**

- Adding a billable route is one array entry, and the entitlement rule lives in one place.
- The template runs with no Stripe configuration at all.
- The 403 carries a machine-readable code and `trialEndsAt`, so the UI can say something specific instead of "forbidden".
- Trial handling requires no `Subscription` row, so nothing has to fabricate a fake subscription for new tenants.

**Negative**

- Up to five minutes of staleness for changes made outside the webhook path — a direct database edit, or an admin-granted plan. Webhook-driven changes invalidate immediately.
- Two separate 403 sources (paywall and access control) that the frontend must distinguish. It does, by `code`.
- `past_due` grace is a policy choice baked into a constant. A deployment with different tolerance has to change it.

**Neutral**

- The middleware resolves the governing organization from the session's active org, falling back to the user's most recent membership. For a multi-org user with no active org that is a heuristic, not a rule — the same heuristic the rest of the app uses.

## Considered alternatives

### Alternative 1: Check entitlement inside the access-control service

Fewer moving parts, one call site. Rejected: it merges "can you see it" with "have you paid", which have different bypass rules, different error semantics, and different audiences. It would also make every access-control call pay the subscription lookup, including on routes that are not billable at all.

### Alternative 2: Check entitlement in the frontend only

Cheapest, and gives the nicest UX. Rejected outright: it is not enforcement. The API is the boundary.

### Alternative 3: No cache — query on every request

Simplest and always correct. Rejected because it is a guaranteed database round trip on every request to every billable route, for a value that changes a few times a year per tenant. The five-minute window with webhook invalidation is a much better trade.

### Alternative 4: Cache in memory rather than Redis

Avoids the Redis dependency. Rejected because it does not survive more than one process — with two app instances, invalidating one leaves the other serving a cancelled subscription as active. Redis was already an optional dependency here.

## Notes

`invalidateSubscriptionCache` is called from both `syncSubscription` and `handleSubscriptionDeleted`. Any new webhook handler that changes subscription state must call it too; without that, a cancellation keeps serving access for the cache TTL.
