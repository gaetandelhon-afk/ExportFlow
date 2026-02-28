-- Add type and validUntil columns to invoices table
-- Run this script manually in your Supabase SQL Editor

-- Add type column with default value 'INVOICE'
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'INVOICE';

-- Add validUntil column for quotes
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMP WITH TIME ZONE;

-- Update existing invoices to have type 'INVOICE'
UPDATE invoices SET type = 'INVOICE' WHERE type IS NULL;

-- Add index for faster filtering by type
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(type);

-- Add comment
COMMENT ON COLUMN invoices.type IS 'Document type: INVOICE, QUOTE, or PROFORMA';
COMMENT ON COLUMN invoices."validUntil" IS 'Validity period for quotes';
