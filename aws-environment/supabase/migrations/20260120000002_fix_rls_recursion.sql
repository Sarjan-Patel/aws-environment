-- ============================================================================
-- FIX RLS POLICY RECURSION ISSUES
-- ============================================================================
-- This migration fixes infinite recursion in RLS policies by:
-- 1. Simplifying organization_members policies
-- 2. Using security definer functions to avoid recursive checks
-- 3. Removing recursive policy checks

-- Drop existing problematic policies
drop policy if exists "Org admins can see members" on organization_members;
drop policy if exists "Users can see org members" on organization_members;
drop policy if exists "Org admins can add members" on organization_members;
drop policy if exists "Org owners can update" on organizations;
drop policy if exists "Org admins can create accounts" on cloud_accounts;
drop policy if exists "Users see only their organizations" on organizations;
drop policy if exists "Users see accounts in their orgs" on cloud_accounts;

-- Create security definer functions to avoid recursion
-- These functions run with postgres privileges and bypass RLS

-- Function to get user's organization IDs (used in policies to avoid recursion)
create or replace function public.user_org_ids()
returns setof uuid as $$
begin
  -- This function runs with postgres privileges and bypasses RLS
  return query
  select org_id from public.organization_members
  where user_id = auth.uid();
end;
$$ language plpgsql security definer stable;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean as $$
begin
  -- Use security definer to bypass RLS
  -- Function runs with postgres user privileges
  return exists (
    select 1 from public.organization_members
    where org_id = p_org_id
    and user_id = auth.uid()
    and role in ('owner', 'admin')
  );
end;
$$ language plpgsql security definer stable;

create or replace function public.is_org_owner(p_org_id uuid)
returns boolean as $$
begin
  -- Use security definer to bypass RLS
  -- Function runs with postgres user privileges
  return exists (
    select 1 from public.organization_members
    where org_id = p_org_id
    and user_id = auth.uid()
    and role = 'owner'
  );
end;
$$ language plpgsql security definer stable;

-- Note: Removed "Users can see org members" policy to avoid recursion
-- Users can see their own memberships via "Users can see own memberships" policy
-- If needed, admins can see all members via a security definer function later

-- Policy: Organization owners/admins can add members
create policy "Org admins can add members"
on organization_members for insert
with check (public.is_org_admin(org_id));

-- Policy: Organization owners can update their organizations
create policy "Org owners can update"
on organizations for update
using (public.is_org_owner(id));

-- Policy: Users can only see organizations they're members of
-- Use function to avoid RLS recursion
create policy "Users see only their organizations"
on organizations for select
using (id = any(select public.user_org_ids()));

-- Policy: Organization admins can create accounts
create policy "Org admins can create accounts"
on cloud_accounts for insert
with check (public.is_org_admin(org_id));

-- Policy: Users can only see accounts in their organizations
-- Use function to avoid RLS recursion
create policy "Users see accounts in their orgs"
on cloud_accounts for select
using (org_id = any(select public.user_org_ids()));

