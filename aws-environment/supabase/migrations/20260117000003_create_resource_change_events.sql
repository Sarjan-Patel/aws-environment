-- Resource change events - audit log for all resource modifications
-- Tracks changes by drift engine, agent, or manual actions

CREATE TABLE IF NOT EXISTS resource_change_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES cloud_accounts(id) ON DELETE CASCADE,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  change_source text NOT NULL CHECK (change_source IN ('drift_engine', 'agent', 'manual')),
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_resource_change_events_account ON resource_change_events(account_id);
CREATE INDEX IF NOT EXISTS idx_resource_change_events_resource ON resource_change_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_change_events_time ON resource_change_events(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_change_events_source ON resource_change_events(change_source);

-- Enable RLS
ALTER TABLE resource_change_events ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE resource_change_events IS 'Audit log of all resource changes by drift engine, agent, or manual actions';
COMMENT ON COLUMN resource_change_events.resource_type IS 'Type of resource: instance, autoscaling_group, s3_bucket, log_group, etc.';
COMMENT ON COLUMN resource_change_events.resource_id IS 'The resource identifier (instance_id, ASG name, bucket name, etc.)';
COMMENT ON COLUMN resource_change_events.change_source IS 'Who made the change: drift_engine, agent, or manual';
COMMENT ON COLUMN resource_change_events.field_name IS 'Name of the field that changed (e.g., desired_capacity, state, lifecycle_policy)';
