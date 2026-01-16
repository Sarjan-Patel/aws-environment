-- Managed Services: OpenSearch, feature stores, etc.
create table managed_services (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references cloud_accounts(id) on delete cascade,
  service_type text not null,
  name text not null,
  env text not null default 'dev',
  region text not null default 'us-east-1',
  instance_type text not null,
  node_count integer not null default 1,
  hourly_cost numeric(10,4) not null default 0,
  avg_cpu_7d numeric(5,2) default 0,
  avg_memory_7d numeric(5,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_managed_services_account_id on managed_services(account_id);
alter table managed_services enable row level security;

-- Streaming Clusters: Kinesis/Kafka-style
create table streaming_clusters (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references cloud_accounts(id) on delete cascade,
  name text not null,
  engine text not null default 'kinesis' check (engine in ('kinesis', 'kafka', 'msk')),
  env text not null default 'dev',
  region text not null default 'us-east-1',
  shard_count integer not null default 1,
  retention_hours integer not null default 24,
  provisioned_throughput_mbps numeric(10,2) default 0,
  avg_usage_mbps_7d numeric(10,2) default 0,
  hourly_cost numeric(10,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_streaming_clusters_account_id on streaming_clusters(account_id);
alter table streaming_clusters enable row level security;
