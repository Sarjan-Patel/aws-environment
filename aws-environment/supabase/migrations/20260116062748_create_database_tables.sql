-- RDS Instances: Managed database instances
create table rds_instances (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references cloud_accounts(id) on delete cascade,
  db_instance_id text not null unique,
  engine text not null default 'postgres',
  instance_class text not null default 'db.t3.micro',
  allocated_storage_gib integer not null default 20,
  env text not null default 'dev',
  region text not null default 'us-east-1',
  state text not null default 'available' check (state in ('available', 'stopped', 'starting', 'stopping', 'deleting')),
  hourly_cost numeric(10,4) not null default 0,
  storage_monthly_cost numeric(10,4) default 0,
  avg_cpu_7d numeric(5,2) default 0,
  avg_connections_7d numeric(10,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_rds_instances_account_id on rds_instances(account_id);
create index idx_rds_instances_state on rds_instances(state);
alter table rds_instances enable row level security;

-- Cache Clusters: Redis/ElastiCache clusters
create table cache_clusters (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references cloud_accounts(id) on delete cascade,
  cluster_id text not null unique,
  engine text not null default 'redis',
  node_type text not null default 'cache.t3.micro',
  num_nodes integer not null default 1,
  env text not null default 'dev',
  region text not null default 'us-east-1',
  hourly_cost numeric(10,4) not null default 0,
  avg_cpu_7d numeric(5,2) default 0,
  avg_memory_7d numeric(5,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_cache_clusters_account_id on cache_clusters(account_id);
alter table cache_clusters enable row level security;
