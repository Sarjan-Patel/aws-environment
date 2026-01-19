-- ============================================================================
-- DISABLE ALL RLS POLICIES
-- ============================================================================
-- This migration disables Row Level Security on all tables
-- Useful for development or when authentication is handled at application level

-- Drop all RLS policies first
drop policy if exists "Users can read own profile" on user_profiles;
drop policy if exists "Users can update own profile" on user_profiles;
drop policy if exists "Users can see own memberships" on organization_members;
drop policy if exists "Users can see org members" on organization_members;
drop policy if exists "Org admins can see members" on organization_members;
drop policy if exists "Org admins can add members" on organization_members;
drop policy if exists "Users see only their organizations" on organizations;
drop policy if exists "Users can create organizations" on organizations;
drop policy if exists "Org owners can update" on organizations;
drop policy if exists "organizations_public_read" on organizations;
drop policy if exists "Users see accounts in their orgs" on cloud_accounts;
drop policy if exists "Org admins can create accounts" on cloud_accounts;
drop policy if exists "cloud_accounts_public_read" on cloud_accounts;

-- Disable RLS on all tables
alter table user_profiles disable row level security;
alter table organization_members disable row level security;
alter table organizations disable row level security;
alter table cloud_accounts disable row level security;

-- Note: RLS is now disabled on these tables
-- All data is accessible to any authenticated or anonymous user
-- Application-level authorization should be used instead

