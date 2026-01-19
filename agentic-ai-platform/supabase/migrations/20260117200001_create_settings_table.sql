-- Create settings table for storing application configuration
-- This includes execution mode settings for Auto-Safe

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Insert default execution settings
INSERT INTO settings (key, value)
VALUES ('execution_settings', '{"mode": "manual", "updated_at": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE settings IS 'Application-wide settings and configuration';
COMMENT ON COLUMN settings.key IS 'Unique setting identifier';
COMMENT ON COLUMN settings.value IS 'JSON value containing the setting data';
