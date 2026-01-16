-- Container Services: Logical services/deployments on clusters
create table container_services (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references container_clusters(id) on delete cascade,
  name text not null,
  env text not null default 'dev',
  region text not null default 'us-east-1',
  requested_cpu numeric(10,4) default 0,
  requested_memory_mb integer default 0,
  replica_count integer not null default 1,
  avg_cpu_7d numeric(5,2) default 0,
  avg_memory_7d numeric(5,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_container_services_cluster_id on container_services(cluster_id);
alter table container_services enable row level security;

-- API Clients: IAM-style API clients for external access
create table api_clients (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references cloud_accounts(id) on delete cascade,
  name text not null,
  access_key_id text not null unique,
  secret_key_hash text not null,
  scopes jsonb not null default '["read:*"]',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index idx_api_clients_account_id on api_clients(account_id);
create index idx_api_clients_access_key on api_clients(access_key_id);
alter table api_clients enable row level security;
