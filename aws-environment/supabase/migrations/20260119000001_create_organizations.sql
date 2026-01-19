-- Organizations: Top-level tenant entity
-- Structure: Organization → Cloud Accounts → Resources

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  settings jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table organizations is 'Top-level organization/tenant for multi-tenant support';

create index idx_organizations_slug on organizations(slug);

-- Enable RLS
alter table organizations enable row level security;

-- Public read policy (will be refined later with auth)
create policy "organizations_public_read" on organizations
  for select using (true);
