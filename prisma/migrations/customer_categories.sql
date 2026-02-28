-- Migration: Add Customer Categories
-- Run this SQL in Supabase SQL Editor (https://supabase.com/dashboard/project/iicxmpfivtacpegtstfr/sql)

-- 1. Create customer_categories table
CREATE TABLE IF NOT EXISTS "customer_categories" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameCn" TEXT,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "customer_categories_pkey" PRIMARY KEY ("id")
);

-- 2. Add categoryId column to customers table (if not exists)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='categoryId') THEN
        ALTER TABLE "customers" ADD COLUMN "categoryId" TEXT;
    END IF;
END $$;

-- 3. Create foreign key constraints
DO $$
BEGIN
    -- Self-referential FK for parent categories
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_categories_parentId_fkey') THEN
        ALTER TABLE "customer_categories" ADD CONSTRAINT "customer_categories_parentId_fkey" 
        FOREIGN KEY ("parentId") REFERENCES "customer_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    -- FK to companies
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_categories_companyId_fkey') THEN
        ALTER TABLE "customer_categories" ADD CONSTRAINT "customer_categories_companyId_fkey" 
        FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    -- FK from customers to customer_categories
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_categoryId_fkey') THEN
        ALTER TABLE "customers" ADD CONSTRAINT "customers_categoryId_fkey" 
        FOREIGN KEY ("categoryId") REFERENCES "customer_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS "customer_categories_companyId_idx" ON "customer_categories"("companyId");
CREATE INDEX IF NOT EXISTS "customer_categories_parentId_idx" ON "customer_categories"("parentId");
CREATE INDEX IF NOT EXISTS "customers_categoryId_idx" ON "customers"("categoryId");

-- Done! After running this, regenerate Prisma client with: npx prisma generate
