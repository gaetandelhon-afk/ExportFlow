-- Add login_banner_url column to company_branding table
ALTER TABLE company_branding 
ADD COLUMN IF NOT EXISTS login_banner_url TEXT;
