-- Migration: Add serial number management
-- Date: 2026-02-22

-- 1. Add serial fields to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS requires_serial BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS serial_prefix   TEXT;

-- 2. Create serial_numbers table
CREATE TABLE IF NOT EXISTS serial_numbers (
  id           TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::text,
  serial       TEXT         NOT NULL,
  generated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  generated_by TEXT         NOT NULL,

  -- FKs
  order_line_id TEXT        NOT NULL REFERENCES order_lines(id) ON DELETE CASCADE,
  product_id    TEXT        NOT NULL REFERENCES products(id),
  company_id    TEXT        NOT NULL,
  order_id      TEXT        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  CONSTRAINT serial_numbers_company_serial_unique UNIQUE (company_id, serial)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_serial_numbers_order_id      ON serial_numbers (order_id);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_order_line_id ON serial_numbers (order_line_id);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_company_id    ON serial_numbers (company_id);

-- 4. RLS
ALTER TABLE serial_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_full_access" ON serial_numbers
  USING (true)
  WITH CHECK (true);
