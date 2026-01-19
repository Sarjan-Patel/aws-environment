-- Add missing columns to log_groups and s3_buckets tables
-- These columns are required for the auto-safe optimization actions

-- Add retention_in_days to log_groups table
ALTER TABLE log_groups
ADD COLUMN IF NOT EXISTS retention_in_days INTEGER DEFAULT NULL;

-- Add lifecycle_rules to s3_buckets table (JSONB for storing rule configurations)
ALTER TABLE s3_buckets
ADD COLUMN IF NOT EXISTS lifecycle_rules JSONB DEFAULT NULL;

-- Verify the columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'log_groups' AND column_name = 'retention_in_days';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 's3_buckets' AND column_name = 'lifecycle_rules';
