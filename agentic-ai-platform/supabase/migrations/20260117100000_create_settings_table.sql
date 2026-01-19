-- Create settings table for storing application configuration
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Insert default execution settings
INSERT INTO settings (key, value)
VALUES (
    'execution_settings',
    '{"mode": "manual", "updated_at": "2026-01-17T00:00:00Z"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_settings_updated_at ON settings;

CREATE TRIGGER trigger_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();

-- Add comment
COMMENT ON TABLE settings IS 'Application-level settings and configuration';
COMMENT ON COLUMN settings.key IS 'Unique setting identifier';
COMMENT ON COLUMN settings.value IS 'JSON value containing the setting configuration';
