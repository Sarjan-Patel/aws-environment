# drift-tick Edge Function Data Model

## Overview

The `drift-tick` Supabase Edge Function is a "world simulator" that makes the simulated AWS environment evolve realistically. Each execution simulates **one virtual day** of cloud activity for every cloud account.

**Location:** `supabase/functions/drift-tick/index.ts`

**Execution:** Scheduled via pg_cron every 5-10 minutes

## Core Responsibilities

1. Append historical data to daily metrics tables (never modify past rows)
2. Update live utilization fields on resources
3. Introduce realistic "startup mess" waste scenarios
4. Respect current world state (including agent modifications)

---

## Tables: Daily Metrics (Append-Only)

These tables receive new rows for each simulated day. Historical data is never modified.

### `metrics_daily`

Stores daily instance performance and cost metrics.

| Column | Type | Description |
|--------|------|-------------|
| `account_id` | uuid | Cloud account reference |
| `resource_type` | text | Always `'instances'` for this function |
| `resource_id` | text | AWS instance ID (e.g., `i-0abc123...`) |
| `date` | date | Simulated date |
| `metric_payload` | jsonb | `{ cpu_avg, memory_avg, instance_type, env }` |
| `estimated_daily_cost` | numeric | Calculated daily cost with random walk |

**Conflict handling:** Upsert on `(resource_type, resource_id, date)`

**Cost calculation:**
- Base: previous day's cost or `hourly_cost * 24`
- Random walk: -3% to +5% daily
- Prod bias: extra +2% growth
- Weekend reduction: 70-85% for non-prod

---

### `s3_bucket_usage_daily`

Tracks S3 storage across tiers and request costs.

| Column | Type | Description |
|--------|------|-------------|
| `bucket_id` | uuid | S3 bucket reference |
| `date` | date | Simulated date |
| `storage_gb_standard` | numeric | GB in Standard tier |
| `storage_gb_ia` | numeric | GB in Infrequent Access tier |
| `storage_gb_glacier` | numeric | GB in Glacier tier |
| `requests_count` | integer | API request count (100-100,000) |
| `estimated_storage_cost` | numeric | Daily storage cost |
| `estimated_request_cost` | numeric | Daily request cost |

**Conflict handling:** Upsert on `(bucket_id, date)`

**Growth simulation:**
- Prod buckets: 1-3% daily growth
- Non-prod: 0.3-1.5% daily growth
- Lifecycle transitions: 0.5% Standard → IA, 0.3% IA → Glacier

---

### `log_group_usage_daily`

Tracks CloudWatch Logs ingestion and storage.

| Column | Type | Description |
|--------|------|-------------|
| `log_group_id` | uuid | Log group reference |
| `date` | date | Simulated date |
| `ingested_gb` | numeric | GB ingested that day |
| `stored_gb` | numeric | Total GB stored |
| `estimated_ingestion_cost` | numeric | Daily ingestion cost ($0.50/GB) |
| `estimated_storage_cost` | numeric | Daily storage cost ($0.03/GB/month) |

**Conflict handling:** Upsert on `(log_group_id, date)`

**Ingestion rates:**
- Prod: 0.5-3 GB/day
- Non-prod: 0.1-0.8 GB/day
- Weekend reduction: 70% for non-preview

**Retention caps:** Storage capped based on retention_days setting

---

### `data_transfer_daily`

Records network transfer between regions and to internet.

| Column | Type | Description |
|--------|------|-------------|
| `account_id` | uuid | Cloud account reference |
| `date` | date | Simulated date |
| `source_region` | text | Origin region |
| `dest_region` | text | Destination region or `'internet'` |
| `direction` | text | `'cross-region'`, `'egress'`, or `'cross-az'` |
| `gb_transferred` | numeric | Transfer volume |
| `estimated_transfer_cost` | numeric | Calculated cost |

**Fixed records per day:**
- Cross-region (us-east-1 → us-west-2): 5-50 GB @ $0.02/GB
- Egress (us-east-1 → internet): 20-200 GB @ $0.09/GB
- Cross-AZ (within us-east-1): 100-500 GB @ $0.01/GB

