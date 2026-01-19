-- Add optimization columns to remaining resource tables
-- This migration adds:
-- 1. optimization_policy to tables that don't have it yet
-- 2. optimization_policy_locked to ALL resource tables (enforces prod safety)
-- 3. optimization_freeze_until to remaining tables
-- 4. Triggers to auto-lock production resources

-- ============================================================================
-- Part 1: Add optimization_policy to remaining tables
-- ============================================================================

-- Volumes default to auto_safe (unattached volumes are safe to clean up)
ALTER TABLE volumes ADD COLUMN IF NOT EXISTS
  optimization_policy text DEFAULT 'auto_safe';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'volumes_optimization_policy_check'
  ) THEN
    ALTER TABLE volumes
    ADD CONSTRAINT volumes_optimization_policy_check
    CHECK (optimization_policy IN ('auto_safe', 'recommend_only', 'ignore'));
  END IF;
END $$;

-- Snapshots default to auto_safe (old snapshots are safe to clean up)
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS
  optimization_policy text DEFAULT 'auto_safe';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'snapshots_optimization_policy_check'
  ) THEN
    ALTER TABLE snapshots
    ADD CONSTRAINT snapshots_optimization_policy_check
    CHECK (optimization_policy IN ('auto_safe', 'recommend_only', 'ignore'));
  END IF;
END $$;

-- Load balancers default to recommend_only (deletion is risky)
ALTER TABLE load_balancers ADD COLUMN IF NOT EXISTS
  optimization_policy text DEFAULT 'recommend_only';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'load_balancers_optimization_policy_check'
  ) THEN
    ALTER TABLE load_balancers
    ADD CONSTRAINT load_balancers_optimization_policy_check
    CHECK (optimization_policy IN ('auto_safe', 'recommend_only', 'ignore'));
  END IF;
END $$;

-- Lambda functions default to recommend_only (rightsizing needs review)
ALTER TABLE lambda_functions ADD COLUMN IF NOT EXISTS
  optimization_policy text DEFAULT 'recommend_only';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lambda_functions_optimization_policy_check'
  ) THEN
    ALTER TABLE lambda_functions
    ADD CONSTRAINT lambda_functions_optimization_policy_check
    CHECK (optimization_policy IN ('auto_safe', 'recommend_only', 'ignore'));
  END IF;
END $$;

-- Cache clusters default to recommend_only (deletion is risky)
ALTER TABLE cache_clusters ADD COLUMN IF NOT EXISTS
  optimization_policy text DEFAULT 'recommend_only';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cache_clusters_optimization_policy_check'
  ) THEN
    ALTER TABLE cache_clusters
    ADD CONSTRAINT cache_clusters_optimization_policy_check
    CHECK (optimization_policy IN ('auto_safe', 'recommend_only', 'ignore'));
  END IF;
END $$;

-- ============================================================================
-- Part 2: Add optimization_policy_locked to ALL resource tables
-- When true, policy cannot be changed by users (enforces recommend_only)
-- ============================================================================

ALTER TABLE instances ADD COLUMN IF NOT EXISTS optimization_policy_locked boolean DEFAULT false;
ALTER TABLE autoscaling_groups ADD COLUMN IF NOT EXISTS optimization_policy_locked boolean DEFAULT false;
ALTER TABLE s3_buckets ADD COLUMN IF NOT EXISTS optimization_policy_locked boolean DEFAULT false;
ALTER TABLE log_groups ADD COLUMN IF NOT EXISTS optimization_policy_locked boolean DEFAULT false;
ALTER TABLE rds_instances ADD COLUMN IF NOT EXISTS optimization_policy_locked boolean DEFAULT false;
ALTER TABLE elastic_ips ADD COLUMN IF NOT EXISTS optimization_policy_locked boolean DEFAULT false;
ALTER TABLE volumes ADD COLUMN IF NOT EXISTS optimization_policy_locked boolean DEFAULT false;
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS optimization_policy_locked boolean DEFAULT false;
ALTER TABLE load_balancers ADD COLUMN IF NOT EXISTS optimization_policy_locked boolean DEFAULT false;
ALTER TABLE lambda_functions ADD COLUMN IF NOT EXISTS optimization_policy_locked boolean DEFAULT false;
ALTER TABLE cache_clusters ADD COLUMN IF NOT EXISTS optimization_policy_locked boolean DEFAULT false;

