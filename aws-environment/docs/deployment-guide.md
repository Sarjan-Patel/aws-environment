# Drift-Tick Edge Function Deployment Guide

This guide documents the correct steps to deploy the `drift-tick` Edge Function to Supabase.

---

## Prerequisites

Before deploying, ensure you have:

1. **Supabase CLI installed**
   ```bash
   brew install supabase/tap/supabase
   ```

2. **Docker Desktop running**
   - The CLI uses Docker to bundle the Edge Function
   - Start Docker Desktop before deploying

3. **Logged into Supabase CLI**
   ```bash
   supabase login
   ```
   This opens a browser to authenticate with your Supabase account.

4. **Project linked** (already done for this repo)
   ```bash
   supabase link --project-ref vqcvrwkdvxzgucqcfcoq
   ```

---

## Deploy the Edge Function

### Step 1: Deploy with `--no-verify-jwt`

This is **critical** - without this flag, pg_cron cannot call the function:

```bash
cd /Users/sarjanpatel/Github\ Repositories/aws-environment
supabase functions deploy drift-tick --no-verify-jwt
```

**Why `--no-verify-jwt`?**
- By default, Supabase Edge Functions require a valid JWT in the `Authorization` header
- The `pg_net` extension (used by pg_cron) doesn't reliably pass headers
- `--no-verify-jwt` allows the function to be called without authentication at the gateway level
- The function URL is not publicly exposed, so this is safe for our use case

### Step 2: Verify Deployment

Check the Supabase Dashboard:
- Go to: https://supabase.com/dashboard/project/vqcvrwkdvxzgucqcfcoq/functions
- You should see `drift-tick` listed
- Click on it to see logs

---

## Test the Function

### Manual Test via cURL

```bash
curl -s -X POST "https://vqcvrwkdvxzgucqcfcoq.supabase.co/functions/v1/drift-tick" \
  -H "Content-Type: application/json" | jq .
```

**Expected response:**
```json
{
  "ok": true,
  "simulatedDate": "2026-01-20",
  "accountsProcessed": 1,
  "rowsAppended": {
    "metrics_daily": 25,
    "s3_bucket_usage_daily": 7,
    "log_group_usage_daily": 12,
    "data_transfer_daily": 3
  },
  "scenariosTriggered": [],
  "executionTimeMs": 5000
}
```

### Test via SQL (pg_net)

Run this in the Supabase SQL Editor to test the same path pg_cron will use:

```sql
SELECT net.http_post(
  url := 'https://vqcvrwkdvxzgucqcfcoq.supabase.co/functions/v1/drift-tick'::text,
  headers := jsonb_build_object('Content-Type', 'application/json'),
  body := jsonb_build_object('triggered_by', 'pg_cron')
);
```

Then check the Edge Function logs for a **200** status code.

---

## Set Up pg_cron Schedule

### Create the Cron Job

Run this in the Supabase SQL Editor:

```sql
SELECT cron.schedule(
  'drift-tick-simulator',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://vqcvrwkdvxzgucqcfcoq.supabase.co/functions/v1/drift-tick'::text,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('triggered_by', 'pg_cron')
  );
  $$
);
```

**Returns:** A job ID (e.g., `1`, `2`, etc.) confirming the job was created.

### Verify the Job Exists

```sql
SELECT * FROM cron.job;
```

### Check Execution History

```sql
SELECT
  jobid,
  runid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

### Unschedule a Job

If you need to stop the cron job:

```sql
-- By name
SELECT cron.unschedule('drift-tick-simulator');

-- Or by job ID
SELECT cron.unschedule(1);
```

---

## Apply Database Migrations

If you've added new migrations, push them to the database:

```bash
SUPABASE_DB_PASSWORD='your-password' supabase db push
```

Or run interactively:
```bash
supabase db push
# Enter password when prompted
```

Find your database password in:
**Supabase Dashboard → Project Settings → Database → Database password**

---

## Troubleshooting

### Error: "Cannot connect to Docker daemon"

**Solution:** Start Docker Desktop before deploying.

### Error: "401 Unauthorized" in Edge Function logs

**Cause:** Function was deployed without `--no-verify-jwt`.

**Solution:** Redeploy with the flag:
```bash
supabase functions deploy drift-tick --no-verify-jwt
```

### Error: "403 Forbidden" when deploying

**Cause:** Not logged into Supabase CLI.

**Solution:**
```bash
supabase login
```

### Cron job not running

1. Check the job exists:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'drift-tick-simulator';
   ```

2. Check the `active` column is `true`

3. Check execution history for errors:
   ```sql
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
   ```

### Edge Function logs show errors

Check logs in the Supabase Dashboard:
- Edge Functions → drift-tick → Logs
- Filter by ERROR level to see issues

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| Deploy function | `supabase functions deploy drift-tick --no-verify-jwt` |
| Test function | `curl -s -X POST "https://vqcvrwkdvxzgucqcfcoq.supabase.co/functions/v1/drift-tick" -H "Content-Type: application/json"` |
| Push migrations | `SUPABASE_DB_PASSWORD='...' supabase db push` |
| View cron jobs | `SELECT * FROM cron.job;` |
| View cron history | `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;` |
| Unschedule job | `SELECT cron.unschedule('drift-tick-simulator');` |
| Login to CLI | `supabase login` |
| Link project | `supabase link --project-ref vqcvrwkdvxzgucqcfcoq` |

---

## Summary

The key things to remember:

1. **Always use `--no-verify-jwt`** when deploying for pg_cron compatibility
2. **Docker must be running** before deployment
3. **Test via SQL** (`net.http_post`) to verify pg_cron path works
4. **Check Edge Function logs** for 200 status codes
