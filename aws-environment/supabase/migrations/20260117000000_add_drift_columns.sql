-- Add live utilization columns for real-time agent monitoring
-- These columns are updated by drift-tick on each execution

-- Add live CPU and memory metrics to instances
ALTER TABLE instances
ADD COLUMN IF NOT EXISTS current_cpu numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_memory numeric(5,2) DEFAULT 0;

-- Add current utilization to autoscaling_groups
ALTER TABLE autoscaling_groups
ADD COLUMN IF NOT EXISTS current_utilization numeric(5,2) DEFAULT 0;

-- Add index for efficient live metric queries on running instances
CREATE INDEX IF NOT EXISTS idx_instances_current_metrics
ON instances(account_id, state)
WHERE state = 'running';

-- Comments explaining the columns
COMMENT ON COLUMN instances.current_cpu IS 'Live CPU utilization percentage (0-100), updated by drift-tick each execution';
COMMENT ON COLUMN instances.current_memory IS 'Live memory utilization percentage (0-100), updated by drift-tick each execution';
COMMENT ON COLUMN autoscaling_groups.current_utilization IS 'Average CPU utilization across all instances in the ASG (0-100)';