-- ============================================================================
-- Part 3: Add optimization_freeze_until to remaining tables
-- ============================================================================

ALTER TABLE volumes ADD COLUMN IF NOT EXISTS optimization_freeze_until timestamptz;
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS optimization_freeze_until timestamptz;
ALTER TABLE load_balancers ADD COLUMN IF NOT EXISTS optimization_freeze_until timestamptz;
ALTER TABLE lambda_functions ADD COLUMN IF NOT EXISTS optimization_freeze_until timestamptz;
ALTER TABLE cache_clusters ADD COLUMN IF NOT EXISTS optimization_freeze_until timestamptz;
ALTER TABLE s3_buckets ADD COLUMN IF NOT EXISTS optimization_freeze_until timestamptz;
ALTER TABLE log_groups ADD COLUMN IF NOT EXISTS optimization_freeze_until timestamptz;
ALTER TABLE rds_instances ADD COLUMN IF NOT EXISTS optimization_freeze_until timestamptz;
ALTER TABLE elastic_ips ADD COLUMN IF NOT EXISTS optimization_freeze_until timestamptz;

-- ============================================================================
-- Part 4: Set locked=true for ALL existing production resources
-- Production resources always require approval (cannot be auto_safe)
-- ============================================================================

UPDATE instances SET optimization_policy_locked = true, optimization_policy = 'recommend_only' WHERE env = 'prod';
UPDATE autoscaling_groups SET optimization_policy_locked = true, optimization_policy = 'recommend_only' WHERE env = 'prod';
UPDATE rds_instances SET optimization_policy_locked = true, optimization_policy = 'recommend_only' WHERE env = 'prod';
UPDATE cache_clusters SET optimization_policy_locked = true, optimization_policy = 'recommend_only' WHERE env = 'prod';
UPDATE load_balancers SET optimization_policy_locked = true, optimization_policy = 'recommend_only' WHERE env = 'prod';
-- Note: S3, log groups, volumes, snapshots, EIPs don't have env column - they're always toggleable

-- ============================================================================
-- Part 5: Create trigger function to auto-lock production resources
-- This enforces that production resources cannot be set to auto_safe
-- ============================================================================

CREATE OR REPLACE FUNCTION lock_prod_optimization_policy()
RETURNS TRIGGER AS $$
BEGIN
  -- If resource is in production environment, enforce recommend_only
  IF NEW.env = 'prod' THEN
    NEW.optimization_policy_locked := true;
    NEW.optimization_policy := 'recommend_only';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all resource tables with env column
-- Drop existing triggers first to make migration idempotent
DROP TRIGGER IF EXISTS tr_instances_lock_prod ON instances;
DROP TRIGGER IF EXISTS tr_asg_lock_prod ON autoscaling_groups;
DROP TRIGGER IF EXISTS tr_rds_lock_prod ON rds_instances;
DROP TRIGGER IF EXISTS tr_cache_lock_prod ON cache_clusters;
DROP TRIGGER IF EXISTS tr_lb_lock_prod ON load_balancers;
DROP TRIGGER IF EXISTS tr_lambda_lock_prod ON lambda_functions;

CREATE TRIGGER tr_instances_lock_prod
  BEFORE INSERT OR UPDATE ON instances
  FOR EACH ROW EXECUTE FUNCTION lock_prod_optimization_policy();

CREATE TRIGGER tr_asg_lock_prod
  BEFORE INSERT OR UPDATE ON autoscaling_groups
  FOR EACH ROW EXECUTE FUNCTION lock_prod_optimization_policy();

CREATE TRIGGER tr_rds_lock_prod
  BEFORE INSERT OR UPDATE ON rds_instances
  FOR EACH ROW EXECUTE FUNCTION lock_prod_optimization_policy();

