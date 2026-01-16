-- Commitments: Reserved Instances / Savings Plans
create table commitments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references cloud_accounts(id) on delete cascade,
  commitment_type text not null check (commitment_type in ('reserved_instance', 'savings_plan', 'edp')),
  scope text not null,
  term_months integer not null check (term_months in (12, 36)),
  hourly_commitment_amount numeric(10,4) not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

create index idx_commitments_account_id on commitments(account_id);
create index idx_commitments_dates on commitments(start_date, end_date);
alter table commitments enable row level security;

-- Commitment Utilization Daily
create table commitment_utilization_daily (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references commitments(id) on delete cascade,
  date date not null,
  actual_hourly_usage_equivalent numeric(10,4) default 0,
  utilization_percent numeric(5,2) default 0,
  estimated_savings_vs_ondemand numeric(10,4) default 0,
  unique(commitment_id, date)
);

create index idx_commitment_util_commitment_id on commitment_utilization_daily(commitment_id);
create index idx_commitment_util_date on commitment_utilization_daily(date desc);
alter table commitment_utilization_daily enable row level security;
