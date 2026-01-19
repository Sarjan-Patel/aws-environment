-- Add org_id to cloud_accounts for multi-tenant hierarchy
-- Org → Accounts → Resources

-- Add org_id column (nullable initially for backfill)
alter table cloud_accounts add column org_id uuid;

-- Add foreign key constraint (NOT VALID for non-blocking)
alter table cloud_accounts
  add constraint fk_cloud_accounts_org
  foreign key (org_id) references organizations(id) on delete cascade not valid;

-- Add unique constraint for org_id + id (useful for composite keys)
alter table cloud_accounts
  add constraint cloud_accounts_org_id_id_unique unique (org_id, id);

-- Create index for efficient org-based queries
create index idx_cloud_accounts_org_id on cloud_accounts(org_id);