CREATE TRIGGER tr_cache_lock_prod
  BEFORE INSERT OR UPDATE ON cache_clusters
  FOR EACH ROW EXECUTE FUNCTION lock_prod_optimization_policy();

CREATE TRIGGER tr_lb_lock_prod
  BEFORE INSERT OR UPDATE ON load_balancers
  FOR EACH ROW EXECUTE FUNCTION lock_prod_optimization_policy();

CREATE TRIGGER tr_lambda_lock_prod
  BEFORE INSERT OR UPDATE ON lambda_functions
  FOR EACH ROW EXECUTE FUNCTION lock_prod_optimization_policy();

-- ============================================================================
-- Part 6: Indexes for efficient agent queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_volumes_opt ON volumes(optimization_policy, state);
CREATE INDEX IF NOT EXISTS idx_snapshots_opt ON snapshots(optimization_policy);
CREATE INDEX IF NOT EXISTS idx_lb_opt ON load_balancers(optimization_policy, env);
CREATE INDEX IF NOT EXISTS idx_lambda_opt ON lambda_functions(optimization_policy, env);
CREATE INDEX IF NOT EXISTS idx_cache_opt ON cache_clusters(optimization_policy, env);

-- Indexes for locked resources
CREATE INDEX IF NOT EXISTS idx_instances_locked ON instances(optimization_policy_locked, env);
CREATE INDEX IF NOT EXISTS idx_asg_locked ON autoscaling_groups(optimization_policy_locked, env);
CREATE INDEX IF NOT EXISTS idx_rds_locked ON rds_instances(optimization_policy_locked, env);
CREATE INDEX IF NOT EXISTS idx_cache_locked ON cache_clusters(optimization_policy_locked, env);
CREATE INDEX IF NOT EXISTS idx_lb_locked ON load_balancers(optimization_policy_locked, env);

-- Partial indexes for freeze checking
CREATE INDEX IF NOT EXISTS idx_volumes_freeze ON volumes(optimization_freeze_until)
WHERE optimization_freeze_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_snapshots_freeze ON snapshots(optimization_freeze_until)
WHERE optimization_freeze_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lb_freeze ON load_balancers(optimization_freeze_until)
WHERE optimization_freeze_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lambda_freeze ON lambda_functions(optimization_freeze_until)
WHERE optimization_freeze_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cache_freeze ON cache_clusters(optimization_freeze_until)
WHERE optimization_freeze_until IS NOT NULL;

-- ============================================================================
-- Part 7: Comments explaining usage
-- ============================================================================

COMMENT ON COLUMN volumes.optimization_policy IS 'Controls agent behavior: auto_safe=agent can optimize, recommend_only=needs approval, ignore=hands off';
COMMENT ON COLUMN snapshots.optimization_policy IS 'Controls agent behavior: auto_safe=agent can optimize, recommend_only=needs approval, ignore=hands off';
COMMENT ON COLUMN load_balancers.optimization_policy IS 'Controls agent behavior: auto_safe=agent can optimize, recommend_only=needs approval, ignore=hands off';
COMMENT ON COLUMN lambda_functions.optimization_policy IS 'Controls agent behavior: auto_safe=agent can optimize, recommend_only=needs approval, ignore=hands off';
COMMENT ON COLUMN cache_clusters.optimization_policy IS 'Controls agent behavior: auto_safe=agent can optimize, recommend_only=needs approval, ignore=hands off';

COMMENT ON COLUMN instances.optimization_policy_locked IS 'When true, policy is locked to recommend_only (production resources)';
COMMENT ON COLUMN autoscaling_groups.optimization_policy_locked IS 'When true, policy is locked to recommend_only (production resources)';
COMMENT ON COLUMN rds_instances.optimization_policy_locked IS 'When true, policy is locked to recommend_only (production resources)';
COMMENT ON COLUMN cache_clusters.optimization_policy_locked IS 'When true, policy is locked to recommend_only (production resources)';
COMMENT ON COLUMN load_balancers.optimization_policy_locked IS 'When true, policy is locked to recommend_only (production resources)';
