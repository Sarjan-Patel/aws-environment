-- Schedule drift-tick Edge Function to run every 5 minutes
-- This uses pg_cron and pg_net extensions

-- Enable required extensions (may already be enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Note: The actual cron schedule should be set up via Supabase Dashboard or CLI
-- because it requires access to project secrets (service role key).
--
-- To set up manually in the Supabase SQL Editor:
--
-- SELECT cron.schedule(
--   'drift-tick-simulator',
--   '*/5 * * * *',  -- Every 5 minutes
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/drift-tick',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--     ),
--     body := jsonb_build_object('triggered_by', 'pg_cron'),
--     timeout_milliseconds := 60000
--   ) AS request_id;
--   $$
-- );
--
-- Alternative: Use Supabase Vault for secrets (more secure):
--
-- First, add secrets to vault:
--   SELECT vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
--   SELECT vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');
--
-- Then schedule:
-- SELECT cron.schedule(
--   'drift-tick-simulator',
--   '*/5 * * * *',
--   $$
--   SELECT net.http_post(
--     url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
--            || '/functions/v1/drift-tick',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
--     ),
--     body := jsonb_build_object('triggered_by', 'pg_cron'),
--     timeout_milliseconds := 60000
--   ) AS request_id;
--   $$
-- );
--
-- To view scheduled jobs:
--   SELECT * FROM cron.job;
--
-- To unschedule:
--   SELECT cron.unschedule('drift-tick-simulator');

-- Create a helper function to manually trigger drift-tick (for testing)
CREATE OR REPLACE FUNCTION trigger_drift_tick()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result TEXT;
BEGIN
  -- This is a placeholder - actual implementation requires the function URL and key
  -- which should be stored in vault secrets
  result := 'To trigger drift-tick, call the Edge Function directly via HTTP POST to /functions/v1/drift-tick';
  RETURN result;
END;
$$;

COMMENT ON FUNCTION trigger_drift_tick() IS 'Helper function to document how to trigger drift-tick manually';
