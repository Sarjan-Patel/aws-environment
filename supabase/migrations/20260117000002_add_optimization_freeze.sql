-- Optimization freeze windows
-- Allow business intent override - "don't touch prod during sale"
-- If NOW() < freeze_until timestamp, agents should only warn, not modify

-- Account-level freeze for all resources in an account
ALTER TABLE cloud_accounts
ADD COLUMN IF NOT EXISTS freeze_optimizations_until timestamptz;

-- Resource-level freeze for granular control on ASGs
ALTER TABLE autoscaling_groups
ADD COLUMN IF NOT EXISTS optimization_freeze_until timestamptz;

-- Resource-level freeze for granular control on instances
ALTER TABLE instances
ADD COLUMN IF NOT EXISTS optimization_freeze_until timestamptz;

-- Partial indexes for efficient freeze checking (only index non-null values)
CREATE INDEX IF NOT EXISTS idx_accounts_freeze ON cloud_accounts(freeze_optimizations_until)
WHERE freeze_optimizations_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_asg_freeze ON autoscaling_groups(optimization_freeze_until)
WHERE optimization_freeze_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_instances_freeze ON instances(optimization_freeze_until)
WHERE optimization_freeze_until IS NOT NULL;

-- Comments explaining usage
COMMENT ON COLUMN cloud_accounts.freeze_optimizations_until IS 'If NOW() < this timestamp, agent should only warn, not modify any resources in this account';
COMMENT ON COLUMN autoscaling_groups.optimization_freeze_until IS 'If NOW() < this timestamp, agent should only warn, not modify this ASG';
COMMENT ON COLUMN instances.optimization_freeze_until IS 'If NOW() < this timestamp, agent should only warn, not modify this instance';
