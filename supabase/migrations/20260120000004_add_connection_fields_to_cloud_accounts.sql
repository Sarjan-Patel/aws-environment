-- Migration: Add database connection fields to cloud_accounts table
-- This allows storing Supabase/database credentials alongside cloud provider accounts

-- Add url column for database connection URL (e.g., Supabase project URL)
ALTER TABLE public.cloud_accounts
ADD COLUMN IF NOT EXISTS url TEXT;

-- Add anon_key column for database anon/public key
ALTER TABLE public.cloud_accounts
ADD COLUMN IF NOT EXISTS anon_key TEXT;

-- Add is_active flag to track active connections
ALTER TABLE public.cloud_accounts
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add created_by to track who created the connection
ALTER TABLE public.cloud_accounts
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add updated_at for tracking changes
ALTER TABLE public.cloud_accounts
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for faster lookups by provider
CREATE INDEX IF NOT EXISTS idx_cloud_accounts_provider ON public.cloud_accounts(provider);

-- Add comment explaining the dual use
COMMENT ON TABLE public.cloud_accounts IS 'Stores both cloud provider accounts (AWS, Azure, GCP) and database connections (Supabase). For Supabase: provider=supabase, url=project_url, anon_key=public_key';
COMMENT ON COLUMN public.cloud_accounts.url IS 'Database connection URL (e.g., https://xxx.supabase.co for Supabase)';
COMMENT ON COLUMN public.cloud_accounts.anon_key IS 'Database anon/public key for authentication';
