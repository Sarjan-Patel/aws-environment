-- Migration: Create action_audit_log table for Phase 6 Auto-Safe
-- This table tracks all optimization actions executed by the agentic AI platform

CREATE TABLE IF NOT EXISTS action_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Action details
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    resource_name TEXT NOT NULL,
    scenario_id TEXT NOT NULL,
    detection_id TEXT NOT NULL,

    -- Result
    success BOOLEAN NOT NULL DEFAULT false,
    message TEXT,

    -- State tracking for potential rollback
    previous_state JSONB,
    new_state JSONB,

    -- Metadata
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INTEGER,
    executed_by TEXT NOT NULL DEFAULT 'auto-safe-agent',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying recent actions
CREATE INDEX IF NOT EXISTS idx_audit_log_executed_at ON action_audit_log(executed_at DESC);

-- Index for querying by resource
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON action_audit_log(resource_type, resource_id);

-- Index for querying by scenario
CREATE INDEX IF NOT EXISTS idx_audit_log_scenario ON action_audit_log(scenario_id);

-- Index for querying by success status
CREATE INDEX IF NOT EXISTS idx_audit_log_success ON action_audit_log(success);

-- Add comment
COMMENT ON TABLE action_audit_log IS 'Audit log for all optimization actions executed by the agentic AI platform';

-- Enable RLS
ALTER TABLE action_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read the audit log
CREATE POLICY "Allow read access to audit log" ON action_audit_log
    FOR SELECT
    USING (true);

-- Allow service role to insert audit entries
CREATE POLICY "Allow insert for service role" ON action_audit_log
    FOR INSERT
    WITH CHECK (true);
