-- Add photos gallery array to products table
-- Run this in Supabase SQL Editor

ALTER TABLE products ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing single photoUrl into the photos array for consistency
UPDATE products 
SET photos = ARRAY["photoUrl"]
WHERE "photoUrl" IS NOT NULL AND (photos IS NULL OR array_length(photos, 1) IS NULL);
