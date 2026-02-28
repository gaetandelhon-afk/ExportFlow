-- Migration: Add missing columns to customers table
-- Run this SQL in Supabase SQL Editor

-- Add structured shipping address fields
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "shippingStreet" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "shippingCity" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "shippingState" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "shippingPostalCode" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "shippingCountry" TEXT;

-- Add structured billing address fields
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "billingStreet" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "billingCity" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "billingState" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "billingPostalCode" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "billingCountry" TEXT;

-- Add priceTierId if not exists
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "priceTierId" TEXT;

-- Done!
