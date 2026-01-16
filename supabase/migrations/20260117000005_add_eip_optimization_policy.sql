-- Add optimization_policy to elastic_ips table
-- This allows the agent to know if it can auto-release orphaned EIPs

ALTER TABLE elastic_ips
ADD COLUMN IF NOT EXISTS optimization_policy text DEFAULT 'auto_safe'
CHECK (optimization_policy IN ('auto_safe', 'recommend_only', 'ignore'));

-- Add tags column for additional metadata
ALTER TABLE elastic_ips
ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '{}';

-- Update hourly_cost comment
COMMENT ON COLUMN elastic_ips.hourly_cost IS 'Cost per hour - $0.005 when unassociated, $0 when associated';

-- Index for finding orphaned EIPs
CREATE INDEX IF NOT EXISTS idx_elastic_ips_orphaned
ON elastic_ips(state, optimization_policy)
WHERE state = 'unassociated';
