-- Resource Tags: Polymorphic tagging for any resource
create table resource_tags (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references cloud_accounts(id) on delete cascade,
  resource_type text not null,
  resource_id text not null,
  key text not null,
  value text not null,
  created_at timestamptz not null default now(),
  unique(resource_type, resource_id, key)
);

create index idx_resource_tags_account_id on resource_tags(account_id);
create index idx_resource_tags_resource on resource_tags(resource_type, resource_id);
create index idx_resource_tags_key on resource_tags(key);
alter table resource_tags enable row level security;

-- Valid resource types constraint (application-level or trigger can enforce)
comment on column resource_tags.resource_type is 'Valid types: instance, volume, snapshot, s3_bucket, rds_instance, cache_cluster, load_balancer, elastic_ip, lambda_function, container_cluster, container_node, streaming_cluster, managed_service, log_group';

-- Metrics Daily: Generic daily metric rollup for any resource
create table metrics_daily (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references cloud_accounts(id) on delete cascade,
  resource_type text not null,
  resource_id text not null,
  date date not null,
  metric_payload jsonb not null default '{}',
  estimated_daily_cost numeric(12,4) default 0,
  created_at timestamptz not null default now(),
  unique(resource_type, resource_id, date)
);

create index idx_metrics_daily_account_id on metrics_daily(account_id);
create index idx_metrics_daily_resource on metrics_daily(resource_type, resource_id);
create index idx_metrics_daily_date on metrics_daily(date desc);
create index idx_metrics_daily_payload on metrics_daily using gin(metric_payload);
alter table metrics_daily enable row level security;
