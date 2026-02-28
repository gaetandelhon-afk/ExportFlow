-- Fix packing_list_lines column naming inconsistency
-- This migration handles both cases: camelCase columns and snake_case columns
-- Run this in Supabase SQL Editor

-- Ensure packing_list_lines table exists with camelCase columns (Prisma default)
CREATE TABLE IF NOT EXISTS packing_list_lines (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "packingListId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "productId" TEXT,
  "hsCode" TEXT,
  "specification" TEXT NOT NULL DEFAULT '',
  "unit" TEXT NOT NULL DEFAULT 'PCS',
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "packages" INTEGER NOT NULL DEFAULT 1,
  "packageNumber" INTEGER,
  "netWeight" DECIMAL(65,30),
  "grossWeight" DECIMAL(65,30),
  "cbm" DECIMAL(65,30),
  "groupedProductIds" TEXT,
  "isGrouped" BOOLEAN NOT NULL DEFAULT false,
  "groupName" TEXT,
  "lineNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "packing_list_lines_pkey" PRIMARY KEY ("id")
);

-- If the table exists with snake_case columns, add camelCase aliases
-- (This handles the case where add_packing_list_advanced.sql was run first)
DO $$
BEGIN
  -- Check if snake_case column exists but camelCase doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'packing_list_lines' AND column_name = 'packing_list_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'packing_list_lines' AND column_name = 'packingListId'
  ) THEN
    -- Add camelCase columns alongside snake_case
    ALTER TABLE packing_list_lines ADD COLUMN IF NOT EXISTS "packingListId" TEXT;
    ALTER TABLE packing_list_lines ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER DEFAULT 0;
    ALTER TABLE packing_list_lines ADD COLUMN IF NOT EXISTS "productId" TEXT;
    ALTER TABLE packing_list_lines ADD COLUMN IF NOT EXISTS "hsCode" TEXT;
    ALTER TABLE packing_list_lines ADD COLUMN IF NOT EXISTS "packageNumber" INTEGER;
    ALTER TABLE packing_list_lines ADD COLUMN IF NOT EXISTS "netWeight" DECIMAL(65,30);
    ALTER TABLE packing_list_lines ADD COLUMN IF NOT EXISTS "grossWeight" DECIMAL(65,30);
    ALTER TABLE packing_list_lines ADD COLUMN IF NOT EXISTS "groupedProductIds" TEXT;
    ALTER TABLE packing_list_lines ADD COLUMN IF NOT EXISTS "isGrouped" BOOLEAN DEFAULT false;
    ALTER TABLE packing_list_lines ADD COLUMN IF NOT EXISTS "groupName" TEXT;
    ALTER TABLE packing_list_lines ADD COLUMN IF NOT EXISTS "lineNotes" TEXT;
    ALTER TABLE packing_list_lines ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE packing_list_lines ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

    -- Copy data from snake_case to camelCase
    UPDATE packing_list_lines SET
      "packingListId" = packing_list_id,
      "sortOrder" = sort_order,
      "productId" = product_id,
      "hsCode" = hs_code,
      "packageNumber" = package_number,
      "netWeight" = net_weight,
      "grossWeight" = gross_weight,
      "groupedProductIds" = grouped_product_ids,
      "isGrouped" = COALESCE(is_grouped, false),
      "groupName" = group_name,
      "lineNotes" = line_notes,
      "createdAt" = COALESCE(created_at, NOW()),
      "updatedAt" = COALESCE(updated_at, NOW());

    RAISE NOTICE 'Migrated packing_list_lines from snake_case to camelCase columns';
  ELSE
    RAISE NOTICE 'packing_list_lines already has camelCase columns or does not need migration';
  END IF;
END $$;

-- Add FK constraint if missing
ALTER TABLE packing_list_lines 
  DROP CONSTRAINT IF EXISTS "packing_list_lines_packingListId_fkey";
ALTER TABLE packing_list_lines 
  ADD CONSTRAINT "packing_list_lines_packingListId_fkey" 
  FOREIGN KEY ("packingListId") REFERENCES packing_lists(id) ON DELETE CASCADE
  NOT VALID;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS "packing_list_lines_packingListId_idx" ON packing_list_lines("packingListId");
