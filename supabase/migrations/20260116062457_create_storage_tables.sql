-- Volumes: EBS-style block storage
create table volumes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references cloud_accounts(id) on delete cascade,
  volume_id text not null unique,
  region text not null default 'us-east-1',
  size_gib integer not null,
  volume_type text not null default 'gp3',
  state text not null default 'available' check (state in ('creating', 'available', 'in-use', 'deleting', 'deleted')),
  attached_instance_id text,
  monthly_cost numeric(10,4) not null default 0,
  last_used_at timestamptz,
  tags jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_volumes_account_id on volumes(account_id);
create index idx_volumes_state on volumes(state);
create index idx_volumes_attached on volumes(attached_instance_id) where attached_instance_id is not null;
alter table volumes enable row level security;

-- Snapshots: EBS snapshots/backups
create table snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references cloud_accounts(id) on delete cascade,
  snapshot_id text not null unique,
  region text not null default 'us-east-1',
  source_volume_id text,
  size_gib integer not null,
  retention_policy text,
  monthly_cost numeric(10,4) not null default 0,
  tags jsonb default '{}',
  created_at timestamptz not null default now()
);

create index idx_snapshots_account_id on snapshots(account_id);
create index idx_snapshots_source_volume on snapshots(source_volume_id) where source_volume_id is not null;
alter table snapshots enable row level security;

-- S3 Buckets: Object storage
create table s3_buckets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references cloud_accounts(id) on delete cascade,
  name text not null unique,
  env text not null default 'dev',
  region text not null default 'us-east-1',
  lifecycle_policy jsonb default '{}',
  tags jsonb default '{}',
  created_at timestamptz not null default now()
);

create index idx_s3_buckets_account_id on s3_buckets(account_id);
alter table s3_buckets enable row level security;

-- S3 Bucket Usage Daily: Time-series usage metrics
create table s3_bucket_usage_daily (
  id uuid primary key default gen_random_uuid(),
  bucket_id uuid not null references s3_buckets(id) on delete cascade,
  date date not null,
  storage_gb_standard numeric(12,4) default 0,
  storage_gb_ia numeric(12,4) default 0,
  storage_gb_glacier numeric(12,4) default 0,
  requests_count bigint default 0,
  estimated_storage_cost numeric(10,4) default 0,
  estimated_request_cost numeric(10,4) default 0,
  unique(bucket_id, date)
);

create index idx_s3_bucket_usage_bucket_id on s3_bucket_usage_daily(bucket_id);
create index idx_s3_bucket_usage_date on s3_bucket_usage_daily(date desc);
alter table s3_bucket_usage_daily enable row level security;
