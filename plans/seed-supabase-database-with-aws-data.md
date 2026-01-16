# feat: Seed Supabase Database with Realistic AWS Cloud Data

## Overview

Create a TypeScript seed script that populates the Supabase/PostgreSQL database with realistic-looking AWS cloud data for the last 30 days. This will provide meaningful test data for the FinOps AI platform to analyze.

**Date**: January 16, 2026
**Project**: aws-environment
**Supabase Project Ref**: `vqcvrwkdvxzgucqcfcoq`

## Problem Statement / Motivation

The database schema is complete with 25 tables, but empty. The Agentic AI platform needs realistic data to:

1. Detect waste patterns (idle instances, unattached volumes, unused Elastic IPs)
2. Analyze cost trends over time
3. Test optimization recommendations
4. Simulate real-world FinOps scenarios

## Proposed Solution

A single TypeScript script (`scripts/seed.ts`) that:

1. Connects to Supabase via the official JS client
2. Generates realistic AWS resource data with proper relationships
3. Creates 30 days of time-series data (usage metrics, costs)
4. Introduces intentional "waste patterns" for AI detection

## Technical Approach

### Data Generation Strategy

**1. Cloud Account**: Create 1 primary account

**2. Compute Resources (with waste patterns)**:
- 20-30 EC2 instances (mix of running, stopped, idle)
- 3-5 autoscaling groups
- 2-3 container clusters with nodes
- 10-15 Lambda functions (some never invoked)

**3. Storage Resources (with waste patterns)**:
- 15-20 EBS volumes (some unattached)
- 10-15 snapshots (some orphaned)
- 5-8 S3 buckets with daily usage

**4. Database & Cache**:
- 3-5 RDS instances (some oversized)
- 2-3 cache clusters

**5. Networking**:
- 3-5 load balancers
- 5-8 Elastic IPs (some unassociated)
- 30 days of data transfer records

**6. Managed Services**:
- 2-3 managed services (OpenSearch, etc.)
- 2-3 streaming clusters

**7. Observability**:
- 10-15 log groups with daily usage

**8. Commitments**:
- 2-3 reserved instances/savings plans
- 30 days of utilization tracking

### Waste Patterns to Seed

| Pattern | Implementation |
|---------|----------------|
| Idle instances | Low CPU (<5%), running state |
| Stopped instances | state='stopped', last_active weeks ago |
| Unattached volumes | attached_instance_id = null |
| Orphaned snapshots | source_volume_id references deleted volume |
| Underutilized RDS | Large instance class, <10% CPU |
| Unused Elastic IPs | state='unassociated' |
| Oversized Lambda | 1024MB+ memory, <100 invocations/week |
| Underutilized commitments | <60% utilization |

### Script Structure

```typescript
// scripts/seed.ts

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper functions
function randomRegion(): string;
function randomEnv(): string;
function randomInstanceType(): string;
function generateDateRange(days: number): Date[];
function randomCost(min: number, max: number): number;

// Seed functions (in dependency order)
async function seedCloudAccount(): Promise<string>;
async function seedAutoscalingGroups(accountId: string): Promise<string[]>;
async function seedInstances(accountId: string, asgIds: string[]): Promise<void>;
async function seedContainerClusters(accountId: string): Promise<string[]>;
async function seedContainerNodes(clusterIds: string[]): Promise<void>;
async function seedContainerServices(clusterIds: string[]): Promise<void>;
async function seedLambdaFunctions(accountId: string): Promise<void>;
async function seedVolumes(accountId: string): Promise<void>;
async function seedSnapshots(accountId: string): Promise<void>;
async function seedS3Buckets(accountId: string): Promise<string[]>;
async function seedS3BucketUsage(bucketIds: string[]): Promise<void>;
async function seedRdsInstances(accountId: string): Promise<void>;
async function seedCacheClusters(accountId: string): Promise<void>;
async function seedLoadBalancers(accountId: string): Promise<void>;
async function seedElasticIps(accountId: string): Promise<void>;
async function seedDataTransferDaily(accountId: string): Promise<void>;
async function seedManagedServices(accountId: string): Promise<void>;
async function seedStreamingClusters(accountId: string): Promise<void>;
async function seedLogGroups(accountId: string): Promise<string[]>;
async function seedLogGroupUsage(logGroupIds: string[]): Promise<void>;
async function seedCommitments(accountId: string): Promise<string[]>;
async function seedCommitmentUtilization(commitmentIds: string[]): Promise<void>;
async function seedResourceTags(accountId: string): Promise<void>;
async function seedMetricsDaily(accountId: string): Promise<void>;

// Main execution
async function main(): Promise<void>;
```

### Realistic Data Patterns

