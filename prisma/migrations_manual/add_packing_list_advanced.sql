-- Migration: Add advanced packing list fields
-- Run this manually in Supabase SQL Editor

-- Add new columns to packing_lists table
ALTER TABLE packing_lists 
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'simple',
ADD COLUMN IF NOT EXISTS total_packages INTEGER,
ADD COLUMN IF NOT EXISTS total_net_weight DECIMAL,
ADD COLUMN IF NOT EXISTS total_gross_weight DECIMAL,
ADD COLUMN IF NOT EXISTS group_by_hs_code BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shipper TEXT,
ADD COLUMN IF NOT EXISTS shipper_tax_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS consignee TEXT,
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS shipping_port VARCHAR(200),
ADD COLUMN IF NOT EXISTS destination_port VARCHAR(200),
ADD COLUMN IF NOT EXISTS header_text TEXT,
ADD COLUMN IF NOT EXISTS footer_text TEXT,
ADD COLUMN IF NOT EXISTS custom_notes TEXT;

-- Create packing_list_lines table
CREATE TABLE IF NOT EXISTS packing_list_lines (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  packing_list_id VARCHAR(50) NOT NULL REFERENCES packing_lists(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  product_id VARCHAR(50),
  hs_code VARCHAR(20),
  specification TEXT NOT NULL,
  unit VARCHAR(20) DEFAULT 'PCS',
  quantity INTEGER DEFAULT 1,
  packages INTEGER DEFAULT 1,
  package_number INTEGER,  -- Items with same package_number share a physical package
  net_weight DECIMAL,
  gross_weight DECIMAL,
  cbm DECIMAL,
  grouped_product_ids TEXT,
  is_grouped BOOLEAN DEFAULT false,
  group_name VARCHAR(200),
  line_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add package_number column if table already exists
ALTER TABLE packing_list_lines ADD COLUMN IF NOT EXISTS package_number INTEGER;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_packing_list_lines_packing_list_id ON packing_list_lines(packing_list_id);

-- Create shipping_agents table
CREATE TABLE IF NOT EXISTS shipping_agents (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  street VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  notes TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for shipping agents
CREATE INDEX IF NOT EXISTS idx_shipping_agents_customer_id ON shipping_agents(customer_id);

-- Comment: This migration adds support for:
-- 1. Simple vs Advanced mode for packing lists
-- 2. Net weight and gross weight tracking
-- 3. HS Code grouping for customs
-- 4. Shipping port and destination information
-- 5. Custom header/footer text for flexible formatting
-- 6. Individual line items with detailed weight/cbm tracking
-- 7. Shipping agents for customers (multiple per customer)
