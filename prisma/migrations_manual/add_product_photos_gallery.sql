-- Add photos gallery array to products table
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

ALTER TABLE products ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing photoUrl into the photos array
UPDATE products 
SET photos = ARRAY["photoUrl"]::TEXT[]
WHERE "photoUrl" IS NOT NULL 
  AND (photos IS NULL OR cardinality(photos) = 0);
