-- Cloud Accounts: Root table representing AWS-like accounts
create table cloud_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null default 'aws-fake',
  created_at timestamptz not null default now()
);

comment on table cloud_accounts is 'Logical cloud account/tenant boundary, mirrors AWS account';

-- Enable RLS for future multi-tenant support
alter table cloud_accounts enable row level security;