**Instance Types Distribution**:
- 40% t3.micro/small (dev)
- 30% m5.large/xlarge (prod)
- 20% c5/r5 (compute/memory optimized)
- 10% p3/g4 (GPU instances)

**Regions**:
- 60% us-east-1
- 20% us-west-2
- 10% eu-west-1
- 10% ap-southeast-1

**Environments**:
- 40% dev
- 30% staging
- 30% prod

**Cost Patterns (30 days)**:
- Normal variation: ±5-10% daily
- Weekend dip: -20% on Sat/Sun
- Occasional spikes: +30% randomly

## Implementation Steps

### 1. Setup Project
```bash
npm init -y
npm install @supabase/supabase-js @faker-js/faker dotenv
npm install -D typescript @types/node ts-node
npx tsc --init
```

### 2. Create Environment File
```bash
# .env (not committed)
SUPABASE_URL=https://vqcvrwkdvxzgucqcfcoq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

### 3. Implement Seed Script
- Create `scripts/seed.ts`
- Add helper functions for random data
- Implement each seeder in FK dependency order
- Add progress logging

### 4. Run Script
```bash
npx ts-node scripts/seed.ts
```

## Acceptance Criteria

### Functional Requirements
- [ ] Script creates 1 cloud account
- [ ] 20-30 instances with realistic attributes
- [ ] 3-5 autoscaling groups with managed instances
- [ ] 2-3 container clusters with nodes and services
- [ ] 15-20 volumes (some unattached)
- [ ] 10-15 snapshots
- [ ] 5-8 S3 buckets with 30 days of usage data
- [ ] 3-5 RDS instances
- [ ] 2-3 cache clusters
- [ ] 3-5 load balancers
- [ ] 5-8 Elastic IPs (some unassociated)
- [ ] 30 days of data transfer records
- [ ] 2-3 managed services
- [ ] 2-3 streaming clusters
- [ ] 10-15 log groups with 30 days of usage
- [ ] 2-3 commitments with 30 days of utilization
- [ ] Resource tags for key resources
- [ ] Metrics daily records

### Waste Patterns
- [ ] At least 5 idle instances (CPU < 5%)
- [ ] At least 3 stopped instances
- [ ] At least 5 unattached volumes
- [ ] At least 3 orphaned snapshots
- [ ] At least 2 unassociated Elastic IPs
- [ ] At least 1 underutilized commitment (<60%)

### Quality Gates
- [ ] Script runs without errors
- [ ] All FK relationships valid
- [ ] Data passes schema constraints
- [ ] Idempotent (can clear and re-run)

## Dependencies & Prerequisites

- Node.js 18+ installed locally
- Supabase project accessible
- Service role key available
- Schema already deployed (25 tables exist)

## Implementation Task List

- [ ] Initialize npm project with dependencies
- [ ] Create tsconfig.json for TypeScript
- [ ] Create .env.example file
- [ ] Create scripts/seed.ts with helper functions
- [ ] Implement seedCloudAccount
- [ ] Implement seedAutoscalingGroups
- [ ] Implement seedInstances (with waste patterns)
- [ ] Implement seedContainerClusters
- [ ] Implement seedContainerNodes
- [ ] Implement seedContainerServices
- [ ] Implement seedLambdaFunctions (with waste patterns)
- [ ] Implement seedVolumes (with waste patterns)
- [ ] Implement seedSnapshots (with waste patterns)
- [ ] Implement seedS3Buckets
- [ ] Implement seedS3BucketUsage
- [ ] Implement seedRdsInstances (with waste patterns)
- [ ] Implement seedCacheClusters
- [ ] Implement seedLoadBalancers
- [ ] Implement seedElasticIps (with waste patterns)
- [ ] Implement seedDataTransferDaily
- [ ] Implement seedManagedServices
- [ ] Implement seedStreamingClusters
- [ ] Implement seedLogGroups
- [ ] Implement seedLogGroupUsage
- [ ] Implement seedCommitments
- [ ] Implement seedCommitmentUtilization (with waste patterns)
- [ ] Implement seedResourceTags
- [ ] Implement seedMetricsDaily
- [ ] Implement main() orchestration
- [ ] Test script locally
- [ ] Document usage in README

## References

### Internal
- `supabase/migrations/` - All 11 migration files with exact schema
- `plans/aws-cloud-environment-supabase-schema.md` - Schema design

### External
- [@supabase/supabase-js](https://www.npmjs.com/package/@supabase/supabase-js)
- [@faker-js/faker](https://fakerjs.dev/)
- [AWS EC2 Instance Types](https://aws.amazon.com/ec2/instance-types/)
- [AWS Pricing](https://aws.amazon.com/pricing/)

---

Generated with [Claude Code](https://claude.com/claude-code)
