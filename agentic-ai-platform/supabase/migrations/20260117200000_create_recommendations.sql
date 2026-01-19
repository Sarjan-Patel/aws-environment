-- Create recommendations table for Mode 3 (Approval-Based) workflow
-- Stores optimization recommendations that require human approval

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Detection reference
  detection_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  scenario_name TEXT NOT NULL,

  -- Resource information
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  account_id TEXT,
  region TEXT,
  env TEXT,

  -- Recommendation details
  action TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  ai_explanation TEXT,

  -- Impact assessment
  impact_level TEXT CHECK (impact_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100) DEFAULT 80,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')) DEFAULT 'medium',

  -- Cost data
  current_monthly_cost NUMERIC(12,2),
  potential_savings NUMERIC(12,2),

  -- Additional context
  details JSONB DEFAULT '{}',

  -- Status workflow
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'snoozed', 'scheduled', 'executed', 'expired')) DEFAULT 'pending',

  -- Snooze/Schedule fields
  snoozed_until TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,

  -- User feedback
  rejection_reason TEXT,
  user_notes TEXT,

  -- Execution tracking
  executed_at TIMESTAMPTZ,
  execution_result JSONB,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'system',
  actioned_by TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_resource ON recommendations(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_scenario ON recommendations(scenario_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_created ON recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_snoozed ON recommendations(snoozed_until) WHERE status = 'snoozed';
CREATE INDEX IF NOT EXISTS idx_recommendations_scheduled ON recommendations(scheduled_for) WHERE status = 'scheduled';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_recommendations_updated_at
  BEFORE UPDATE ON recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_recommendations_updated_at();

-- Function to auto-expire snoozed recommendations
CREATE OR REPLACE FUNCTION check_snoozed_recommendations()
RETURNS void AS $$
BEGIN
  UPDATE recommendations
  SET status = 'pending', snoozed_until = NULL
  WHERE status = 'snoozed'
    AND snoozed_until IS NOT NULL
    AND snoozed_until <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations (since we're using anon key for demo)
CREATE POLICY "Allow all operations on recommendations" ON recommendations
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE recommendations IS 'Mode 3 approval-based optimization recommendations';
COMMENT ON COLUMN recommendations.detection_id IS 'Unique ID from the waste detection engine';
COMMENT ON COLUMN recommendations.impact_level IS 'low/medium/high/critical - determines UI prominence';
COMMENT ON COLUMN recommendations.snoozed_until IS 'Timestamp when recommendation should reappear if snoozed';
COMMENT ON COLUMN recommendations.scheduled_for IS 'Timestamp when action should be auto-executed if scheduled';
