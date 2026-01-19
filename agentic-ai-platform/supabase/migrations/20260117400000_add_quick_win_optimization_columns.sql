-- Quick-Win Optimization Columns Migration
-- Adds columns required for Phase 2 quick-win optimizations:
-- 1. multi_az on rds_instances for Multi-AZ detection
-- 2. target_count, healthy_target_count on load_balancers for empty LB detection
-- 3. versioning_enabled on s3_buckets for version expiration detection

-- Add multi_az column to rds_instances
-- Used to detect Multi-AZ enabled on non-production RDS instances
ALTER TABLE rds_instances
ADD COLUMN IF NOT EXISTS multi_az BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN rds_instances.multi_az IS 'Whether Multi-AZ deployment is enabled. True = high availability with standby replica.';

-- Add target_count and healthy_target_count columns to load_balancers
-- Used to detect empty load balancers with no registered targets
ALTER TABLE load_balancers
ADD COLUMN IF NOT EXISTS target_count INTEGER DEFAULT 0;

ALTER TABLE load_balancers
ADD COLUMN IF NOT EXISTS healthy_target_count INTEGER DEFAULT 0;

COMMENT ON COLUMN load_balancers.target_count IS 'Total number of targets registered with this load balancer';
COMMENT ON COLUMN load_balancers.healthy_target_count IS 'Number of targets currently in healthy state';

-- Add versioning_enabled column to s3_buckets
-- Used to detect versioned buckets without noncurrent version expiration
ALTER TABLE s3_buckets
ADD COLUMN IF NOT EXISTS versioning_enabled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN s3_buckets.versioning_enabled IS 'Whether versioning is enabled on this bucket. True = object versions are preserved.';

-- Create index for efficient filtering on new columns
CREATE INDEX IF NOT EXISTS idx_rds_instances_multi_az ON rds_instances(multi_az) WHERE multi_az = TRUE;
CREATE INDEX IF NOT EXISTS idx_load_balancers_target_count ON load_balancers(target_count) WHERE target_count = 0;
CREATE INDEX IF NOT EXISTS idx_s3_buckets_versioning ON s3_buckets(versioning_enabled) WHERE versioning_enabled = TRUE;
