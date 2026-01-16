-- Log Groups: CloudWatch-style log groups
create table log_groups (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references cloud_accounts(id) on delete cascade,
  name text not null,
  env text not null default 'dev',
  region text not null default 'us-east-1',
  retention_days integer default 30,
  tags jsonb default '{}',
  created_at timestamptz not null default now()
);

create index idx_log_groups_account_id on log_groups(account_id);
alter table log_groups enable row level security;

-- Log Group Usage Daily: Ingestion and storage metrics
create table log_group_usage_daily (
  id uuid primary key default gen_random_uuid(),
  log_group_id uuid not null references log_groups(id) on delete cascade,
  date date not null,
  ingested_gb numeric(12,4) default 0,
  stored_gb numeric(12,4) default 0,
  estimated_ingestion_cost numeric(10,4) default 0,
  estimated_storage_cost numeric(10,4) default 0,
  unique(log_group_id, date)
);

create index idx_log_group_usage_log_group_id on log_group_usage_daily(log_group_id);
create index idx_log_group_usage_date on log_group_usage_daily(date desc);
alter table log_group_usage_daily enable row level security;
