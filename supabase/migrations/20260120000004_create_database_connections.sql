-- Migration: Create database_connections table
-- This table stores Supabase/database connection credentials for each organization

CREATE TABLE IF NOT EXISTS database_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'supabase',
    url TEXT NOT NULL,
    anon_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    -- Ensure unique URL per organization
    UNIQUE(org_id, url)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_database_connections_org_id ON database_connections(org_id);

-- Add RLS policies
ALTER TABLE database_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view connections for organizations they're members of
CREATE POLICY "Users can view org database connections"
    ON database_connections FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can insert connections for organizations they're members of
CREATE POLICY "Users can create org database connections"
    ON database_connections FOR INSERT
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can update connections for organizations they're members of
CREATE POLICY "Users can update org database connections"
    ON database_connections FOR UPDATE
    USING (
        org_id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can delete connections for organizations they're members of
CREATE POLICY "Users can delete org database connections"
    ON database_connections FOR DELETE
    USING (
        org_id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Add comment
COMMENT ON TABLE database_connections IS 'Stores database connection credentials (Supabase, etc.) for each organization';
