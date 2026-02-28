-- Add currency column to price_tiers table
-- Run this in Supabase SQL Editor

ALTER TABLE price_tiers
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'CNY';
