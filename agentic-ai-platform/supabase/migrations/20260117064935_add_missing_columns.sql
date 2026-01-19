-- Add missing columns required for auto-safe optimization actions
-- retention_in_days: Used for log group retention optimization
-- lifecycle_rules: Used for S3 bucket lifecycle policy optimization

-- Add retention_in_days to log_groups table
ALTER TABLE log_groups
ADD COLUMN IF NOT EXISTS retention_in_days INTEGER DEFAULT NULL;

-- Add lifecycle_rules to s3_buckets table (JSONB for storing rule configurations)
ALTER TABLE s3_buckets
ADD COLUMN IF NOT EXISTS lifecycle_rules JSONB DEFAULT NULL;
