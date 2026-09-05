-- Add Account.issuer, required by Better Auth >= 1.7.
--
-- Sign-in matches the credential account on (providerId, issuer, accountId).
-- Without this column every email/password sign-in fails with "User not found"
-- even though the account row exists and the password hash is correct.
--
-- Written as add-nullable / backfill / set-not-null rather than a bare
-- `ADD COLUMN NOT NULL`, which would fail outright on any deployment that
-- already has account rows.

-- 1. Add nullable so existing rows survive.
ALTER TABLE "accounts" ADD COLUMN "issuer" TEXT;

-- 2. Backfill. `local:<providerId>` is the synthetic issuer Better Auth uses
--    for providers without one of their own, and is exactly right for
--    'credential'. Rows for real OAuth providers get a placeholder here; Better
--    Auth rewrites them to the provider's true issuer on next sign-in, and
--    until then the affected user re-links via OAuth rather than losing data.
UPDATE "accounts"
SET "issuer" = 'local:' || "providerId"
WHERE "issuer" IS NULL;

-- 3. Now that every row has a value, enforce it.
ALTER TABLE "accounts" ALTER COLUMN "issuer" SET NOT NULL;

-- Uniqueness moves to (issuer, accountId): the same accountId can legitimately
-- recur across different issuers, so the old pair was the wrong key.
DROP INDEX "accounts_providerId_accountId_key";
CREATE UNIQUE INDEX "accounts_issuer_accountId_key" ON "accounts"("issuer", "accountId");
CREATE INDEX "accounts_providerId_idx" ON "accounts"("providerId");