---

## Tables: Live Resource Updates (In-Place)

These tables have fields updated in-place to reflect current utilization.

### `instances`

| Column Updated | Type | Description |
|----------------|------|-------------|
| `current_cpu` | numeric(5,2) | Current CPU utilization % |
| `current_memory` | numeric(5,2) | Current memory utilization % |
| `updated_at` | timestamp | Last update time |

**Utilization by environment:**
| Environment | CPU Range | Memory Range |
|-------------|-----------|--------------|
| prod | 40-70% | 50-80% |
| preview | 2-15% | 10-30% |
| dev/staging (weekday) | 15-45% | 20-50% |
| dev/staging (weekend) | 1-10% | 5-20% |

---

### `autoscaling_groups`

| Column Updated | Type | Description |
|----------------|------|-------------|
| `current_utilization` | numeric(5,2) | Current utilization % (30-70%) |
| `updated_at` | timestamp | Last update time |

---

### `elastic_ips`

Updated when simulating EIP orphaning after instance termination.

| Column Updated | Type | Description |
|----------------|------|-------------|
| `associated_instance_id` | uuid | Set to `null` when orphaned |
| `state` | text | Changed to `'unassociated'` |
| `hourly_cost` | numeric | Set to $0.005 (AWS charges for unattached EIPs) |
| `tags` | jsonb | Updated with orphan metadata |

---

## Tables: Waste Scenario Creation

The function randomly creates new resources to simulate realistic cloud waste.

### Instance-Based Waste

#### `instances` - Idle CI Runners
**Probability:** 6%

| Field | Value |
|-------|-------|
| `env` | `'ci'` |
| `current_cpu` | 0-3% (idle) |
| `optimization_policy` | `'auto_safe'` |
| `tags.purpose` | `'ci_runner'` |
| `tags.job_status` | `'completed'` |

#### `instances` - Off-Hours Dev Workstations
**Probability:** 10% (weekends only)

| Field | Value |
|-------|-------|
| `env` | `'dev'` |
| `current_cpu` | 0-5% (idle on weekend) |
| `optimization_policy` | `'auto_safe'` |
| `tags.schedule` | `'weekdays_only'` |
| `tags.running_off_hours` | `'true'` |

---

### ASG-Based Waste

#### `autoscaling_groups` + `instances` - Forgotten Preview Environments
**Probability:** 8%

Creates a complete preview environment:
- 1 ASG with 4-8 instances
- Each instance starts with 40-80% CPU (initially busy)
- 1 associated log group

#### `autoscaling_groups` - Over-Provisioned ASGs
**Probability:** 8%

Increases `desired_capacity` by 1-2 on existing non-prod ASGs.

#### `autoscaling_groups` + `instances` - Stale Feature Environments
**Probability:** 4%

| Field | Value |
|-------|-------|
| `env` | `'feature'` |
| `tags.days_old` | 10-30 days |
| `tags.pr_status` | `'merged'`, `'closed'`, or `'stale'` |
| `current_cpu` | 1-8% (unused) |

---

### Storage Waste

#### `s3_buckets` - Unoptimized Buckets
**Probability:** 5%

| Field | Value |
|-------|-------|
| `lifecycle_policy` | `null` (no tiering) |
| `optimization_policy` | `'auto_safe'` |
| `tags.needs_lifecycle` | `'true'` |

Initial storage: 100-500 GB all in Standard tier.

#### `volumes` - Unattached EBS Volumes
**Probability:** 6%

| Field | Value |
|-------|-------|
| `state` | `'available'` |
| `attached_instance_id` | `null` |
| `size_gib` | 50, 100, 200, 500, or 1000 |
| `monthly_cost` | ~$0.08/GB |

#### `snapshots` - Old Snapshots
**Probability:** 5%

| Field | Value |
|-------|-------|
| `source_volume_id` | `null` (source deleted) |
| `retention_policy` | `null` (no cleanup) |
| `tags.days_old` | 60-365 days |
| `monthly_cost` | ~$0.05/GB |

