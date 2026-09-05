-- Drop User.hashedPassword.
--
-- Better Auth stores credential passwords on `accounts.password` (providerId
-- 'credential'), hashed with its own scrypt parameters. This column was never
-- read by anything; the seed script wrote bcrypt hashes into it, which is why
-- no seeded account could sign in. Removing it so the mistake cannot recur.
ALTER TABLE "users" DROP COLUMN "hashedPassword";
