-- Backfill org_id for existing data
-- Creates a default organization and assigns all existing accounts/resources to it

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

-- Backfill all resource tables (get org_id from their account)
update autoscaling_groups r
set org_id = a.org_id
from cloud_accounts a
where r.account_id = a.id and r.org_id is null;

update instances r
set org_id = a.org_id
from cloud_accounts a
where r.account_id = a.id and r.org_id is null;

update container_clusters r
set org_id = a.org_id
from cloud_accounts a
where r.account_id = a.id and r.org_id is null;

update lambda_functions r
set org_id = a.org_id
from cloud_accounts a
where r.account_id = a.id and r.org_id is null;

update volumes r
set org_id = a.org_id
from cloud_accounts a
where r.account_id = a.id and r.org_id is null;

update snapshots r
set org_id = a.org_id
from cloud_accounts a
where r.account_id = a.id and r.org_id is null;

update s3_buckets r
set org_id = a.org_id
from cloud_accounts a
where r.account_id = a.id and r.org_id is null;

update rds_instances r
set org_id = a.org_id
from cloud_accounts a
where r.account_id = a.id and r.org_id is null;

update cache_clusters r
set org_id = a.org_id
from cloud_accounts a
where r.account_id = a.id and r.org_id is null;

update load_balancers r
set org_id = a.org_id
from cloud_accounts a
where r.account_id = a.id and r.org_id is null;

update elastic_ips r
set org_id = a.org_id
from cloud_accounts a
where r.account_id = a.id and r.org_id is null;

update data_transfer_daily r
set org_id = a.org_id
from cloud_accounts a
where r.account_id = a.id and r.org_id is null;

update managed_services r
set org_id = a.org_id
from cloud_accounts a
where r.account_id = a.id and r.org_id is null;

update streaming_clusters r
set org_id = a.org_id
from cloud_accounts a
where r.account_id = a.id and r.org_id is null;

update log_groups r
set org_id = a.org_id
from cloud_accounts a
where r.account_id = a.id and r.org_id is null;

update commitments r
set org_id = a.org_id
from cloud_accounts a
where r.account_id = a.id and r.org_id is null;

update resource_tags r
set org_id = a.org_id
from cloud_accounts a
where r.account_id = a.id and r.org_id is null;

update metrics_daily r
set org_id = a.org_id
from cloud_accounts a
where r.account_id = a.id and r.org_id is null;

update api_clients r
set org_id = a.org_id
from cloud_accounts a
where r.account_id = a.id and r.org_id is null;

-- Validate and set NOT NULL constraints
alter table cloud_accounts validate constraint fk_cloud_accounts_org;
alter table cloud_accounts alter column org_id set not null;
