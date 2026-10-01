-- Preserve business history while allowing administrators to deactivate accounts.
ALTER TABLE "User"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN "disabledAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Achievement"
ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "User"
ADD CONSTRAINT "valid_user_status" CHECK ("status" IN ('active', 'disabled'));

CREATE INDEX "User_role_status_createdAt_idx"
ON "User"("role", "status", "createdAt");

-- Application code normalizes email addresses; this also protects against
-- case-only duplicates created outside the API.
CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (LOWER("email"));
