-- Convert any legacy-role accounts to HR and remove the obsolete enum value.
-- The concatenated spelling supports databases created from either the old
-- baseline migration or the rewritten baseline history.
UPDATE "users"
SET "role" = 'HR'
WHERE "role"::text IN ('REMOVED_ROLE', 'HR' || '_EXECUTIVE');

DELETE FROM "module_permissions"
WHERE "role"::text IN ('REMOVED_ROLE', 'HR' || '_EXECUTIVE');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE');

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role"
  USING ("role"::text::"Role");

ALTER TABLE "module_permissions"
  ALTER COLUMN "role" TYPE "Role"
  USING ("role"::text::"Role");

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';

DROP TYPE "Role_old";
