-- ============================================================================
-- COMBINED ORGANIZATION MIGRATIONS (ALL 4 STEPS)
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vqcvrwkdvxzgucqcfcoq/sql
-- ============================================================================

-- ========================================
-- Migration 1: Create organizations table
-- ========================================

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  settings jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table organizations is 'Top-level organization/tenant for multi-tenant support';

create index if not exists idx_organizations_slug on organizations(slug);

alter table organizations enable row level security;

-- Public read policy
drop policy if exists "organizations_public_read" on organizations;
create policy "organizations_public_read" on organizations for select using (true);

-- ========================================
-- Migration 2: Add org_id to cloud_accounts
-- ========================================

alter table cloud_accounts add column if not exists org_id uuid;

-- Add foreign key constraint (skip if exists)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_cloud_accounts_org') then
    alter table cloud_accounts
      add constraint fk_cloud_accounts_org
      foreign key (org_id) references organizations(id) on delete cascade not valid;
  end if;
end $$;

-- Add unique constraint (skip if exists)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cloud_accounts_org_id_id_unique') then
    alter table cloud_accounts
      add constraint cloud_accounts_org_id_id_unique unique (org_id, id);
  end if;
end $$;

create index if not exists idx_cloud_accounts_org_id on cloud_accounts(org_id);

-- ========================================
-- Migration 3: Add org_id to all resource tables
-- ========================================

-- Compute tables
alter table autoscaling_groups add column if not exists org_id uuid;
alter table instances add column if not exists org_id uuid;
alter table container_clusters add column if not exists org_id uuid;
alter table lambda_functions add column if not exists org_id uuid;

-- Storage tables
alter table volumes add column if not exists org_id uuid;
alter table snapshots add column if not exists org_id uuid;
alter table s3_buckets add column if not exists org_id uuid;

-- Database tables
alter table rds_instances add column if not exists org_id uuid;
alter table cache_clusters add column if not exists org_id uuid;

-- Networking tables
alter table load_balancers add column if not exists org_id uuid;
alter table elastic_ips add column if not exists org_id uuid;
alter table data_transfer_daily add column if not exists org_id uuid;

-- Managed services tables
alter table managed_services add column if not exists org_id uuid;
alter table streaming_clusters add column if not exists org_id uuid;

-- Observability tables
alter table log_groups add column if not exists org_id uuid;

-- Commitment tables
alter table commitments add column if not exists org_id uuid;

-- Governance tables
alter table resource_tags add column if not exists org_id uuid;
alter table metrics_daily add column if not exists org_id uuid;

-- Container/API tables
alter table api_clients add column if not exists org_id uuid;

-- Add indexes for org-level queries
create index if not exists idx_autoscaling_groups_org_id on autoscaling_groups(org_id);
create index if not exists idx_instances_org_id on instances(org_id);
create index if not exists idx_container_clusters_org_id on container_clusters(org_id);
create index if not exists idx_lambda_functions_org_id on lambda_functions(org_id);
create index if not exists idx_volumes_org_id on volumes(org_id);
create index if not exists idx_snapshots_org_id on snapshots(org_id);
create index if not exists idx_s3_buckets_org_id on s3_buckets(org_id);
create index if not exists idx_rds_instances_org_id on rds_instances(org_id);
create index if not exists idx_cache_clusters_org_id on cache_clusters(org_id);
create index if not exists idx_load_balancers_org_id on load_balancers(org_id);
create index if not exists idx_elastic_ips_org_id on elastic_ips(org_id);
create index if not exists idx_data_transfer_daily_org_id on data_transfer_daily(org_id);
create index if not exists idx_managed_services_org_id on managed_services(org_id);
create index if not exists idx_streaming_clusters_org_id on streaming_clusters(org_id);
create index if not exists idx_log_groups_org_id on log_groups(org_id);
create index if not exists idx_commitments_org_id on commitments(org_id);
create index if not exists idx_resource_tags_org_id on resource_tags(org_id);
create index if not exists idx_metrics_daily_org_id on metrics_daily(org_id);
create index if not exists idx_api_clients_org_id on api_clients(org_id);

-- ========================================
-- Migration 4: Backfill org_id
-- ========================================

-- Create default organization
insert into organizations (id, name, slug, settings)
values (
  '00000000-0000-0000-0000-000000000001',
  'Acme Corp',
  'acme-corp',
  '{"plan": "enterprise", "created_by": "migration"}'
) on conflict (id) do nothing;

-- Backfill cloud_accounts
update cloud_accounts
set org_id = '00000000-0000-0000-0000-000000000001'
where org_id is null;

-- Backfill all resource tables
update autoscaling_groups r set org_id = a.org_id from cloud_accounts a where r.account_id = a.id and r.org_id is null;
update instances r set org_id = a.org_id from cloud_accounts a where r.account_id = a.id and r.org_id is null;
update container_clusters r set org_id = a.org_id from cloud_accounts a where r.account_id = a.id and r.org_id is null;
update lambda_functions r set org_id = a.org_id from cloud_accounts a where r.account_id = a.id and r.org_id is null;
update volumes r set org_id = a.org_id from cloud_accounts a where r.account_id = a.id and r.org_id is null;
update snapshots r set org_id = a.org_id from cloud_accounts a where r.account_id = a.id and r.org_id is null;
update s3_buckets r set org_id = a.org_id from cloud_accounts a where r.account_id = a.id and r.org_id is null;
update rds_instances r set org_id = a.org_id from cloud_accounts a where r.account_id = a.id and r.org_id is null;
update cache_clusters r set org_id = a.org_id from cloud_accounts a where r.account_id = a.id and r.org_id is null;
update load_balancers r set org_id = a.org_id from cloud_accounts a where r.account_id = a.id and r.org_id is null;
update elastic_ips r set org_id = a.org_id from cloud_accounts a where r.account_id = a.id and r.org_id is null;
update data_transfer_daily r set org_id = a.org_id from cloud_accounts a where r.account_id = a.id and r.org_id is null;
update managed_services r set org_id = a.org_id from cloud_accounts a where r.account_id = a.id and r.org_id is null;
update streaming_clusters r set org_id = a.org_id from cloud_accounts a where r.account_id = a.id and r.org_id is null;
update log_groups r set org_id = a.org_id from cloud_accounts a where r.account_id = a.id and r.org_id is null;
update commitments r set org_id = a.org_id from cloud_accounts a where r.account_id = a.id and r.org_id is null;
update resource_tags r set org_id = a.org_id from cloud_accounts a where r.account_id = a.id and r.org_id is null;
update metrics_daily r set org_id = a.org_id from cloud_accounts a where r.account_id = a.id and r.org_id is null;
update api_clients r set org_id = a.org_id from cloud_accounts a where r.account_id = a.id and r.org_id is null;

-- Validate and set NOT NULL constraint on cloud_accounts
alter table cloud_accounts validate constraint fk_cloud_accounts_org;
alter table cloud_accounts alter column org_id set not null;

-- Done!
select 'Migration completed successfully!' as status;
