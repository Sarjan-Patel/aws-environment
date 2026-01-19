-- Add utilization metrics columns for waste detection
-- These columns enable the agent to detect over-provisioned and idle resources

-- ============================================================================
-- Lambda Functions: Memory usage for over-provisioning detection
-- ============================================================================

-- Average memory actually used over 7 days (for comparing to allocated memory)
ALTER TABLE lambda_functions ADD COLUMN IF NOT EXISTS avg_memory_used_mb_7d numeric(10,2);

-- Environment column (some Lambda tables may not have it)
ALTER TABLE lambda_functions ADD COLUMN IF NOT EXISTS env text DEFAULT 'dev';

COMMENT ON COLUMN lambda_functions.avg_memory_used_mb_7d IS 'Average memory actually used in MB over 7 days. Compare to memory_mb for over-provisioning detection.';

-- ============================================================================
-- RDS Instances: Current metrics for real-time monitoring
-- ============================================================================

-- Current CPU utilization (for Mode 1 monitoring dashboard)
ALTER TABLE rds_instances ADD COLUMN IF NOT EXISTS current_cpu numeric(5,2);

-- Current active connections (for Mode 1 monitoring dashboard)
ALTER TABLE rds_instances ADD COLUMN IF NOT EXISTS current_connections int;

COMMENT ON COLUMN rds_instances.current_cpu IS 'Current CPU utilization percentage (updated by drift-tick)';
COMMENT ON COLUMN rds_instances.current_connections IS 'Current number of active database connections';

-- ============================================================================
-- Cache Clusters: Current metrics for real-time monitoring
-- ============================================================================

-- Current CPU utilization
ALTER TABLE cache_clusters ADD COLUMN IF NOT EXISTS current_cpu numeric(5,2);

-- Current active connections
ALTER TABLE cache_clusters ADD COLUMN IF NOT EXISTS current_connections int;

-- Add avg_connections_7d if missing (needed for idle detection)
ALTER TABLE cache_clusters ADD COLUMN IF NOT EXISTS avg_connections_7d numeric(10,2) DEFAULT 0;

COMMENT ON COLUMN cache_clusters.current_cpu IS 'Current CPU utilization percentage (updated by drift-tick)';
COMMENT ON COLUMN cache_clusters.current_connections IS 'Current number of active connections';

-- ============================================================================
-- Load Balancers: Current request rate for real-time monitoring
-- ============================================================================

-- Current request rate (requests per minute)
ALTER TABLE load_balancers ADD COLUMN IF NOT EXISTS current_request_rate numeric(12,2);

COMMENT ON COLUMN load_balancers.current_request_rate IS 'Current request rate (requests per minute)';

-- ============================================================================
-- Autoscaling Groups: Current utilization tracking
-- ============================================================================

-- Current utilization (already exists in some schemas, ensure it's there)
ALTER TABLE autoscaling_groups ADD COLUMN IF NOT EXISTS current_utilization numeric(5,2);

-- Tags column for metadata (days_old, pr_status, etc.)
ALTER TABLE autoscaling_groups ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '{}';

COMMENT ON COLUMN autoscaling_groups.current_utilization IS 'Current average CPU utilization across instances in the ASG';

-- ============================================================================
-- Instances: Ensure current metrics columns exist
-- ============================================================================

-- These may already exist but ensure they're there
ALTER TABLE instances ADD COLUMN IF NOT EXISTS current_cpu numeric(5,2);
ALTER TABLE instances ADD COLUMN IF NOT EXISTS current_memory numeric(5,2);

-- ============================================================================
-- S3 Buckets: Add versioning_enabled if missing
-- ============================================================================

ALTER TABLE s3_buckets ADD COLUMN IF NOT EXISTS versioning_enabled boolean DEFAULT false;

-- ============================================================================
-- Log Groups: Add tags column if missing
-- ============================================================================

ALTER TABLE log_groups ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '{}';
