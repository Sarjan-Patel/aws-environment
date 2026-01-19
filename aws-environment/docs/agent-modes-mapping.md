# Agent Modes ↔ Drift Engine Mapping

This document maps the three AgentDKI operating modes to the waste scenarios created by drift-tick.

---

## Mode 1 — Continuous Passive Monitoring (24/7)

The agent monitors and reports issues without taking action.

### What Mode 1 Monitors

| Metric | Database Source | Drift-Tick Provides |
|--------|-----------------|---------------------|
| CPU | `instances.current_cpu` | ✅ Updated every tick with realistic patterns |
| Memory | `instances.current_memory` | ✅ Updated every tick |
| Load / Queue depth | `metrics_daily.metric_payload` | ✅ Stored in JSON payload |
| Pod counts | `autoscaling_groups.desired_capacity` | ✅ Tracked, sometimes over-provisioned |
| Network transfer | `data_transfer_daily` | ✅ Cross-region, egress, cross-AZ records |
| Storage growth | `s3_bucket_usage_daily` | ✅ Daily growth 1-3% prod, 0.3-1.5% non-prod |
| Log ingestion | `log_group_usage_daily` | ✅ Daily ingest 0.5-3 GB prod, 0.1-0.8 GB non-prod |

### Mode 1 Output Examples (Agent Should Detect)

| Detection | How Drift-Tick Creates It | Query to Find |
|-----------|---------------------------|---------------|
| "X is likely idle" | Preview instances with 2-15% CPU | `SELECT * FROM instances WHERE current_cpu < 15 AND env = 'preview'` |
| "Y is over-provisioned" | ASGs with increased desired_capacity | `SELECT * FROM autoscaling_groups WHERE desired_capacity > min_size + 2` |
| "Z is leaking storage" | S3 buckets without lifecycle | `SELECT * FROM s3_buckets WHERE lifecycle_policy IS NULL` |
| "Logs accumulating" | Log groups without retention | `SELECT * FROM log_groups WHERE retention_days IS NULL` |

---

## Mode 2 — Live Optimization Actions (Safe Auto-Act)

The agent can automatically optimize these categories without human approval.

### Category Coverage

#### a) Non-prod workloads

| Workload Type | Drift-Tick Creates | `env` Value | `optimization_policy` |
|---------------|-------------------|-------------|----------------------|
| Dev instances | ✅ Off-hours dev instances | `dev` | `auto_safe` |
| Staging | ✅ Part of seed data | `staging` | `auto_safe` |
| Preview environments | ✅ Forgotten preview envs (8%) | `preview` | `auto_safe` |
| CI runners | ✅ Idle CI runners (6%) | `ci` | `auto_safe` |
| Feature environments | ✅ Stale feature envs (4%) | `feature` | `auto_safe` |

#### b) Idle compute (0% CPU for N minutes)

| Scenario | Drift-Tick Creates | CPU Range | Tags |
|----------|-------------------|-----------|------|
| Idle CI runners | ✅ 6% probability | 0-3% | `job_status: 'completed'` |
| Forgotten previews | ✅ CPU drops over time | 2-15% | `created_by: 'drift_engine'` |
| Stale feature envs | ✅ Very low usage | 1-8% | `days_old: '10-30'` |

#### c) Scheduled off-hours

| Scenario | Drift-Tick Creates | When | Tags |
|----------|-------------------|------|------|
| Dev workstations on weekends | ✅ 10% on weekends | Saturdays/Sundays | `schedule: 'weekdays_only'`, `running_off_hours: 'true'` |

#### d) Low access storage tiering

| Scenario | Drift-Tick Creates | What's Wasteful |
|----------|-------------------|-----------------|
| S3 without lifecycle | ✅ 5% probability | 100-500 GB stuck in Standard tier |
| Log without retention | ✅ 5% probability | 50-200 GB accumulated, never expires |

### SQL Queries for Mode 2 Targets

```sql
-- Find all resources the agent can auto-optimize
SELECT
  'instance' as resource_type,
  instance_id as resource_id,
  name,
  env,
  current_cpu,
  optimization_policy,
  tags
FROM instances
WHERE optimization_policy = 'auto_safe'
  AND state = 'running'
  AND (
    current_cpu < 10  -- Idle
    OR env IN ('ci', 'preview', 'feature')  -- Non-prod
    OR tags->>'running_off_hours' = 'true'  -- Off-hours
  )
ORDER BY current_cpu ASC;

-- Find S3 buckets needing lifecycle
SELECT
  name,
  env,
  lifecycle_policy,
  optimization_policy
FROM s3_buckets
WHERE lifecycle_policy IS NULL
  AND optimization_policy = 'auto_safe';

-- Find log groups needing retention
SELECT
  name,
  env,
  retention_days,
  optimization_policy
FROM log_groups
WHERE retention_days IS NULL
  AND optimization_policy = 'auto_safe';
```

---

## Mode 3 — Approval-Based Optimization (Human in Loop)

The agent recommends but requires human approval.

### What Requires Approval

| Action | Drift-Tick Creates Target? | `optimization_policy` |
|--------|---------------------------|----------------------|
| Prod autoscaling down | ✅ Prod ASGs exist with cost drift | `recommend_only` |
| RDS/RMQ/Cassandra downsizing | ✅ RDS instances in seed data | `recommend_only` |
| Network topology changes | ⚠️ Not directly simulated | N/A |
| Region migration | ⚠️ Not directly simulated | N/A |
| Reserved instance commitments | ⚠️ Requires cost analysis | N/A |
| Savings plan purchase | ⚠️ Requires cost analysis | N/A |

