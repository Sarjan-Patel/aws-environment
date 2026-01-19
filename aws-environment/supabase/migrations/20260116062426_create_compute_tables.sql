-- Autoscaling Groups: AWS Auto Scaling Groups
create table autoscaling_groups (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references cloud_accounts(id) on delete cascade,
  name text not null,
  min_size integer not null default 0,
  max_size integer not null default 10,
  desired_capacity integer not null default 1,
  instance_type text not null,
  env text not null default 'dev',
  region text not null default 'us-east-1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_autoscaling_groups_account_id on autoscaling_groups(account_id);
alter table autoscaling_groups enable row level security;

-- Instances: EC2-style virtual machines
create table instances (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references cloud_accounts(id) on delete cascade,
  instance_id text not null unique,
  name text,
  instance_type text not null,
  env text not null default 'dev',
  region text not null default 'us-east-1',
  state text not null default 'running' check (state in ('pending', 'running', 'stopping', 'stopped', 'terminated')),
  autoscaling_group_id uuid references autoscaling_groups(id) on delete set null,
  launch_time timestamptz not null default now(),
  hourly_cost numeric(10,4) not null default 0,
  gpu_hourly_cost numeric(10,4) default 0,
  gpu_count integer default 0,
  has_gpu boolean default false,
  avg_cpu_7d numeric(5,2) default 0,
  avg_network_7d numeric(12,2) default 0,
  last_active_at timestamptz,
  tags jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_instances_account_id on instances(account_id);
create index idx_instances_asg_id on instances(autoscaling_group_id) where autoscaling_group_id is not null;
create index idx_instances_state on instances(state);
create index idx_instances_tags on instances using gin(tags);
alter table instances enable row level security;

-- Container Clusters: ECS/EKS/K8s clusters
create table container_clusters (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references cloud_accounts(id) on delete cascade,
  name text not null,
  env text not null default 'dev',
  region text not null default 'us-east-1',
  node_instance_type text not null default 'm5.large',
  desired_nodes integer not null default 3,
  min_nodes integer not null default 1,
  max_nodes integer not null default 10,
  estimated_hourly_cost numeric(10,4) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_container_clusters_account_id on container_clusters(account_id);
alter table container_clusters enable row level security;

-- Container Nodes: Worker nodes inside clusters
create table container_nodes (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references container_clusters(id) on delete cascade,
  instance_id text not null,
  instance_type text not null,
  region text not null default 'us-east-1',
  state text not null default 'running' check (state in ('running', 'stopped')),
  hourly_cost numeric(10,4) not null default 0,
  gpu_hourly_cost numeric(10,4) default 0,
  gpu_count integer default 0,
  has_gpu boolean default false,
  avg_cpu_7d numeric(5,2) default 0,
  avg_memory_7d numeric(5,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_container_nodes_cluster_id on container_nodes(cluster_id);
alter table container_nodes enable row level security;

-- Lambda Functions: Serverless functions
create table lambda_functions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references cloud_accounts(id) on delete cascade,
  name text not null,
  env text not null default 'dev',
  region text not null default 'us-east-1',
  memory_mb integer not null default 128,
  timeout_seconds integer not null default 30,
  provisioned_concurrency integer default 0,
  invocations_7d bigint default 0,
  avg_duration_ms_7d numeric(10,2) default 0,
  estimated_monthly_cost numeric(12,4) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_lambda_functions_account_id on lambda_functions(account_id);
alter table lambda_functions enable row level security;
