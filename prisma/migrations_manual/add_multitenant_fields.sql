-- ============================================
-- Add multi-tenant, trial, and new tables
-- Safe to re-run: uses IF NOT EXISTS / DO blocks
-- ============================================

-- 1. Company: multi-tenant + subscription fields
DO $$
DECLARE
  col_def RECORD;
BEGIN
  -- slug (required, unique)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='slug') THEN
    EXECUTE 'ALTER TABLE companies ADD COLUMN slug TEXT';
    -- Backfill existing companies with a slug derived from id
    EXECUTE 'UPDATE companies SET slug = LOWER(REPLACE(name, '' '', ''-'')) || ''-'' || SUBSTRING(id, 1, 6) WHERE slug IS NULL';
    EXECUTE 'ALTER TABLE companies ALTER COLUMN slug SET NOT NULL';
    RAISE NOTICE 'Added slug to companies';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='companies_slug_key') THEN
    EXECUTE 'CREATE UNIQUE INDEX companies_slug_key ON companies (slug)';
    RAISE NOTICE 'Created unique index on companies.slug';
  END IF;

  -- customDomain
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='customDomain') THEN
    EXECUTE 'ALTER TABLE companies ADD COLUMN "customDomain" TEXT';
    RAISE NOTICE 'Added customDomain to companies';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='companies_customDomain_key') THEN
    EXECUTE 'CREATE UNIQUE INDEX "companies_customDomain_key" ON companies ("customDomain")';
    RAISE NOTICE 'Created unique index on companies.customDomain';
  END IF;

  -- senderEmail
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='senderEmail') THEN
    EXECUTE 'ALTER TABLE companies ADD COLUMN "senderEmail" TEXT';
    RAISE NOTICE 'Added senderEmail to companies';
  END IF;

  -- trialStartedAt
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='trialStartedAt') THEN
    EXECUTE 'ALTER TABLE companies ADD COLUMN "trialStartedAt" TIMESTAMPTZ';
    RAISE NOTICE 'Added trialStartedAt to companies';
  END IF;

  -- trialEndsAt
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='trialEndsAt') THEN
    EXECUTE 'ALTER TABLE companies ADD COLUMN "trialEndsAt" TIMESTAMPTZ';
    RAISE NOTICE 'Added trialEndsAt to companies';
  END IF;

  -- subscriptionStatus
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='subscriptionStatus') THEN
    EXECUTE 'ALTER TABLE companies ADD COLUMN "subscriptionStatus" TEXT NOT NULL DEFAULT ''trialing''';
    RAISE NOTICE 'Added subscriptionStatus to companies';
  END IF;

  -- accessUntil
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='accessUntil') THEN
    EXECUTE 'ALTER TABLE companies ADD COLUMN "accessUntil" TIMESTAMPTZ';
    RAISE NOTICE 'Added accessUntil to companies';
  END IF;

  -- isActive
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='isActive') THEN
    EXECUTE 'ALTER TABLE companies ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true';
    RAISE NOTICE 'Added isActive to companies';
  END IF;

  -- deletionScheduledAt
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='deletionScheduledAt') THEN
    EXECUTE 'ALTER TABLE companies ADD COLUMN "deletionScheduledAt" TIMESTAMPTZ';
    RAISE NOTICE 'Added deletionScheduledAt to companies';
  END IF;

  -- trialEmailsSent
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='trialEmailsSent') THEN
    EXECUTE 'ALTER TABLE companies ADD COLUMN "trialEmailsSent" JSONB';
    RAISE NOTICE 'Added trialEmailsSent to companies';
  END IF;
END $$;

-- 2. User: session duration preference
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='sessionDurationDays') THEN
    EXECUTE 'ALTER TABLE users ADD COLUMN "sessionDurationDays" INTEGER NOT NULL DEFAULT 7';
    RAISE NOTICE 'Added sessionDurationDays to users';
  END IF;
END $$;

-- 3. CustomerEmail table
CREATE TABLE IF NOT EXISTS customer_emails (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "customerId" TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='customer_emails_email_key') THEN
    CREATE UNIQUE INDEX customer_emails_email_key ON customer_emails (email);
    RAISE NOTICE 'Created unique index on customer_emails.email';
  END IF;
END $$;

-- 4. AuditLog table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "actorId" TEXT NOT NULL,
  "actorType" TEXT NOT NULL,
  "companyId" TEXT,
  action TEXT NOT NULL,
  details JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='audit_logs_companyId_idx') THEN
    CREATE INDEX "audit_logs_companyId_idx" ON audit_logs ("companyId");
    RAISE NOTICE 'Created index on audit_logs.companyId';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='audit_logs_actorId_idx') THEN
    CREATE INDEX "audit_logs_actorId_idx" ON audit_logs ("actorId");
    RAISE NOTICE 'Created index on audit_logs.actorId';
  END IF;
END $$;

-- 5. Verify
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_name IN ('companies', 'users', 'customer_emails', 'audit_logs')
  AND column_name IN ('slug', 'customDomain', 'senderEmail', 'trialStartedAt', 'trialEndsAt',
    'subscriptionStatus', 'accessUntil', 'isActive', 'deletionScheduledAt', 'trialEmailsSent',
    'sessionDurationDays', 'email', 'isPrimary', 'actorId', 'actorType', 'action')
  AND table_schema = 'public'
ORDER BY table_name, column_name;