---

### Logging Waste

#### `log_groups` - No Retention Policy
**Probability:** 5%

| Field | Value |
|-------|-------|
| `retention_days` | `null` (never expires) |
| `optimization_policy` | `'auto_safe'` |
| `tags.needs_retention` | `'true'` |

Initial accumulated storage: 50-200 GB.

---

### Networking Waste

#### `elastic_ips` - Orphaned EIPs
**Probability:** 5% (new) + 4% (orphan existing)

| Field | Value |
|-------|-------|
| `state` | `'unassociated'` |
| `associated_instance_id` | `null` |
| `hourly_cost` | $0.005 |
| `tags.waste_type` | `'orphaned_eip'` |

#### `load_balancers` - Idle ALBs/NLBs
**Probability:** 4%

| Field | Value |
|-------|-------|
| `env` | dev, staging, preview, or feature |
| `avg_request_count_7d` | 0-100 (nearly zero traffic) |
| `hourly_cost` | ~$0.0225 (~$16/month) |

---

### Database Waste

#### `rds_instances` - Idle RDS
**Probability:** 4%

| Field | Value |
|-------|-------|
| `env` | dev, staging, or preview |
| `avg_cpu_7d` | 2-15% |
| `avg_connections_7d` | 1-10 |
| `instance_class` | db.r5.large, db.r5.xlarge, db.m5.large, db.m5.xlarge |

#### `cache_clusters` - Idle Redis
**Probability:** 3%

| Field | Value |
|-------|-------|
| `env` | dev, staging, or preview |
| `avg_cpu_7d` | 1-10% |
| `avg_connections_7d` | 0-5 |

---

### Compute Waste

#### `lambda_functions` - Over-Provisioned
**Probability:** 5%

| Field | Value |
|-------|-------|
| `memory_mb` | 1024, 2048, or 3008 (way more than needed) |
| Actual usage | ~128-256 MB |

---

## Audit Table

### `resource_change_events`

All drift changes are logged for auditability.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `account_id` | uuid | Cloud account reference |
| `resource_type` | text | Type of resource changed |
| `resource_id` | uuid | Reference to the resource |
| `change_source` | text | Always `'drift_engine'` |
| `field_name` | text | Field that changed (or `'created'`) |
| `old_value` | text | Previous value (null for creates) |
| `new_value` | text | New value or description |
| `created_at` | timestamp | When the change occurred |

---

## Pricing Constants

```typescript
const PRICING = {
  S3_STANDARD_PER_GB: 0.023 / 30,      // Daily rate
  S3_IA_PER_GB: 0.0125 / 30,
  S3_GLACIER_PER_GB: 0.004 / 30,
  LOG_INGEST_PER_GB: 0.50,
  LOG_STORAGE_PER_GB: 0.03 / 30,
  DATA_TRANSFER_CROSS_REGION: 0.02,
  DATA_TRANSFER_EGRESS: 0.09,
}

const INSTANCE_COSTS = {
  't3.micro': 0.0104,
  't3.small': 0.0208,
  't3.medium': 0.0416,
  'm5.large': 0.096,
  'm5.xlarge': 0.192,
  'm5.2xlarge': 0.384,
  'c5.large': 0.085,
  'c5.xlarge': 0.17,
  'r5.large': 0.126,
  'r5.xlarge': 0.252,
}
```

---

## Response Schema

```json
{
  "ok": true,
  "simulatedDate": "2024-01-15",
  "accountsProcessed": 2,
  "rowsAppended": {
    "metrics_daily": 45,
    "s3_bucket_usage_daily": 12,
    "log_group_usage_daily": 8,
    "data_transfer_daily": 6
  },
  "scenariosTriggered": [
    "Created preview environment preview-1705312800 with 6 instances",
    "Created idle CI runner ci-runner-1705312801 with 0-3% CPU (auto_safe)"
  ],
  "executionTimeMs": 1234
}
```
