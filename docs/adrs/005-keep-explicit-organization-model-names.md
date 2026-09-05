---
number: 005
title: Keep explicit OrganizationMember and OrganizationInvitation model names
status: accepted
date: 2026-09-05
deciders: hhoffman
related: Epic #25, Story #27
---

# ADR-005: Keep explicit `OrganizationMember` and `OrganizationInvitation` model names

## Context

Better Auth's organization plugin defaults to models named `Member` and `Invitation`. This template instead uses `OrganizationMember` and `OrganizationInvitation`, mapped back to the plugin's expectations through its `schema` option:

```ts
organization({
  schema: {
    member: { modelName: 'organizationMember' },
    invitation: { modelName: 'organizationInvitation' },
  },
});
```

Bringing this template to ACREv3 parity raised the question of whether to align, since ACREv3 uses the plugin defaults. Aligning would make it cheaper to copy code between the two.

## Decision

We will keep `OrganizationMember` and `OrganizationInvitation`, and keep the schema mapping.

## Consequences

**Positive**

- `Member` is ambiguous in an application schema — a member of what? The explicit names read correctly at every call site, and in this codebase there are many: the access-control service, the paywall, the auth hooks, and the domain auto-join all query memberships.
- No migration. Renaming two tables would touch every query, every seed path, and require a migration that is pure churn for zero functional gain.
- The mapping already worked and was already tested.

**Negative**

- Code copied from ACREv3 (or from Better Auth's own documentation and examples) needs `prisma.member` renamed to `prisma.organizationMember`. This is a mechanical rename that the type checker catches immediately, but it is real friction and it will recur.
- The `schema` mapping block is one more piece of configuration a reader must notice before the Prisma models make sense against the plugin docs.

**Neutral**

- Better Auth's _other_ tables (`user`, `session`, `account`, `verification`) keep their default names with `@@map` to plural snake_case table names. So the codebase is not uniformly one convention or the other — the deviation is scoped to the two organization models.

## Considered alternatives

### Alternative 1: Rename to `Member` / `Invitation` to match Better Auth and ACREv3

Cheaper code sharing with ACREv3 and a closer match to upstream documentation. Rejected: it is a table-rename migration touching every membership query in the codebase, in exchange for readability that is actively worse. `prisma.member.findMany` does not say what it returns.

### Alternative 2: Rename everything to a fully explicit convention

Consistency by renaming `User` → `AppUser`, `Session` → `AuthSession`, and so on. Rejected as gratuitous: those names are unambiguous already, and the churn would extend to Better Auth's core tables where the plugin's expectations are most load-bearing.

## Notes

Anyone porting code from ACREv3 should expect `prisma.member` → `prisma.organizationMember` and `prisma.invitation` → `prisma.organizationInvitation`. That is the entire delta.
