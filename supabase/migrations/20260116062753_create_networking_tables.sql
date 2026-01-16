-- Load Balancers: ELB/ALB/NLB
create table load_balancers (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references cloud_accounts(id) on delete cascade,
  lb_arn text not null unique,
  name text not null,
  type text not null default 'application' check (type in ('application', 'network', 'gateway', 'classic')),
  env text not null default 'dev',
  region text not null default 'us-east-1',
  hourly_cost numeric(10,4) not null default 0,
  avg_request_count_7d numeric(12,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_load_balancers_account_id on load_balancers(account_id);
alter table load_balancers enable row level security;

-- Elastic IPs: Static public IP addresses
create table elastic_ips (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references cloud_accounts(id) on delete cascade,
  allocation_id text not null unique,
  public_ip text not null,
  associated_instance_id text,
  associated_lb_arn text,
  state text not null default 'unassociated' check (state in ('associated', 'unassociated')),
  hourly_cost numeric(10,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_elastic_ips_account_id on elastic_ips(account_id);
create index idx_elastic_ips_state on elastic_ips(state);
alter table elastic_ips enable row level security;

-- Data Transfer Daily: Network transfer metrics
create table data_transfer_daily (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references cloud_accounts(id) on delete cascade,
  date date not null,
  source_region text not null,
  dest_region text not null,
  direction text not null check (direction in ('intra-az', 'cross-az', 'cross-region', 'egress', 'ingress')),
  gb_transferred numeric(12,4) not null default 0,
  estimated_transfer_cost numeric(10,4) default 0
);

create index idx_data_transfer_account_id on data_transfer_daily(account_id);
create index idx_data_transfer_date on data_transfer_daily(date desc);
alter table data_transfer_daily enable row level security;
