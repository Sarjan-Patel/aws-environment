-- ============================================================================
-- USER PROFILES AND ORGANIZATION MEMBERSHIP
-- ============================================================================
-- This migration creates:
-- 1. user_profiles table (extends Supabase auth.users)
-- 2. organization_members table (many-to-many: users ↔ organizations)
-- 3. RLS policies for secure access

-- ============================================================================
-- 1. USER PROFILES TABLE
-- ============================================================================
-- Extends Supabase auth.users with additional profile information
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table user_profiles is 'User profile information extending Supabase auth.users';

-- Index for email lookups
create index if not exists idx_user_profiles_email on user_profiles(email);

-- Enable RLS
alter table user_profiles enable row level security;

-- Policy: Users can read their own profile
create policy "Users can read own profile"
on user_profiles for select
using (auth.uid() = id);

-- Policy: Users can update their own profile
create policy "Users can update own profile"
on user_profiles for update
using (auth.uid() = id);

-- ============================================================================
-- 2. ORGANIZATION MEMBERS TABLE
-- ============================================================================
-- Many-to-many relationship: Users ↔ Organizations
-- Roles: 'owner', 'admin', 'member', 'viewer'
create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  invited_by uuid references user_profiles(id),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, org_id)
);

comment on table organization_members is 'User membership in organizations with role-based access';

-- Indexes for efficient queries
create index if not exists idx_org_members_user_id on organization_members(user_id);
create index if not exists idx_org_members_org_id on organization_members(org_id);
create index if not exists idx_org_members_role on organization_members(role);

-- Enable RLS
alter table organization_members enable row level security;

-- Policy: Users can see their own memberships
create policy "Users can see own memberships"
on organization_members for select
using (auth.uid() = user_id);

-- Create security definer functions to avoid RLS recursion
-- These functions run with postgres privileges and bypass RLS
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

-- Note: We only use "Users can see own memberships" policy above
-- Additional policies for seeing other members can be added later if needed
-- but must use security definer functions to avoid recursion

-- Policy: Organization owners/admins can add members
create policy "Org admins can add members"
on organization_members for insert
with check (public.is_org_admin(org_id));

-- ============================================================================
-- 3. FUNCTION: Auto-create user profile on signup
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: Create profile when user signs up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- 4. UPDATE ORGANIZATIONS RLS POLICY
-- ============================================================================
-- Create function to check user membership (avoids RLS recursion)
create or replace function public.user_org_ids()
returns setof uuid as $$
begin
  -- This function runs with postgres privileges and bypasses RLS
  return query
  select org_id from public.organization_members
  where user_id = auth.uid();
end;
$$ language plpgsql security definer stable;

-- Users can only see organizations they're members of
drop policy if exists "organizations_public_read" on organizations;
create policy "Users see only their organizations"
on organizations for select
using (id = any(select public.user_org_ids()));

-- Organization owners can create organizations
create policy "Users can create organizations"
on organizations for insert
with check (auth.uid() is not null);

-- Organization owners can update their organizations
-- Use security definer function to avoid recursion
create policy "Org owners can update"
on organizations for update
using (public.is_org_owner(id));

-- ============================================================================
-- 5. UPDATE CLOUD_ACCOUNTS RLS POLICY
-- ============================================================================
-- Users can only see accounts in their organizations
-- Use function to avoid RLS recursion
drop policy if exists "cloud_accounts_public_read" on cloud_accounts;
create policy "Users see accounts in their orgs"
on cloud_accounts for select
using (org_id = any(select public.user_org_ids()));

-- Organization admins can create accounts
-- Use security definer function to avoid recursion
create policy "Org admins can create accounts"
on cloud_accounts for insert
with check (public.is_org_admin(org_id));

