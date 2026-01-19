-- Create action_audit_log table for tracking executed optimization actions
-- This table stores the history of all actions executed by the Auto-Safe agent

CREATE TABLE IF NOT EXISTS action_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Action details
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  detection_id TEXT NOT NULL,

  -- Execution result
  success BOOLEAN NOT NULL DEFAULT false,
  message TEXT,

  -- State tracking
  previous_state JSONB,
  new_state JSONB,

  -- Timing
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INTEGER,

  -- Attribution
  executed_by TEXT NOT NULL DEFAULT 'auto-safe-agent',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_action_audit_log_executed_at
  ON action_audit_log(executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_action_audit_log_success
  ON action_audit_log(success);

CREATE INDEX IF NOT EXISTS idx_action_audit_log_scenario
  ON action_audit_log(scenario_id);

CREATE INDEX IF NOT EXISTS idx_action_audit_log_resource
  ON action_audit_log(resource_type, resource_id);

-- Add comment
COMMENT ON TABLE action_audit_log IS 'Audit log of all optimization actions executed by the Auto-Safe agent';
