-- Add invoice_id to order_charges and order_discounts
-- This allows charges and discounts to be scoped per document (invoice/quote/proforma)
-- instead of being shared across all documents for the same order.

ALTER TABLE order_charges ADD COLUMN IF NOT EXISTS invoice_id TEXT;
ALTER TABLE order_discounts ADD COLUMN IF NOT EXISTS invoice_id TEXT;

-- Index for fast lookups by document
CREATE INDEX IF NOT EXISTS idx_order_charges_invoice_id ON order_charges(invoice_id);
CREATE INDEX IF NOT EXISTS idx_order_discounts_invoice_id ON order_discounts(invoice_id);
