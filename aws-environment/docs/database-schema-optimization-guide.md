# Database Schema & Cost Optimization Guide

This document provides a comprehensive overview of all database tables in the AWS Environment Simulation, their purpose, waste patterns, and manual optimization workflows.

## Table of Contents

- [Overview](#overview)
- [Core Structure](#core-structure)
- [Compute Resources](#compute-resources)
- [Container Orchestration](#container-orchestration)
- [Storage Resources](#storage-resources)
- [Database Services](#database-services)
- [Networking Resources](#networking-resources)
- [Observability & Logging](#observability--logging)
- [Commitments & Cost Tracking](#commitments--cost-tracking)
- [Governance & Metadata](#governance--metadata)
- [Quick Wins Summary](#quick-wins-summary)

---

## Overview

The database models a complete AWS-like cloud environment with 27 tables covering compute, storage, networking, databases, containers, and observability. Each resource type has associated costs and common waste patterns that the AI agent monitors and optimizes.

### Cost Accumulation Model

```
Resource Created → hourly_cost/monthly_cost assigned
        ↓
drift-tick runs every ~5 minutes (simulates 1 virtual day)
        ↓
Updates: current_cpu, current_memory, *_daily tables
        ↓
AI Agent queries for waste patterns
        ↓
Agent takes action OR creates recommendation
        ↓
resource_change_events logs the change
```

---

## Core Structure

### `cloud_accounts`

**What it is:** Top-level organization unit that owns all resources.

**AWS Equivalent:** AWS Account

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | text | Account name |
| `provider` | text | Cloud provider (default: 'aws-fake') |
| `freeze_optimizations_until` | timestamptz | Pause all agent actions until this time |
| `created_at` | timestamptz | Creation timestamp |

**Optimization:** Not directly optimizable - this is the parent container for all resources.

---

### `api_clients`

**What it is:** Stores API keys for programmatic access to the cloud account.

**AWS Equivalent:** IAM Access Keys

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `name` | text | Client name |
| `access_key_id` | text | Unique access key |
| `secret_key_hash` | text | Hashed secret |
| `scopes` | JSONB | Permissions (default: ["read:*"]) |
| `last_used_at` | timestamptz | Last API call timestamp |

**Optimization concern:** Not a cost item, but security concern - unused keys should be rotated/deleted.

**Manual process:**
```
1. Go to IAM Console → Users → Security Credentials
2. Check "Last used" column
3. Delete keys not used in 90+ days
```

---

## Compute Resources

### `instances`

**What it is:** Virtual machines - the most important cost driver in most AWS accounts.

**AWS Equivalent:** EC2 Instances

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `instance_id` | text | Unique instance identifier |
| `name` | text | Instance name |
| `instance_type` | text | Size (e.g., m5.xlarge) |
| `env` | text | Environment (prod, staging, dev, preview) |
| `region` | text | AWS region |
| `state` | text | running, pending, stopping, stopped, terminated |
| `autoscaling_group_id` | UUID | FK to ASG if part of one |
| `launch_time` | timestamptz | When instance started |
| `hourly_cost` | numeric | Cost per hour |
| `gpu_hourly_cost` | numeric | Additional GPU cost |
| `gpu_count` | integer | Number of GPUs |
| `has_gpu` | boolean | GPU attached flag |
| `avg_cpu_7d` | numeric | 7-day average CPU % |
| `avg_network_7d` | numeric | 7-day average network |
| `current_cpu` | numeric | Live CPU % (updated by drift-tick) |
| `current_memory` | numeric | Live memory % |
| `last_active_at` | timestamptz | Last activity timestamp |
| `tags` | JSONB | Resource tags |
| `optimization_policy` | text | auto_safe, recommend_only, ignore |
| `optimization_freeze_until` | timestamptz | Pause optimization |

#### Waste Patterns

| Pattern | Indicator | Impact |
|---------|-----------|--------|
| Idle instance | `state` = 'running' + `avg_cpu_7d` < 5% | Paying full price for unused compute |
| Stopped instance | `state` = 'stopped' | Still paying for EBS storage |
| Oversized instance | Large `instance_type` + low utilization | Paying for capacity not needed |
| Forgotten preview | `env` = 'preview' + `launch_time` > 7 days | Developer forgot to clean up |

#### Manual Optimization Process

```
1. Open EC2 Console → Instances
2. Add columns: CPU Utilization (avg), Launch Time
3. Sort by CPU utilization ascending
4. For each idle instance (< 10% CPU):

   Option A - Right-size:
   - Stop instance
   - Change instance type to smaller
   - Start instance

   Option B - Terminate:
   - Verify no critical workload
   - Create AMI backup (optional)
   - Terminate instance

   Option C - Schedule:
   - If dev/test: Use Instance Scheduler to stop nights/weekends

5. For stopped instances:
   - Check if needed
   - If not: Terminate and delete associated volumes
```

#### Cost Impact Examples

| Change | Monthly Savings |
|--------|-----------------|
| Terminate idle m5.xlarge | $140 |
| Downsize m5.2xlarge → m5.large | $210 |
| Stop dev instances nights/weekends | 65% of instance cost |

---

### `autoscaling_groups`

**What it is:** Groups that automatically scale EC2 instances based on demand.

**AWS Equivalent:** EC2 Auto Scaling Groups

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `name` | text | ASG name |
| `min_size` | integer | Minimum instances |
| `max_size` | integer | Maximum instances |
| `desired_capacity` | integer | Target instance count |
| `instance_type` | text | Instance size for group |
| `env` | text | Environment |
| `region` | text | AWS region |
| `current_utilization` | numeric | Live CPU average across group |
| `optimization_policy` | text | Agent behavior control |
| `optimization_freeze_until` | timestamptz | Pause optimization |

#### Waste Patterns

| Pattern | Indicator | Impact |
|---------|-----------|--------|
| Over-provisioned min | `min_size` too high | Paying for instances 24/7 |
| Low utilization | `current_utilization` < 30% | Could use smaller instances |

#### Manual Optimization Process

```
1. Open EC2 Console → Auto Scaling Groups
2. Select group → Monitoring tab
3. Check "Group CPU Utilization" graph over 7 days
4. If consistently < 40%:
   - Option A: Reduce min_size/desired_capacity
   - Option B: Change instance_type to smaller size
5. Edit group → Update configuration
6. Monitor for 24-48 hours to ensure no performance impact
```

#### Cost Impact

A group with `min_size=10` using m5.xlarge ($0.192/hr) costs **$1,382/month** minimum.
Reducing to `min_size=3` saves **$967/month**.

---

### `lambda_functions`

**What it is:** Serverless compute functions.

**AWS Equivalent:** AWS Lambda

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `name` | text | Function name |
| `env` | text | Environment |
| `region` | text | AWS region |
| `memory_mb` | integer | Allocated memory (default: 128) |
| `timeout_seconds` | integer | Max execution time (default: 30) |
| `provisioned_concurrency` | integer | Pre-warmed instances |
| `invocations_7d` | bigint | Invocation count last 7 days |
| `avg_duration_ms_7d` | numeric | Average execution time |
| `estimated_monthly_cost` | numeric | Projected cost |

#### Waste Patterns

| Pattern | Indicator | Impact |
|---------|-----------|--------|
| Unused provisioned concurrency | High `provisioned_concurrency` + low `invocations_7d` | Paying for idle warm capacity |
| Oversized memory | `memory_mb` = 1024+ for simple function | Paying for unused RAM |
| Poor design | `timeout_seconds` = 900 | Usually indicates architectural issues |

#### Manual Optimization Process

```
1. Open Lambda Console → Functions
2. For each function, check:
   - Monitoring tab: Invocations, Duration, Concurrent executions

3. For provisioned concurrency waste:
   - If peak concurrent < provisioned:
   - Configuration → Provisioned concurrency → Delete

4. For memory optimization:
   - Use AWS Lambda Power Tuning tool
   - Run with different memory configs
   - Find optimal cost/performance balance

5. For timeout:
   - Check actual max duration
   - Set timeout to 2x actual max (not 15 minutes)
```

#### Cost Impact

Removing unused provisioned concurrency of 100 = **~$100/month** saved.

---

## Container Orchestration

### `container_clusters`

**What it is:** Kubernetes/ECS cluster configuration.

**AWS Equivalent:** EKS, ECS Clusters

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `name` | text | Cluster name |
| `env` | text | Environment |
| `region` | text | AWS region |
| `node_instance_type` | text | Worker node size |
| `desired_nodes` | integer | Target node count |
| `min_nodes` | integer | Minimum nodes |
| `max_nodes` | integer | Maximum nodes |
| `estimated_hourly_cost` | numeric | Cluster cost per hour |

#### Waste Patterns

| Pattern | Indicator |
|---------|-----------|
| Over-provisioned | `desired_nodes` >> actual pods needed |
| High minimum | `min_nodes` too high for workload |

#### Manual Optimization Process

```
1. Open EKS Console → Clusters → Select cluster
2. Check node group configuration
3. Run: kubectl top nodes (see actual resource usage)
4. If nodes consistently < 50% utilized:
   - Enable Cluster Autoscaler
   - Reduce min_nodes
   - Consider smaller node_instance_type
5. Update node group settings
```

---

### `container_nodes`

**What it is:** Individual worker machines in the cluster.

**AWS Equivalent:** EKS/ECS EC2 instances

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `cluster_id` | UUID | Foreign key to container_clusters |
| `instance_id` | text | EC2 instance ID |
| `instance_type` | text | Instance size |
| `region` | text | AWS region |
| `state` | text | running, stopped |
| `hourly_cost` | numeric | Cost per hour |
| `gpu_hourly_cost` | numeric | Additional GPU cost |
| `gpu_count` | integer | Number of GPUs |
| `has_gpu` | boolean | GPU attached flag |
| `avg_cpu_7d` | numeric | 7-day average CPU % |
| `avg_memory_7d` | numeric | 7-day average memory % |

#### Waste Patterns

| Pattern | Indicator |
|---------|-----------|
| Oversized node | `avg_cpu_7d` < 30% |
| Orphaned node | `state` = 'stopped' in healthy cluster |
| Unused GPU | `has_gpu` = true but no GPU workloads |

---

### `container_services`

**What it is:** Deployed applications/microservices.

**AWS Equivalent:** ECS Services, K8s Deployments

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `cluster_id` | UUID | Foreign key to container_clusters |
| `name` | text | Service name |
| `env` | text | Environment |
| `region` | text | AWS region |
| `requested_cpu` | numeric | CPU request (cores) |
| `requested_memory_mb` | integer | Memory request |
| `replica_count` | integer | Number of pods/tasks |
| `avg_cpu_7d` | numeric | Actual CPU usage |
| `avg_memory_7d` | numeric | Actual memory usage |

#### Waste Patterns

| Pattern | Indicator |
|---------|-----------|
| Over-requested CPU | `requested_cpu` >> `avg_cpu_7d` |
| Over-requested memory | `requested_memory_mb` >> `avg_memory_7d` |
| Too many replicas | High `replica_count` for load |

#### Manual Optimization Process

```
1. Run: kubectl top pods -n <namespace>
2. Compare actual usage vs requests in deployment YAML
3. If actual << requested:
   - Edit deployment: kubectl edit deployment <name>
   - Reduce resources.requests.cpu and memory
   - Reduce replicas if load is low
4. Apply changes, monitor for OOMKills or throttling
```

#### Cost Impact

Reducing requests allows bin-packing more pods per node = fewer nodes needed.

---

## Storage Resources

### `volumes`

**What it is:** Block storage attached to instances.

**AWS Equivalent:** EBS Volumes

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `volume_id` | text | Unique volume identifier |
| `region` | text | AWS region |
| `size_gib` | integer | Volume size |
| `volume_type` | text | gp2, gp3, io1, io2, st1, sc1 |
| `state` | text | creating, available, in-use, deleting, deleted |
| `attached_instance_id` | text | Instance attached to |
| `monthly_cost` | numeric | Storage cost per month |
| `last_used_at` | timestamptz | Last I/O activity |
| `tags` | JSONB | Resource tags |

#### Waste Patterns

| Pattern | Indicator | Impact |
|---------|-----------|--------|
| **Unattached volume** | `state` = 'available' | **100% waste** |
| Premium type waste | `volume_type` = 'io1'/'io2' for low IOPS | Paying for unneeded performance |
| Forgotten volume | `last_used_at` very old | Likely orphaned |

#### Manual Optimization Process

```
1. Open EC2 Console → Volumes
2. Filter: State = "available"
3. These are unattached volumes - PURE WASTE

4. For each unattached volume:
   - Check if any snapshots exist (backup)
   - If no snapshots: Create one first
   - Delete volume

5. For attached volumes:
   - Check volume type vs IOPS needs
   - gp3 is usually better value than gp2
   - io1/io2 only for very high IOPS needs

6. Modify volume:
   - Actions → Modify volume
   - Change type: io1 → gp3
   - Reduce size if possible (only for new volumes)
```

#### Cost Impact

| Scenario | Monthly Cost |
|----------|--------------|
| 500GB io1 unattached | $62.50 |
| Same volume deleted | $0 |
| 500GB io1 → 500GB gp3 | $62.50 → $40 |

---

### `snapshots`

**What it is:** Point-in-time backups of EBS volumes.

**AWS Equivalent:** EBS Snapshots

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `snapshot_id` | text | Unique snapshot identifier |
| `region` | text | AWS region |
| `source_volume_id` | text | Original volume |
| `size_gib` | integer | Snapshot size |
| `retention_policy` | text | Retention rules |
| `monthly_cost` | numeric | Storage cost |
| `tags` | JSONB | Resource tags |
| `created_at` | timestamptz | Creation time |

#### Waste Patterns

| Pattern | Indicator |
|---------|-----------|
| Orphaned snapshot | `source_volume_id` doesn't exist |
| Old snapshots | Created months ago, never used |
| Duplicate snapshots | Multiple per day when daily is enough |

#### Manual Optimization Process

```
1. Open EC2 Console → Snapshots
2. Sort by "Started" (oldest first)
3. Check "Volume" column:
   - If volume shows "deleted" = orphaned snapshot

4. For orphaned snapshots:
   - Verify no AMIs depend on it
   - Delete snapshot

5. Implement retention policy:
   - Use AWS Backup with lifecycle rules
   - Keep daily for 7 days, weekly for 4 weeks, monthly for 12 months
   - Automate old snapshot deletion
```

#### Cost Impact

Snapshots = $0.05/GB/month. 500GB orphaned = **$25/month forever**.

---

### `s3_buckets`

**What it is:** Object storage buckets.

**AWS Equivalent:** S3 Buckets

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `name` | text | Unique bucket name |
| `env` | text | Environment |
| `region` | text | AWS region |
| `lifecycle_policy` | JSONB | Auto-tiering rules |
| `tags` | JSONB | Resource tags |
| `optimization_policy` | text | Agent behavior control |

#### Waste Patterns

| Pattern | Indicator |
|---------|-----------|
| No lifecycle policy | `lifecycle_policy` = null |
| Cold data in hot storage | Large Standard storage with low access |

---

### `s3_bucket_usage_daily`

**What it is:** Daily S3 storage and request metrics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `bucket_id` | UUID | Foreign key to s3_buckets |
| `date` | date | Metric date |
| `storage_gb_standard` | numeric | Standard tier storage |
| `storage_gb_ia` | numeric | Infrequent Access storage |
| `storage_gb_glacier` | numeric | Glacier storage |
| `requests_count` | bigint | API request count |
| `estimated_storage_cost` | numeric | Daily storage cost |
| `estimated_request_cost` | numeric | Daily request cost |

#### Manual Optimization Process

```
1. Open S3 Console → Buckets
2. Check Storage Lens for usage patterns
3. Analyze access patterns:
   - S3 → Bucket → Metrics → Request metrics

4. Implement lifecycle rules:
   - Management → Lifecycle rules → Create rule

   Example policy:
   - After 30 days: Move to S3-IA (40% cheaper)
   - After 90 days: Move to Glacier (80% cheaper)
   - After 365 days: Delete (if allowed)

5. Enable Intelligent-Tiering for unpredictable access:
   - Automatically moves objects based on access
   - $0.0025/1000 objects monitoring fee
```

#### Cost Impact by Storage Tier

| Tier | Cost/GB/month |
|------|---------------|
| Standard | $0.023 |
| Infrequent Access | $0.0125 |
| Glacier | $0.004 |
| Glacier Deep Archive | $0.00099 |

1TB of old data: Standard = $23/mo, Glacier = **$4/mo** (83% savings).

---

## Database Services

### `rds_instances`

**What it is:** Managed relational databases.

**AWS Equivalent:** RDS (PostgreSQL, MySQL, Aurora)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `db_instance_id` | text | Unique DB identifier |
| `engine` | text | postgres, mysql, aurora-postgresql |
| `instance_class` | text | Size (e.g., db.r5.large) |
| `allocated_storage_gib` | integer | Storage size |
| `env` | text | Environment |
| `region` | text | AWS region |
| `state` | text | available, stopped, starting, stopping, deleting |
| `hourly_cost` | numeric | Instance cost per hour |
| `storage_monthly_cost` | numeric | Storage cost per month |
| `avg_cpu_7d` | numeric | 7-day average CPU % |
| `avg_connections_7d` | numeric | 7-day average connections |
| `optimization_policy` | text | Agent behavior control |

#### Waste Patterns

| Pattern | Indicator | Impact |
|---------|-----------|--------|
| Oversized instance | `avg_cpu_7d` < 20% | Paying for unused capacity |
| Low connections | `avg_connections_7d` < 10 | Possibly unused database |
| Stopped instance | `state` = 'stopped' | Still paying for storage |
| Over-provisioned storage | `allocated_storage_gib` >> actual data | Wasted storage |

#### Manual Optimization Process

```
1. Open RDS Console → Databases
2. Check Performance Insights / CloudWatch:
   - CPUUtilization
   - DatabaseConnections
   - FreeStorageSpace

3. For oversized instances:
   - Modify → Change DB instance class
   - Apply during maintenance window
   - e.g., db.r5.2xlarge → db.r5.large

4. For storage:
   - Note: Can only increase, not decrease
   - For new DBs: Start small, enable auto-scaling

5. For dev/test:
   - Stop RDS instances when not in use
   - Use Aurora Serverless v2 (scales to zero)
```

#### Cost Impact

db.r5.2xlarge ($0.48/hr) → db.r5.large ($0.12/hr) = **$259/month** savings.

---

### `cache_clusters`

**What it is:** Managed Redis/Memcached caching layer.

**AWS Equivalent:** ElastiCache

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `cluster_id` | text | Unique cluster identifier |
| `engine` | text | redis |
| `node_type` | text | Instance size |
| `num_nodes` | integer | Number of nodes |
| `env` | text | Environment |
| `region` | text | AWS region |
| `hourly_cost` | numeric | Cost per hour |
| `avg_cpu_7d` | numeric | 7-day average CPU % |
| `avg_memory_7d` | numeric | 7-day average memory % |

#### Waste Patterns

| Pattern | Indicator |
|---------|-----------|
| Oversized node | `avg_cpu_7d` < 10% |
| Low memory usage | `avg_memory_7d` < 20% |
| HA in dev | `num_nodes` > 1 in dev/staging |

#### Manual Optimization Process

```
1. Open ElastiCache Console → Redis clusters
2. Select cluster → Monitoring
3. Check "CPU Utilization" and "Memory Usage" CloudWatch metrics
4. If both consistently low:
   - For dev/staging: Reduce to single node
   - For prod: Downsize node_type (e.g., r6g.large → r6g.medium)
5. Create new cluster with smaller config
6. Update application connection strings
7. Delete old cluster
```

#### Cost Impact

r6g.xlarge ($0.252/hr) vs r6g.medium ($0.063/hr) = **$136/month** savings per node.

---

## Networking Resources

### `load_balancers`

**What it is:** Traffic distribution across instances.

**AWS Equivalent:** ALB, NLB, CLB

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `lb_arn` | text | Unique ARN |
| `name` | text | Load balancer name |
| `type` | text | application, network, gateway, classic |
| `env` | text | Environment |
| `region` | text | AWS region |
| `hourly_cost` | numeric | Base cost per hour |
| `avg_request_count_7d` | numeric | 7-day average requests |

#### Waste Patterns

| Pattern | Indicator |
|---------|-----------|
| Unused LB | `avg_request_count_7d` ≈ 0 |
| Multiple LBs | Consolidation opportunity |

#### Manual Optimization Process

```
1. Open EC2 Console → Load Balancers
2. Check Monitoring tab for each LB
3. If RequestCount ≈ 0 for 7+ days:
   - Verify no active targets
   - Delete load balancer
4. Consolidation:
   - Use path-based routing to combine multiple services
   - One ALB can serve many services via rules
```

#### Cost Impact

ALB = **$16/month** base + LCU charges. Unused ALB = pure waste.

---

### `elastic_ips`

**What it is:** Static public IP addresses.

**AWS Equivalent:** Elastic IP Addresses

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `allocation_id` | text | Unique allocation ID |
| `public_ip` | text | The IP address |
| `associated_instance_id` | text | Attached instance |
| `associated_lb_arn` | text | Attached load balancer |
| `state` | text | associated, unassociated |
| `hourly_cost` | numeric | Cost when unassociated |
| `optimization_policy` | text | Agent behavior control |
| `tags` | JSONB | Resource tags |

#### Cost Model

| State | Cost |
|-------|------|
| `associated` | **FREE** |
| `unassociated` | **$0.005/hour = $3.60/month** |

#### Manual Optimization Process

```
1. Open EC2 Console → Elastic IPs
2. Filter by "Associated instance ID" = empty
3. For each unassociated EIP:
   - If needed: Associate with an instance/NAT Gateway
   - If not needed: Release the EIP
4. Actions → Release Elastic IP address
```

#### Cost Impact

10 orphaned EIPs = **$36/month** for literally nothing.

---

### `data_transfer_daily`

**What it is:** Network traffic costs between regions/AZs/internet.

**AWS Equivalent:** Data Transfer charges

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `date` | date | Transfer date |
| `source_region` | text | Origin region |
| `dest_region` | text | Destination region |
| `direction` | text | intra-az, cross-az, cross-region, egress, ingress |
| `gb_transferred` | numeric | Data volume |
| `estimated_transfer_cost` | numeric | Cost |

#### Cost by Direction

| Direction | Cost |
|-----------|------|
| `intra-az` | Free |
| `cross-az` | $0.01/GB |
| `cross-region` | $0.02/GB |
| `egress` (to internet) | $0.09/GB (first 10TB) |

#### Manual Optimization Process

```
1. Open Cost Explorer → Filter by "Data Transfer"
2. Group by "Usage Type" to see breakdown
3. Identify top costs:
   - Cross-AZ: Deploy services in same AZ or use VPC endpoints
   - Cross-region: Use CloudFront for static content
   - Egress: Compress responses, use CloudFront caching
4. Architecture changes:
   - Move chatty services to same AZ
   - Use S3 Transfer Acceleration for uploads
   - Use PrivateLink for AWS service access
```

#### Cost Impact

1TB/day cross-AZ = **$300/month**. Moving to same AZ = **$0**.

---

## Observability & Logging

### `log_groups`

**What it is:** CloudWatch Log Groups for application/system logs.

**AWS Equivalent:** CloudWatch Logs

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `name` | text | Log group name |
| `env` | text | Environment |
| `region` | text | AWS region |
| `retention_days` | integer | Days to keep logs (null = forever) |
| `tags` | JSONB | Resource tags |
| `optimization_policy` | text | Agent behavior control |

#### Waste Patterns

| Pattern | Indicator |
|---------|-----------|
| Infinite retention | `retention_days` = null |
| Verbose logging | High ingestion in non-prod |

---

### `log_group_usage_daily`

**What it is:** Daily ingestion and storage metrics for log groups.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `log_group_id` | UUID | Foreign key to log_groups |
| `date` | date | Metric date |
| `ingested_gb` | numeric | Daily ingestion volume |
| `stored_gb` | numeric | Total stored volume |
| `estimated_ingestion_cost` | numeric | Ingestion cost |
| `estimated_storage_cost` | numeric | Storage cost |

#### Manual Optimization Process

```
1. Open CloudWatch Console → Log Groups
2. Sort by "Stored Bytes" descending
3. For each large log group:

   Set retention:
   - Production: 30-90 days
   - Staging: 14 days
   - Dev: 7 days
   - Click log group → Actions → Edit retention

4. Reduce ingestion:
   - Review application log levels
   - Change DEBUG → INFO in production
   - Filter out health check logs

5. Archive strategy:
   - Export old logs to S3 before retention kicks in
   - Use S3 lifecycle to move to Glacier
```

#### Cost Impact

| Log volume | Infinite retention (1yr) | 30-day retention |
|------------|--------------------------|------------------|
| 10 GB/day | $912/year storage | $76/year storage |

---

## Commitments & Cost Tracking

### `commitments`

**What it is:** Prepaid capacity reservations for discounts.

**AWS Equivalent:** Reserved Instances, Savings Plans, Enterprise Discount Programs

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `commitment_type` | text | reserved_instance, savings_plan, edp |
| `scope` | text | Coverage scope |
| `term_months` | integer | 12 or 36 months |
| `hourly_commitment_amount` | numeric | Committed hourly spend |
| `start_date` | date | Commitment start |
| `end_date` | date | Commitment end |

#### Commitment Types

| Type | Typical Discount | Risk |
|------|------------------|------|
| Reserved Instance | 30-60% | Locked to instance type |
| Savings Plan | 20-40% | More flexible |
| EDP | 5-15% | Volume commitment |

---

### `commitment_utilization_daily`

**What it is:** Daily tracking of how well you're using your commitments.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `commitment_id` | UUID | Foreign key to commitments |
| `date` | date | Metric date |
| `actual_hourly_usage_equivalent` | numeric | What you actually used |
| `utilization_percent` | numeric | Usage / Commitment |
| `estimated_savings_vs_ondemand` | numeric | Savings realized |

#### Waste Pattern

| Pattern | Indicator |
|---------|-----------|
| Underutilized commitment | `utilization_percent` < 80% |

#### Manual Optimization Process

```
1. Open AWS Cost Explorer → Reservations → Utilization
2. Filter by commitment type
3. Identify commitments with < 80% utilization
4. Options:
   - Sell unused RIs on AWS Marketplace
   - Modify RI to match actual usage (region, instance family)
   - For Savings Plans: spin up workloads to use the commitment
5. For future: Use AWS recommendations before purchasing
```

#### Cost Impact

A $1,000/month RI at 60% utilization = **$400/month wasted**.

---

### `metrics_daily`

**What it is:** Historical resource metrics for trend analysis.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `resource_type` | text | Type of resource |
| `resource_id` | text | Resource identifier |
| `date` | date | Metric date |
| `metric_payload` | JSONB | cpu_avg, cpu_max, memory_avg, network, disk |
| `estimated_daily_cost` | numeric | Daily cost |

**Used for:** Identifying optimization opportunities over time. Supports trend analysis and anomaly detection.

---

## Governance & Metadata

### `resource_tags`

**What it is:** Key-value metadata on resources.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `resource_type` | text | Type of resource |
| `resource_id` | text | Resource identifier |
| `key` | text | Tag key |
| `value` | text | Tag value |

#### Optimization Use

Tags enable cost allocation and finding untagged (likely orphaned) resources.

```
1. Use AWS Tag Editor to find untagged resources
2. Untagged resources are often forgotten/orphaned
3. Implement tagging policy:
   - Required: env, team, project
   - Use AWS Organizations SCPs to enforce
```

---

### `resource_change_events`

**What it is:** Audit log of all changes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `resource_type` | text | Type of resource |
| `resource_id` | text | Resource identifier |
| `change_source` | text | drift_engine, agent, manual |
| `field_name` | text | What changed |
| `old_value` | text | Previous value |
| `new_value` | text | New value |
| `changed_at` | timestamptz | When it changed |

**Used for:** Compliance, debugging, tracking who changed what and when.

---

## Managed Services

### `managed_services`

**What it is:** Fully managed AWS services.

**AWS Equivalent:** OpenSearch, SageMaker, etc.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `service_type` | text | opensearch, sagemaker, etc. |
| `name` | text | Service name |
| `env` | text | Environment |
| `region` | text | AWS region |
| `instance_type` | text | Node size |
| `node_count` | integer | Number of nodes |
| `hourly_cost` | numeric | Cost per hour |
| `avg_cpu_7d` | numeric | 7-day average CPU % |
| `avg_memory_7d` | numeric | 7-day average memory % |

#### Waste Patterns

| Pattern | Indicator |
|---------|-----------|
| Oversized | `avg_cpu_7d` < 20% |
| HA in dev | `node_count` high in dev/staging |
| Always running | Dev environment running 24/7 |

---

### `streaming_clusters`

**What it is:** Real-time data streaming services.

**AWS Equivalent:** Kinesis, MSK (Managed Kafka)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to cloud_accounts |
| `name` | text | Cluster name |
| `engine` | text | kinesis, kafka, msk |
| `env` | text | Environment |
| `region` | text | AWS region |
| `shard_count` | integer | Number of shards |
| `retention_hours` | integer | Data retention period |
| `provisioned_throughput_mbps` | numeric | Provisioned capacity |
| `avg_usage_mbps_7d` | numeric | Actual throughput |
| `hourly_cost` | numeric | Cost per hour |

#### Waste Patterns

| Pattern | Indicator |
|---------|-----------|
| Over-provisioned | `avg_usage_mbps_7d` << `provisioned_throughput_mbps` |
| Too many shards | `shard_count` exceeds needs |
| Excess retention | `retention_hours` = 168 when 24h is enough |

#### Manual Optimization Process

```
1. Open Kinesis Console → Data Streams
2. Check Monitoring:
   - IncomingBytes, IncomingRecords
   - Compare to shard capacity (1MB/s in, 2MB/s out per shard)

3. If shards underutilized:
   - Use UpdateShardCount to reduce
   - Or enable on-demand capacity mode

4. Reduce retention:
   - Default 24 hours is often sufficient
   - 7 days = 7x the cost
```

---

## Quick Wins Summary

### Top 10 Optimization Opportunities

| # | Check | Expected Savings |
|---|-------|------------------|
| 1 | Delete unattached volumes (`volumes.state = 'available'`) | $10-50/volume/month |
| 2 | Release unassociated Elastic IPs (`elastic_ips.state = 'unassociated'`) | $3.60/IP/month |
| 3 | Terminate idle instances (`instances.avg_cpu_7d < 5%`) | $50-500/instance/month |
| 4 | Delete orphaned snapshots (source volume deleted) | $5-25/snapshot/month |
| 5 | Set log retention policies (`log_groups.retention_days = null`) | 50-90% of log costs |
| 6 | Right-size oversized RDS (`rds_instances.avg_cpu_7d < 20%`) | $100-300/instance/month |
| 7 | Remove unused load balancers (`load_balancers.avg_request_count_7d ≈ 0`) | $16+/LB/month |
| 8 | Reduce Lambda provisioned concurrency | $50-200/function/month |
| 9 | Implement S3 lifecycle policies | 40-80% of storage costs |
| 10 | Stop dev/test resources nights/weekends | 65% of those resources |

### Waste Detection Queries

```sql
-- Find idle instances
SELECT * FROM instances
WHERE state = 'running' AND avg_cpu_7d < 5;

-- Find unattached volumes
SELECT * FROM volumes
WHERE state = 'available';

-- Find unassociated Elastic IPs
SELECT * FROM elastic_ips
WHERE state = 'unassociated';

-- Find orphaned snapshots
SELECT s.* FROM snapshots s
LEFT JOIN volumes v ON s.source_volume_id = v.volume_id
WHERE v.id IS NULL;

-- Find log groups without retention
SELECT * FROM log_groups
WHERE retention_days IS NULL;

-- Find underutilized commitments
SELECT c.*, cud.utilization_percent
FROM commitments c
JOIN commitment_utilization_daily cud ON c.id = cud.commitment_id
WHERE cud.utilization_percent < 80
AND cud.date = CURRENT_DATE - 1;
```

---

## Schema Design Principles

1. **Row Level Security (RLS)** - Enabled on all tables for multi-tenant support
2. **Automatic timestamps** - Trigger function maintains `updated_at` on mutable tables
3. **Agent Control Columns** - `optimization_policy` and `optimization_freeze_until` enable fine-grained AI agent behavior control
4. **Live Metrics** - `current_cpu`, `current_memory` updated by drift-tick Edge Function
5. **Audit Trail** - `resource_change_events` tracks all modifications by source
6. **Comprehensive Indexing** - Strategic indexes on foreign keys, state columns, dates, and JSONB payloads

---

*This schema supports a complete AWS-like environment simulation for testing AI-driven cost optimization and drift detection scenarios.*