### How Drift-Tick Supports Mode 3

**Production ASGs:**
- Seed data includes prod ASGs with `optimization_policy: 'recommend_only'`
- Drift-tick evolves their costs over time
- Agent can analyze and recommend: "Reduce ASG-web-prod from 8 → 6 (avg CPU 35%)"

**RDS Instances:**
- Seed data includes RDS instances
- Drift-tick creates daily cost metrics
- Agent can recommend: "Downsize rds-primary from db.r5.xlarge to db.r5.large"

### SQL Queries for Mode 3 Targets

```sql
-- Find prod ASGs that might be over-provisioned
SELECT
  asg.name,
  asg.desired_capacity,
  asg.current_utilization,
  asg.optimization_policy,
  COUNT(i.id) as instance_count,
  AVG(i.current_cpu) as avg_cpu
FROM autoscaling_groups asg
LEFT JOIN instances i ON i.autoscaling_group_id = asg.id
WHERE asg.env = 'prod'
  AND asg.optimization_policy = 'recommend_only'
GROUP BY asg.id
HAVING AVG(i.current_cpu) < 50;  -- Potentially over-provisioned

-- Find RDS instances with low utilization (from metrics)
SELECT
  rds.name,
  rds.instance_class,
  rds.optimization_policy,
  md.estimated_daily_cost
FROM rds_instances rds
JOIN metrics_daily md ON md.resource_id = rds.name AND md.resource_type = 'rds'
WHERE rds.optimization_policy = 'recommend_only'
ORDER BY md.date DESC
LIMIT 10;
```

---

## Waste Scenario Probability Summary

| Scenario | Probability | Mode | Agent Action |
|----------|-------------|------|--------------|
| Forgotten preview environment | 8% per tick | Mode 2 | Auto-terminate |
| Over-provisioned ASG (non-prod) | 8% per tick | Mode 2 | Auto-scale down |
| Idle CI runner | 6% per tick | Mode 2 | Auto-terminate |
| S3 bucket without lifecycle | 5% per tick | Mode 2 | Auto-add policy |
| Log group without retention | 5% per tick | Mode 2 | Auto-set retention |
| Stale feature environment | 4% per tick | Mode 2 | Auto-cleanup |
| Off-hours dev instance | 10% on weekends | Mode 2 | Auto-stop/schedule |
| Cost drift on prod resources | 100% (always) | Mode 1/3 | Monitor & recommend |

---

## Coverage Gaps & Recommendations

### Currently Well-Covered

✅ Mode 1 (Monitoring) - Full coverage of all metrics
✅ Mode 2 (Safe Auto-Act) - All categories have waste scenarios

### Potential Enhancements for Mode 3

The following could be added to create more Mode 3 scenarios:

1. **Prod ASG with low utilization**: Create a scenario where prod ASG has consistently low CPU (30-40%) suggesting downsizing opportunity

2. **RDS instance oversized**: Create scenario where RDS has low query volume suggesting smaller instance class

3. **Reserved Instance opportunity**: After N days of consistent usage, flag as RI candidate

4. **Cross-region redundancy**: Flag resources that could be consolidated to fewer regions

---

## Agent Decision Tree

```
Resource Detected
      │
      ▼
┌─────────────────────────────────────────────────────┐
│ Check optimization_policy                            │
└─────────────────────────────────────────────────────┘
      │
      ├── 'ignore' ──────────────────────────► Skip (business override)
      │
      ├── 'auto_safe' ───────────────────────► Mode 2: Check if safe category
      │                                              │
      │                                              ├── env IN (dev, staging, preview, ci, feature)
      │                                              ├── current_cpu < 10% for N minutes
      │                                              ├── schedule says off-hours
      │                                              ├── lifecycle_policy IS NULL
      │                                              └── retention_days IS NULL
      │                                              │
      │                                              ▼
      │                                         Auto-optimize ✓
      │
      └── 'recommend_only' ──────────────────► Mode 3: Generate recommendation
                                                     │
                                                     ▼
                                                User sees:
                                                "Recommend reducing X. Approve?"
                                                     │
                                                     ├── ✓ Approve once
                                                     ├── ✓ Schedule
                                                     ├── ✓ Snooze
                                                     ├── ✓ Reject
                                                     └── ✓ Auto-approve similar
```

---

## How to Verify Waste Exists

Run these queries to confirm drift-tick is creating waste:

```sql
-- Count resources by optimization_policy and env
SELECT
  optimization_policy,
  env,
  COUNT(*) as count
FROM instances
WHERE state = 'running'
GROUP BY optimization_policy, env
ORDER BY optimization_policy, env;

-- Count idle instances (Mode 2 targets)
SELECT COUNT(*) as idle_instances
FROM instances
WHERE current_cpu < 10
  AND state = 'running'
  AND optimization_policy = 'auto_safe';

-- Count S3 buckets needing optimization
SELECT COUNT(*) as unoptimized_buckets
FROM s3_buckets
WHERE lifecycle_policy IS NULL;

-- Count log groups needing optimization
SELECT COUNT(*) as unoptimized_log_groups
FROM log_groups
WHERE retention_days IS NULL;

-- Recent waste scenarios created
SELECT
  resource_type,
  field_name,
  new_value,
  changed_at
FROM resource_change_events
WHERE change_source = 'drift_engine'
ORDER BY changed_at DESC
LIMIT 20;
```
