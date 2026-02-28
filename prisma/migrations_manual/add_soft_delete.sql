-- ============================================
-- Add soft delete fields to all trashable tables
-- RUN AFTER: sync_missing_tables.sql
-- Safe to re-run: uses IF NOT EXISTS
-- ============================================

DO $$
DECLARE
  tbl TEXT;
  col TEXT;
BEGIN
  -- Add trashRetentionDays to companies
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='trashRetentionDays') THEN
    EXECUTE 'ALTER TABLE companies ADD COLUMN "trashRetentionDays" INTEGER NOT NULL DEFAULT 30';
    RAISE NOTICE 'Added trashRetentionDays to companies';
  END IF;

  -- Add deletedAt, deletedBy, deleteReason to all soft-deletable tables (including orders)
  FOREACH tbl IN ARRAY ARRAY[
    'categories', 'products', 'customer_categories', 'customers',
    'invoices', 'orders', 'shipments', 'packing_lists', 'document_templates'
  ] LOOP
    FOREACH col IN ARRAY ARRAY['deletedAt', 'deletedBy', 'deleteReason'] LOOP
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name=tbl AND column_name=col) THEN
        IF col = 'deletedAt' THEN
          EXECUTE format('ALTER TABLE %I ADD COLUMN "deletedAt" TIMESTAMPTZ', tbl);
        ELSIF col = 'deletedBy' THEN
          EXECUTE format('ALTER TABLE %I ADD COLUMN "deletedBy" TEXT', tbl);
        ELSIF col = 'deleteReason' THEN
          EXECUTE format('ALTER TABLE %I ADD COLUMN "deleteReason" TEXT', tbl);
        END IF;
        RAISE NOTICE 'Added % to %', col, tbl;
      ELSE
        RAISE NOTICE '% already exists on %', col, tbl;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Foreign keys for deletedBy -> users.id
DO $$ 
DECLARE
  tbl TEXT;
  fk_name TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'categories', 'products', 'customer_categories', 'customers',
    'invoices', 'orders', 'shipments', 'packing_lists', 'document_templates'
  ] LOOP
    fk_name := tbl || '_deletedBy_fkey';
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name=fk_name AND table_name=tbl) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("deletedBy") REFERENCES users(id) ON DELETE SET NULL', tbl, fk_name);
      RAISE NOTICE 'Added FK % on %', fk_name, tbl;
    END IF;
  END LOOP;
END $$;

-- Indexes for soft-deleted queries
DO $$
DECLARE
  tbl TEXT;
  idx TEXT;
BEGIN
  -- Tables with direct companyId
  FOREACH tbl IN ARRAY ARRAY[
    'categories', 'products', 'customer_categories', 'customers',
    'orders', 'shipments', 'document_templates'
  ] LOOP
    idx := 'idx_' || tbl || '_deleted';
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname=idx) THEN
      EXECUTE format('CREATE INDEX %I ON %I ("companyId", "deletedAt")', idx, tbl);
      RAISE NOTICE 'Created index % on %', idx, tbl;
    END IF;
  END LOOP;

  -- invoices: no direct companyId
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_invoices_deleted') THEN
    CREATE INDEX idx_invoices_deleted ON invoices ("deletedAt");
    RAISE NOTICE 'Created index on invoices';
  END IF;

  -- packing_lists
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_packing_lists_deleted') THEN
    CREATE INDEX idx_packing_lists_deleted ON packing_lists ("companyId", "deletedAt");
    RAISE NOTICE 'Created index on packing_lists';
  END IF;
END $$;

-- Verify: should show 9 tables with deletedAt (including orders)
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name IN ('deletedAt', 'deletedBy', 'deleteReason') AND table_schema = 'public'
ORDER BY table_name, column_name;
