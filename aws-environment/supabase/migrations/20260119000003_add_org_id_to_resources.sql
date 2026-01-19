-- Add org_id to all resource tables for efficient org-level queries
-- This denormalizes org_id for faster filtering without joining through cloud_accounts

-- Compute tables
alter table autoscaling_groups add column org_id uuid;
alter table instances add column org_id uuid;
alter table container_clusters add column org_id uuid;
alter table lambda_functions add column org_id uuid;

-- Storage tables
alter table volumes add column org_id uuid;
alter table snapshots add column org_id uuid;
alter table s3_buckets add column org_id uuid;

-- Database tables
alter table rds_instances add column org_id uuid;
alter table cache_clusters add column org_id uuid;

-- Networking tables
alter table load_balancers add column org_id uuid;
alter table elastic_ips add column org_id uuid;
alter table data_transfer_daily add column org_id uuid;

-- Managed services tables
alter table managed_services add column org_id uuid;
alter table streaming_clusters add column org_id uuid;

-- Observability tables
alter table log_groups add column org_id uuid;

-- Commitment tables
alter table commitments add column org_id uuid;

-- Governance tables
alter table resource_tags add column org_id uuid;
alter table metrics_daily add column org_id uuid;

-- Container/API tables
alter table api_clients add column org_id uuid;

-- Add indexes for org-level queries
create index idx_autoscaling_groups_org_id on autoscaling_groups(org_id);
create index idx_instances_org_id on instances(org_id);
create index idx_container_clusters_org_id on container_clusters(org_id);
create index idx_lambda_functions_org_id on lambda_functions(org_id);
create index idx_volumes_org_id on volumes(org_id);
create index idx_snapshots_org_id on snapshots(org_id);
create index idx_s3_buckets_org_id on s3_buckets(org_id);
create index idx_rds_instances_org_id on rds_instances(org_id);
create index idx_cache_clusters_org_id on cache_clusters(org_id);
create index idx_load_balancers_org_id on load_balancers(org_id);
create index idx_elastic_ips_org_id on elastic_ips(org_id);
create index idx_data_transfer_daily_org_id on data_transfer_daily(org_id);
create index idx_managed_services_org_id on managed_services(org_id);
create index idx_streaming_clusters_org_id on streaming_clusters(org_id);
create index idx_log_groups_org_id on log_groups(org_id);
create index idx_commitments_org_id on commitments(org_id);
create index idx_resource_tags_org_id on resource_tags(org_id);
create index idx_metrics_daily_org_id on metrics_daily(org_id);
create index idx_api_clients_org_id on api_clients(org_id);
