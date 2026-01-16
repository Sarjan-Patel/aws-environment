-- Per-resource optimization policy for agent behavior control
-- Values: 'auto_safe' | 'recommend_only' | 'ignore'
--
-- auto_safe: Auto-optimization model can act without human approval
-- recommend_only: Only recommend changes, require human approval
-- ignore: Don't touch this resource at all

-- Instances default to auto_safe (dev/staging can be auto-optimized)
ALTER TABLE instances
ADD COLUMN IF NOT EXISTS optimization_policy text DEFAULT 'auto_safe';

-- Add check constraint separately for IF NOT EXISTS compatibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'instances_optimization_policy_check'
  ) THEN
    ALTER TABLE instances
    ADD CONSTRAINT instances_optimization_policy_check
    CHECK (optimization_policy IN ('auto_safe', 'recommend_only', 'ignore'));
  END IF;
END $$;

-- ASGs default to recommend_only (ASG changes are risky)
ALTER TABLE autoscaling_groups
ADD COLUMN IF NOT EXISTS optimization_policy text DEFAULT 'recommend_only';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'asg_optimization_policy_check'
  ) THEN
    ALTER TABLE autoscaling_groups
    ADD CONSTRAINT asg_optimization_policy_check
    CHECK (optimization_policy IN ('auto_safe', 'recommend_only', 'ignore'));
  END IF;
END $$;

-- S3 buckets default to auto_safe (lifecycle policies are safe)
ALTER TABLE s3_buckets
ADD COLUMN IF NOT EXISTS optimization_policy text DEFAULT 'auto_safe';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 's3_buckets_optimization_policy_check'
  ) THEN
    ALTER TABLE s3_buckets
    ADD CONSTRAINT s3_buckets_optimization_policy_check
    CHECK (optimization_policy IN ('auto_safe', 'recommend_only', 'ignore'));
  END IF;
END $$;

-- Log groups default to auto_safe (retention changes are safe)
ALTER TABLE log_groups
ADD COLUMN IF NOT EXISTS optimization_policy text DEFAULT 'auto_safe';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'log_groups_optimization_policy_check'
  ) THEN
    ALTER TABLE log_groups
    ADD CONSTRAINT log_groups_optimization_policy_check
    CHECK (optimization_policy IN ('auto_safe', 'recommend_only', 'ignore'));
  END IF;
END $$;

-- RDS instances default to recommend_only (database changes need approval)
ALTER TABLE rds_instances
ADD COLUMN IF NOT EXISTS optimization_policy text DEFAULT 'recommend_only';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rds_instances_optimization_policy_check'
  ) THEN
    ALTER TABLE rds_instances
    ADD CONSTRAINT rds_instances_optimization_policy_check
    CHECK (optimization_policy IN ('auto_safe', 'recommend_only', 'ignore'));
  END IF;
END $$;

-- Indexes for filtering by policy
CREATE INDEX IF NOT EXISTS idx_instances_optimization_policy ON instances(optimization_policy);
CREATE INDEX IF NOT EXISTS idx_asg_optimization_policy ON autoscaling_groups(optimization_policy);
CREATE INDEX IF NOT EXISTS idx_s3_optimization_policy ON s3_buckets(optimization_policy);
CREATE INDEX IF NOT EXISTS idx_log_groups_optimization_policy ON log_groups(optimization_policy);
CREATE INDEX IF NOT EXISTS idx_rds_optimization_policy ON rds_instances(optimization_policy);

-- Comments explaining usage
COMMENT ON COLUMN instances.optimization_policy IS 'Controls agent behavior: auto_safe=agent can optimize, recommend_only=needs approval, ignore=hands off';
COMMENT ON COLUMN autoscaling_groups.optimization_policy IS 'Controls agent behavior: auto_safe=agent can optimize, recommend_only=needs approval, ignore=hands off';
COMMENT ON COLUMN s3_buckets.optimization_policy IS 'Controls agent behavior: auto_safe=agent can optimize, recommend_only=needs approval, ignore=hands off';
COMMENT ON COLUMN log_groups.optimization_policy IS 'Controls agent behavior: auto_safe=agent can optimize, recommend_only=needs approval, ignore=hands off';
COMMENT ON COLUMN rds_instances.optimization_policy IS 'Controls agent behavior: auto_safe=agent can optimize, recommend_only=needs approval, ignore=hands off';
