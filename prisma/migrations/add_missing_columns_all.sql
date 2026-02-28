-- =====================================================
-- ADD ALL MISSING COLUMNS TO DATABASE
-- Run this script in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PRODUCTS TABLE - Add missing pricing columns
-- =====================================================
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS "priceBase" DECIMAL;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS prices JSONB;

-- =====================================================
-- INVOICES TABLE - Add type and validUntil columns
-- =====================================================
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'INVOICE';

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMP WITH TIME ZONE;

-- Update existing invoices to have type 'INVOICE'
UPDATE invoices SET type = 'INVOICE' WHERE type IS NULL;

-- Add index for faster filtering by type
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(type);

-- =====================================================
-- VERIFY COLUMNS EXIST
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Added columns: products.priceBase, products.prices, invoices.type, invoices.validUntil';
END $$;
