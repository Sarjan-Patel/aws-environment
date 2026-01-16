/**
 * Seed script for AWS Cloud Environment Supabase database
 *
 * Populates the database with realistic AWS cloud data for the last 30 days,
 * including intentional "waste patterns" for FinOps AI detection.
 *
 * Usage:
 *   SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> npx ts-node scripts/seed.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { faker } from "@faker-js/faker";
import * as dotenv from "dotenv";

dotenv.config();

// Validate environment
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required environment variables:");
  console.error("  SUPABASE_URL");
  console.error("  SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

// Configuration
const DAYS_OF_DATA = 30;
const REGIONS = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"];
const ENVS = ["dev", "staging", "prod"];
const INSTANCE_TYPES = [
  "t3.micro",
  "t3.small",
  "t3.medium",
  "m5.large",
  "m5.xlarge",
  "m5.2xlarge",
  "c5.large",
  "c5.xlarge",
  "r5.large",
  "r5.xlarge",
  "p3.2xlarge",
  "g4dn.xlarge",
];
const RDS_INSTANCE_CLASSES = [
  "db.t3.micro",
  "db.t3.small",
  "db.t3.medium",
  "db.m5.large",
  "db.m5.xlarge",
  "db.r5.large",
];
const CACHE_NODE_TYPES = [
  "cache.t3.micro",
  "cache.t3.small",
  "cache.m5.large",
  "cache.r5.large",
];
const VOLUME_TYPES = ["gp2", "gp3", "io1", "io2", "st1", "sc1"];

// Hourly costs by instance type (approximate)
const INSTANCE_COSTS: Record<string, number> = {
  "t3.micro": 0.0104,
  "t3.small": 0.0208,
  "t3.medium": 0.0416,
  "m5.large": 0.096,
  "m5.xlarge": 0.192,
  "m5.2xlarge": 0.384,
  "c5.large": 0.085,
  "c5.xlarge": 0.17,
  "r5.large": 0.126,
  "r5.xlarge": 0.252,
  "p3.2xlarge": 3.06,
  "g4dn.xlarge": 0.526,
};

const RDS_COSTS: Record<string, number> = {
  "db.t3.micro": 0.017,
  "db.t3.small": 0.034,
  "db.t3.medium": 0.068,
  "db.m5.large": 0.171,
  "db.m5.xlarge": 0.342,
  "db.r5.large": 0.25,
};

const CACHE_COSTS: Record<string, number> = {
  "cache.t3.micro": 0.017,
  "cache.t3.small": 0.034,
  "cache.m5.large": 0.156,
  "cache.r5.large": 0.228,
};

// Helper functions
function randomRegion(): string {
  const weights = [0.6, 0.2, 0.1, 0.1]; // us-east-1 weighted heavily
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < REGIONS.length; i++) {
    cumulative += weights[i];
    if (r < cumulative) return REGIONS[i];
  }
  return REGIONS[0];
}

function randomEnv(): string {
  const weights = [0.4, 0.3, 0.3];
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < ENVS.length; i++) {
    cumulative += weights[i];
    if (r < cumulative) return ENVS[i];
  }
  return ENVS[0];
}

function randomInstanceType(): string {
  const weights = [0.15, 0.15, 0.1, 0.15, 0.1, 0.05, 0.08, 0.07, 0.05, 0.05, 0.025, 0.025];
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < INSTANCE_TYPES.length; i++) {
    cumulative += weights[i];
    if (r < cumulative) return INSTANCE_TYPES[i];
  }
  return INSTANCE_TYPES[0];
}

function generateDateRange(days: number): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date);
  }
  return dates;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function randomCost(base: number, variance: number = 0.1): number {
  const multiplier = 1 + (Math.random() - 0.5) * 2 * variance;
  return Math.round(base * multiplier * 10000) / 10000;
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateInstanceId(): string {
  return `i-${faker.string.hexadecimal({ length: 17, casing: "lower", prefix: "" })}`;
}

function generateVolumeId(): string {
  return `vol-${faker.string.hexadecimal({ length: 17, casing: "lower", prefix: "" })}`;
}

function generateSnapshotId(): string {
  return `snap-${faker.string.hexadecimal({ length: 17, casing: "lower", prefix: "" })}`;
}

function generateAllocationId(): string {
  return `eipalloc-${faker.string.hexadecimal({ length: 17, casing: "lower", prefix: "" })}`;
}

function generatePublicIp(): string {
  return `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
}

function generateLbArn(region: string, name: string): string {
  return `arn:aws:elasticloadbalancing:${region}:123456789012:loadbalancer/app/${name}/${faker.string.alphanumeric(16)}`;
}

function generateDbInstanceId(): string {
  return `${faker.word.adjective()}-${faker.word.noun()}-db`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function generateCacheClusterId(): string {
  return `${faker.word.adjective()}-${faker.word.noun()}-cache`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Seed functions
async function clearAllData(): Promise<void> {
  log("Clearing existing data...");

  // Delete in reverse FK order
  const tables = [
    "api_clients",
    "container_services",
    "metrics_daily",
    "resource_tags",
    "commitment_utilization_daily",
    "commitments",
    "log_group_usage_daily",
    "log_groups",
    "streaming_clusters",
    "managed_services",
    "data_transfer_daily",
    "elastic_ips",
    "load_balancers",
    "cache_clusters",
    "rds_instances",
    "s3_bucket_usage_daily",
    "s3_buckets",
    "snapshots",
    "volumes",
    "lambda_functions",
    "container_nodes",
    "container_clusters",
    "instances",
    "autoscaling_groups",
    "cloud_accounts",
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error && !error.message.includes("0 rows")) {
      console.warn(`  Warning clearing ${table}: ${error.message}`);
    }
  }
  log("Data cleared.");
}

async function seedCloudAccount(): Promise<string> {
  log("Seeding cloud account...");

  const { data, error } = await supabase
    .from("cloud_accounts")
    .insert({
      name: "Acme Corp Production",
      provider: "aws-fake",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to seed cloud account: ${error.message}`);

  log(`  Created account: ${data.id}`);
  return data.id;
}

async function seedAutoscalingGroups(accountId: string): Promise<string[]> {
  log("Seeding autoscaling groups...");

  const asgNames = [
    "web-frontend-asg",
    "api-backend-asg",
    "worker-processing-asg",
    "batch-jobs-asg",
  ];

  const groups = asgNames.map((name) => ({
    account_id: accountId,
    name,
    min_size: randomInt(1, 2),
    max_size: randomInt(5, 20),
    desired_capacity: randomInt(2, 8),
    instance_type: pickRandom(["t3.medium", "m5.large", "c5.large"]),
    env: pickRandom(["prod", "staging"]),
    region: randomRegion(),
  }));

  const { data, error } = await supabase
    .from("autoscaling_groups")
    .insert(groups)
    .select("id");

  if (error) throw new Error(`Failed to seed ASGs: ${error.message}`);

  const ids = data.map((d) => d.id);
  log(`  Created ${ids.length} autoscaling groups`);
  return ids;
}

async function seedInstances(accountId: string, asgIds: string[]): Promise<void> {
  log("Seeding instances...");

  const instances: any[] = [];
  const now = new Date();

  // Instances in ASGs (managed)
  for (const asgId of asgIds) {
    const count = randomInt(2, 5);
    for (let i = 0; i < count; i++) {
      const instanceType = randomInstanceType();
      const isGpu = instanceType.startsWith("p3") || instanceType.startsWith("g4");
      const launchTime = new Date(now.getTime() - randomInt(1, 90) * 24 * 60 * 60 * 1000);

      instances.push({
        account_id: accountId,
        instance_id: generateInstanceId(),
        name: `asg-managed-${faker.word.adjective()}-${faker.word.noun()}`,
        instance_type: instanceType,
        env: pickRandom(["prod", "staging"]),
        region: randomRegion(),
        state: "running",
        autoscaling_group_id: asgId,
        launch_time: launchTime.toISOString(),
        hourly_cost: INSTANCE_COSTS[instanceType] || 0.1,
        gpu_hourly_cost: isGpu ? INSTANCE_COSTS[instanceType] * 0.8 : 0,
        gpu_count: isGpu ? (instanceType.includes("p3") ? 1 : 1) : 0,
        has_gpu: isGpu,
        avg_cpu_7d: randomBetween(20, 80),
        avg_network_7d: randomBetween(100, 10000),
        last_active_at: now.toISOString(),
        tags: { Environment: pickRandom(ENVS), Team: faker.commerce.department() },
      });
    }
  }

  // Standalone instances (some idle, some stopped - waste patterns)
  for (let i = 0; i < 15; i++) {
    const instanceType = randomInstanceType();
    const isGpu = instanceType.startsWith("p3") || instanceType.startsWith("g4");
    const launchTime = new Date(now.getTime() - randomInt(1, 180) * 24 * 60 * 60 * 1000);

    // Introduce waste patterns
    let state: string;
    let avgCpu: number;
    let lastActive: Date;

    if (i < 5) {
      // Idle instances (waste pattern)
      state = "running";
      avgCpu = randomBetween(0.5, 4.9); // < 5% CPU
      lastActive = new Date(now.getTime() - randomInt(1, 7) * 24 * 60 * 60 * 1000);
    } else if (i < 8) {
      // Stopped instances (waste pattern)
      state = "stopped";
      avgCpu = 0;
      lastActive = new Date(now.getTime() - randomInt(14, 60) * 24 * 60 * 60 * 1000);
    } else {
      // Normal running instances
      state = "running";
      avgCpu = randomBetween(15, 70);
      lastActive = now;
    }

    instances.push({
      account_id: accountId,
      instance_id: generateInstanceId(),
      name: `standalone-${faker.word.adjective()}-${faker.word.noun()}`,
      instance_type: instanceType,
      env: randomEnv(),
      region: randomRegion(),
      state,
      autoscaling_group_id: null,
      launch_time: launchTime.toISOString(),
      hourly_cost: INSTANCE_COSTS[instanceType] || 0.1,
      gpu_hourly_cost: isGpu ? INSTANCE_COSTS[instanceType] * 0.8 : 0,
      gpu_count: isGpu ? 1 : 0,
      has_gpu: isGpu,
      avg_cpu_7d: avgCpu,
      avg_network_7d: state === "running" ? randomBetween(50, 5000) : 0,
      last_active_at: lastActive.toISOString(),
      tags: { Environment: randomEnv(), Team: faker.commerce.department(), CostCenter: faker.string.numeric(4) },
    });
  }

  const { error } = await supabase.from("instances").insert(instances);
  if (error) throw new Error(`Failed to seed instances: ${error.message}`);

  log(`  Created ${instances.length} instances (including ${5} idle, ${3} stopped)`);
}

async function seedContainerClusters(accountId: string): Promise<string[]> {
  log("Seeding container clusters...");

  const clusters = [
    { name: "production-eks", env: "prod", region: "us-east-1" },
    { name: "staging-eks", env: "staging", region: "us-east-1" },
    { name: "ml-training-cluster", env: "prod", region: "us-west-2" },
  ].map((c) => ({
    account_id: accountId,
    name: c.name,
    env: c.env,
    region: c.region,
    node_instance_type: pickRandom(["m5.large", "m5.xlarge", "c5.xlarge"]),
    desired_nodes: randomInt(3, 8),
    min_nodes: 2,
    max_nodes: 15,
    estimated_hourly_cost: randomBetween(0.5, 3.0),
  }));

  const { data, error } = await supabase
    .from("container_clusters")
    .insert(clusters)
    .select("id");

  if (error) throw new Error(`Failed to seed clusters: ${error.message}`);

  const ids = data.map((d) => d.id);
  log(`  Created ${ids.length} container clusters`);
  return ids;
}

async function seedContainerNodes(clusterIds: string[]): Promise<void> {
  log("Seeding container nodes...");

  const nodes: any[] = [];

  for (const clusterId of clusterIds) {
    const nodeCount = randomInt(3, 6);
    for (let i = 0; i < nodeCount; i++) {
      const instanceType = pickRandom(["m5.large", "m5.xlarge", "c5.large", "r5.large"]);
      const isGpu = Math.random() < 0.1;

      nodes.push({
        cluster_id: clusterId,
        instance_id: generateInstanceId(),
        instance_type: isGpu ? "g4dn.xlarge" : instanceType,
        region: randomRegion(),
        state: "running",
        hourly_cost: INSTANCE_COSTS[instanceType] || 0.1,
        gpu_hourly_cost: isGpu ? 0.526 : 0,
        gpu_count: isGpu ? 1 : 0,
        has_gpu: isGpu,
        avg_cpu_7d: randomBetween(20, 75),
        avg_memory_7d: randomBetween(30, 80),
      });
    }
  }

  const { error } = await supabase.from("container_nodes").insert(nodes);
  if (error) throw new Error(`Failed to seed nodes: ${error.message}`);

  log(`  Created ${nodes.length} container nodes`);
}

async function seedContainerServices(clusterIds: string[]): Promise<void> {
  log("Seeding container services...");

  const serviceNames = [
    "api-gateway",
    "user-service",
    "order-service",
    "payment-service",
    "notification-service",
    "analytics-worker",
    "ml-inference",
  ];

  const services: any[] = [];

  for (const clusterId of clusterIds) {
    const count = randomInt(3, 5);
    const shuffled = [...serviceNames].sort(() => Math.random() - 0.5).slice(0, count);

    for (const name of shuffled) {
      services.push({
        cluster_id: clusterId,
        name,
        env: randomEnv(),
        region: randomRegion(),
        requested_cpu: randomBetween(0.25, 4),
        requested_memory_mb: randomInt(256, 4096),
        replica_count: randomInt(1, 5),
        avg_cpu_7d: randomBetween(10, 60),
        avg_memory_7d: randomBetween(20, 70),
      });
    }
  }

  const { error } = await supabase.from("container_services").insert(services);
  if (error) throw new Error(`Failed to seed services: ${error.message}`);

  log(`  Created ${services.length} container services`);
}

async function seedLambdaFunctions(accountId: string): Promise<void> {
  log("Seeding Lambda functions...");

  const functions: any[] = [];

  const functionNames = [
    "process-order",
    "send-notification",
    "resize-image",
    "generate-report",
    "sync-data",
    "validate-payment",
    "transform-event",
    "archive-logs",
    "cleanup-temp",
    "health-check",
    "webhook-handler",
    "batch-processor",
  ];

  for (let i = 0; i < functionNames.length; i++) {
    const isWaste = i >= 9; // Last 3 are underutilized (waste pattern)

    functions.push({
      account_id: accountId,
      name: functionNames[i],
      env: randomEnv(),
      region: randomRegion(),
      memory_mb: isWaste ? pickRandom([1024, 2048, 3008]) : pickRandom([128, 256, 512]),
      timeout_seconds: randomInt(10, 300),
      provisioned_concurrency: isWaste ? randomInt(5, 20) : 0,
      invocations_7d: isWaste ? randomInt(0, 50) : randomInt(1000, 100000),
      avg_duration_ms_7d: randomBetween(50, 2000),
      estimated_monthly_cost: isWaste ? randomBetween(50, 200) : randomBetween(5, 50),
    });
  }

  const { error } = await supabase.from("lambda_functions").insert(functions);
  if (error) throw new Error(`Failed to seed functions: ${error.message}`);

  log(`  Created ${functions.length} Lambda functions (including 3 oversized/underutilized)`);
}

async function seedVolumes(accountId: string): Promise<{ attached: string[]; unattached: string[] }> {
  log("Seeding volumes...");

  // Get instance IDs for attachment
  const { data: instances } = await supabase
    .from("instances")
    .select("instance_id")
    .eq("account_id", accountId)
    .eq("state", "running")
    .limit(12);

  const runningInstanceIds = instances?.map((i) => i.instance_id) || [];

  const volumes: any[] = [];
  const now = new Date();
  const attachedIds: string[] = [];
  const unattachedIds: string[] = [];

  // Attached volumes
  for (let i = 0; i < 12; i++) {
    const volumeId = generateVolumeId();
    const sizeGib = pickRandom([20, 50, 100, 200, 500]);
    const volumeType = pickRandom(VOLUME_TYPES);

    attachedIds.push(volumeId);
    volumes.push({
      account_id: accountId,
      volume_id: volumeId,
      region: randomRegion(),
      size_gib: sizeGib,
      volume_type: volumeType,
      state: "in-use",
      attached_instance_id: runningInstanceIds[i % runningInstanceIds.length] || null,
      monthly_cost: sizeGib * 0.1, // Approximate $0.10/GB/month
      last_used_at: now.toISOString(),
      tags: { Environment: randomEnv(), Purpose: faker.word.noun() },
    });
  }

  // Unattached volumes (waste pattern)
  for (let i = 0; i < 6; i++) {
    const volumeId = generateVolumeId();
    const sizeGib = pickRandom([50, 100, 200, 500, 1000]);
    const lastUsed = new Date(now.getTime() - randomInt(30, 120) * 24 * 60 * 60 * 1000);

    unattachedIds.push(volumeId);
    volumes.push({
      account_id: accountId,
      volume_id: volumeId,
      region: randomRegion(),
      size_gib: sizeGib,
      volume_type: pickRandom(VOLUME_TYPES),
      state: "available",
      attached_instance_id: null,
      monthly_cost: sizeGib * 0.1,
      last_used_at: lastUsed.toISOString(),
      tags: { Environment: randomEnv(), OldProject: "deprecated" },
    });
  }

  const { error } = await supabase.from("volumes").insert(volumes);
  if (error) throw new Error(`Failed to seed volumes: ${error.message}`);

  log(`  Created ${volumes.length} volumes (including ${unattachedIds.length} unattached)`);
  return { attached: attachedIds, unattached: unattachedIds };
}

async function seedSnapshots(accountId: string, volumeIds: { attached: string[]; unattached: string[] }): Promise<void> {
  log("Seeding snapshots...");

  const snapshots: any[] = [];
  const now = new Date();

  // Snapshots from existing volumes
  for (const volumeId of [...volumeIds.attached, ...volumeIds.unattached.slice(0, 2)]) {
    const count = randomInt(1, 3);
    for (let i = 0; i < count; i++) {
      const sizeGib = randomInt(20, 500);
      const created = new Date(now.getTime() - randomInt(1, 90) * 24 * 60 * 60 * 1000);

      snapshots.push({
        account_id: accountId,
        snapshot_id: generateSnapshotId(),
        region: randomRegion(),
        source_volume_id: volumeId,
        size_gib: sizeGib,
        retention_policy: pickRandom(["daily", "weekly", "monthly", null]),
        monthly_cost: sizeGib * 0.05, // $0.05/GB/month
        tags: { Environment: randomEnv(), BackupType: "automated" },
        created_at: created.toISOString(),
      });
    }
  }

  // Orphaned snapshots (waste pattern) - source volume doesn't exist
  for (let i = 0; i < 4; i++) {
    const sizeGib = randomInt(50, 500);
    const created = new Date(now.getTime() - randomInt(60, 180) * 24 * 60 * 60 * 1000);

    snapshots.push({
      account_id: accountId,
      snapshot_id: generateSnapshotId(),
      region: randomRegion(),
      source_volume_id: generateVolumeId(), // Non-existent volume
      size_gib: sizeGib,
      retention_policy: null,
      monthly_cost: sizeGib * 0.05,
      tags: { Environment: "unknown", Status: "orphaned" },
      created_at: created.toISOString(),
    });
  }

  const { error } = await supabase.from("snapshots").insert(snapshots);
  if (error) throw new Error(`Failed to seed snapshots: ${error.message}`);

  log(`  Created ${snapshots.length} snapshots (including 4 orphaned)`);
}

async function seedS3Buckets(accountId: string): Promise<string[]> {
  log("Seeding S3 buckets...");

  const bucketNames = [
    "acme-prod-assets",
    "acme-staging-assets",
    "acme-logs-archive",
    "acme-ml-training-data",
    "acme-backups",
    "acme-analytics-output",
    "acme-temp-processing",
  ];

  const buckets = bucketNames.map((name) => ({
    account_id: accountId,
    name: `${name}-${faker.string.alphanumeric(8).toLowerCase()}`,
    env: name.includes("prod") ? "prod" : name.includes("staging") ? "staging" : "dev",
    region: randomRegion(),
    lifecycle_policy: Math.random() > 0.3 ? {
      rules: [
        { transition_to_ia_days: 30 },
        { transition_to_glacier_days: 90 },
        { expiration_days: Math.random() > 0.5 ? 365 : null },
      ],
    } : {},
    tags: { Environment: randomEnv(), CostCenter: faker.string.numeric(4) },
  }));

  const { data, error } = await supabase
    .from("s3_buckets")
    .insert(buckets)
    .select("id");

  if (error) throw new Error(`Failed to seed buckets: ${error.message}`);

  const ids = data.map((d) => d.id);
  log(`  Created ${ids.length} S3 buckets`);
  return ids;
}

async function seedS3BucketUsage(bucketIds: string[]): Promise<void> {
  log("Seeding S3 bucket daily usage...");

  const dates = generateDateRange(DAYS_OF_DATA);
  const usageRecords: any[] = [];

  for (const bucketId of bucketIds) {
    let baseStorageStandard = randomBetween(10, 1000);
    let baseStorageIa = randomBetween(0, 200);
    let baseStorageGlacier = randomBetween(0, 500);

    for (const date of dates) {
      // Slight growth trend
      baseStorageStandard *= 1 + randomBetween(-0.01, 0.03);
      baseStorageIa *= 1 + randomBetween(-0.005, 0.02);
      baseStorageGlacier *= 1 + randomBetween(0, 0.01);

      const requestsCount = randomInt(100, 100000);

      usageRecords.push({
        bucket_id: bucketId,
        date: formatDate(date),
        storage_gb_standard: Math.round(baseStorageStandard * 100) / 100,
        storage_gb_ia: Math.round(baseStorageIa * 100) / 100,
        storage_gb_glacier: Math.round(baseStorageGlacier * 100) / 100,
        requests_count: requestsCount,
        estimated_storage_cost: (baseStorageStandard * 0.023 + baseStorageIa * 0.0125 + baseStorageGlacier * 0.004),
        estimated_request_cost: requestsCount * 0.0000004,
      });
    }
  }

  // Insert in batches
  const batchSize = 500;
  for (let i = 0; i < usageRecords.length; i += batchSize) {
    const batch = usageRecords.slice(i, i + batchSize);
    const { error } = await supabase.from("s3_bucket_usage_daily").insert(batch);
    if (error) throw new Error(`Failed to seed bucket usage: ${error.message}`);
  }

  log(`  Created ${usageRecords.length} S3 usage records`);
}

async function seedRdsInstances(accountId: string): Promise<void> {
  log("Seeding RDS instances...");

  const instances: any[] = [];

  // Normal instances
  for (let i = 0; i < 3; i++) {
    const instanceClass = pickRandom(["db.t3.small", "db.t3.medium", "db.m5.large"]);

    instances.push({
      account_id: accountId,
      db_instance_id: generateDbInstanceId(),
      engine: pickRandom(["postgres", "mysql", "aurora-postgresql"]),
      instance_class: instanceClass,
      allocated_storage_gib: pickRandom([20, 50, 100]),
      env: pickRandom(["prod", "staging"]),
      region: randomRegion(),
      state: "available",
      hourly_cost: RDS_COSTS[instanceClass] || 0.05,
      storage_monthly_cost: randomBetween(5, 30),
      avg_cpu_7d: randomBetween(20, 60),
      avg_connections_7d: randomBetween(10, 100),
    });
  }

  // Oversized/underutilized instances (waste pattern)
  for (let i = 0; i < 2; i++) {
    const instanceClass = pickRandom(["db.m5.xlarge", "db.r5.large"]);

    instances.push({
      account_id: accountId,
      db_instance_id: generateDbInstanceId(),
      engine: "postgres",
      instance_class: instanceClass,
      allocated_storage_gib: pickRandom([200, 500]),
      env: "dev",
      region: randomRegion(),
      state: "available",
      hourly_cost: RDS_COSTS[instanceClass] || 0.2,
      storage_monthly_cost: randomBetween(20, 50),
      avg_cpu_7d: randomBetween(2, 8), // Very low utilization
      avg_connections_7d: randomBetween(1, 5),
    });
  }

  const { error } = await supabase.from("rds_instances").insert(instances);
  if (error) throw new Error(`Failed to seed RDS: ${error.message}`);

  log(`  Created ${instances.length} RDS instances (including 2 oversized)`);
}

async function seedCacheClusters(accountId: string): Promise<void> {
  log("Seeding cache clusters...");

  const clusters = [
    { name: "prod-session-cache", env: "prod", nodeType: "cache.m5.large", nodes: 3 },
    { name: "staging-cache", env: "staging", nodeType: "cache.t3.small", nodes: 1 },
    { name: "dev-cache", env: "dev", nodeType: "cache.t3.micro", nodes: 1 },
  ].map((c) => ({
    account_id: accountId,
    cluster_id: generateCacheClusterId(),
    engine: "redis",
    node_type: c.nodeType,
    num_nodes: c.nodes,
    env: c.env,
    region: randomRegion(),
    hourly_cost: (CACHE_COSTS[c.nodeType] || 0.02) * c.nodes,
    avg_cpu_7d: randomBetween(10, 50),
    avg_memory_7d: randomBetween(20, 70),
  }));

  const { error } = await supabase.from("cache_clusters").insert(clusters);
  if (error) throw new Error(`Failed to seed cache clusters: ${error.message}`);

  log(`  Created ${clusters.length} cache clusters`);
}

async function seedLoadBalancers(accountId: string): Promise<void> {
  log("Seeding load balancers...");

  const lbs = [
    { name: "prod-api-alb", type: "application", env: "prod" },
    { name: "prod-internal-nlb", type: "network", env: "prod" },
    { name: "staging-alb", type: "application", env: "staging" },
    { name: "legacy-clb", type: "classic", env: "prod" },
  ].map((lb) => {
    const region = randomRegion();
    return {
      account_id: accountId,
      lb_arn: generateLbArn(region, lb.name),
      name: lb.name,
      type: lb.type,
      env: lb.env,
      region,
      hourly_cost: lb.type === "network" ? 0.0225 : 0.0225,
      avg_request_count_7d: randomBetween(10000, 1000000),
    };
  });

  const { error } = await supabase.from("load_balancers").insert(lbs);
  if (error) throw new Error(`Failed to seed load balancers: ${error.message}`);

  log(`  Created ${lbs.length} load balancers`);
}

async function seedElasticIps(accountId: string): Promise<void> {
  log("Seeding Elastic IPs...");

  // Get some instance IDs for association
  const { data: instances } = await supabase
    .from("instances")
    .select("instance_id")
    .eq("account_id", accountId)
    .eq("state", "running")
    .limit(4);

  const instanceIds = instances?.map((i) => i.instance_id) || [];

  const eips: any[] = [];

  // Associated EIPs
  for (let i = 0; i < 4; i++) {
    eips.push({
      account_id: accountId,
      allocation_id: generateAllocationId(),
      public_ip: generatePublicIp(),
      associated_instance_id: instanceIds[i] || null,
      associated_lb_arn: null,
      state: "associated",
      hourly_cost: 0, // Free when associated
    });
  }

  // Unassociated EIPs (waste pattern - charged when not in use)
  for (let i = 0; i < 3; i++) {
    eips.push({
      account_id: accountId,
      allocation_id: generateAllocationId(),
      public_ip: generatePublicIp(),
      associated_instance_id: null,
      associated_lb_arn: null,
      state: "unassociated",
      hourly_cost: 0.005, // $0.005/hour when not associated
    });
  }

  const { error } = await supabase.from("elastic_ips").insert(eips);
  if (error) throw new Error(`Failed to seed Elastic IPs: ${error.message}`);

  log(`  Created ${eips.length} Elastic IPs (including 3 unassociated)`);
}

async function seedDataTransferDaily(accountId: string): Promise<void> {
  log("Seeding data transfer daily...");

  const dates = generateDateRange(DAYS_OF_DATA);
  const records: any[] = [];

  const transferPatterns = [
    { source: "us-east-1", dest: "us-west-2", direction: "cross-region", baseGb: 50 },
    { source: "us-east-1", dest: "us-east-1", direction: "cross-az", baseGb: 200 },
    { source: "us-east-1", dest: "internet", direction: "egress", baseGb: 500 },
    { source: "internet", dest: "us-east-1", direction: "ingress", baseGb: 100 },
    { source: "eu-west-1", dest: "us-east-1", direction: "cross-region", baseGb: 20 },
  ];

  for (const date of dates) {
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const weekendMultiplier = isWeekend ? 0.6 : 1.0;

    for (const pattern of transferPatterns) {
      const gbTransferred = pattern.baseGb * weekendMultiplier * randomBetween(0.8, 1.2);

      // Cost varies by transfer type
      let costPerGb = 0.01;
      if (pattern.direction === "egress") costPerGb = 0.09;
      else if (pattern.direction === "cross-region") costPerGb = 0.02;
      else if (pattern.direction === "cross-az") costPerGb = 0.01;

      records.push({
        account_id: accountId,
        date: formatDate(date),
        source_region: pattern.source,
        dest_region: pattern.dest,
        direction: pattern.direction,
        gb_transferred: Math.round(gbTransferred * 100) / 100,
        estimated_transfer_cost: Math.round(gbTransferred * costPerGb * 100) / 100,
      });
    }
  }

  const { error } = await supabase.from("data_transfer_daily").insert(records);
  if (error) throw new Error(`Failed to seed data transfer: ${error.message}`);

  log(`  Created ${records.length} data transfer records`);
}

async function seedManagedServices(accountId: string): Promise<void> {
  log("Seeding managed services...");

  const services = [
    { type: "opensearch", name: "prod-search", instanceType: "m5.large.search", nodes: 3 },
    { type: "opensearch", name: "analytics-search", instanceType: "r5.xlarge.search", nodes: 2 },
    { type: "sagemaker", name: "ml-endpoint", instanceType: "ml.m5.xlarge", nodes: 2 },
  ].map((s) => ({
    account_id: accountId,
    service_type: s.type,
    name: s.name,
    env: pickRandom(["prod", "staging"]),
    region: randomRegion(),
    instance_type: s.instanceType,
    node_count: s.nodes,
    hourly_cost: randomBetween(0.1, 1.5) * s.nodes,
    avg_cpu_7d: randomBetween(15, 60),
    avg_memory_7d: randomBetween(25, 70),
  }));

  const { error } = await supabase.from("managed_services").insert(services);
  if (error) throw new Error(`Failed to seed managed services: ${error.message}`);

  log(`  Created ${services.length} managed services`);
}

async function seedStreamingClusters(accountId: string): Promise<void> {
  log("Seeding streaming clusters...");

  const clusters = [
    { name: "events-stream", engine: "kinesis", shards: 4 },
    { name: "logs-stream", engine: "kinesis", shards: 2 },
    { name: "analytics-kafka", engine: "msk", shards: 6 },
  ].map((c) => ({
    account_id: accountId,
    name: c.name,
    engine: c.engine,
    env: pickRandom(["prod", "staging"]),
    region: randomRegion(),
    shard_count: c.shards,
    retention_hours: c.engine === "kafka" ? 168 : 24,
    provisioned_throughput_mbps: c.shards * 1,
    avg_usage_mbps_7d: c.shards * randomBetween(0.3, 0.8),
    hourly_cost: c.shards * (c.engine === "kafka" ? 0.15 : 0.015),
  }));

  const { error } = await supabase.from("streaming_clusters").insert(clusters);
  if (error) throw new Error(`Failed to seed streaming clusters: ${error.message}`);

  log(`  Created ${clusters.length} streaming clusters`);
}

async function seedLogGroups(accountId: string): Promise<string[]> {
  log("Seeding log groups...");

  const logGroupNames = [
    "/aws/lambda/process-order",
    "/aws/lambda/send-notification",
    "/aws/eks/production-eks/cluster",
    "/aws/rds/instance/prod-db/postgresql",
    "/aws/apigateway/prod-api",
    "/ecs/api-gateway",
    "/ecs/user-service",
    "/ecs/order-service",
    "/application/web-frontend",
    "/application/batch-jobs",
    "/system/security-audit",
    "/system/vpc-flow-logs",
  ];

  const groups = logGroupNames.map((name) => ({
    account_id: accountId,
    name,
    env: name.includes("prod") ? "prod" : randomEnv(),
    region: randomRegion(),
    retention_days: pickRandom([7, 14, 30, 60, 90, 365, null]),
    tags: { Environment: randomEnv(), Application: name.split("/")[2] || "system" },
  }));

  const { data, error } = await supabase
    .from("log_groups")
    .insert(groups)
    .select("id");

  if (error) throw new Error(`Failed to seed log groups: ${error.message}`);

  const ids = data.map((d) => d.id);
  log(`  Created ${ids.length} log groups`);
  return ids;
}

async function seedLogGroupUsage(logGroupIds: string[]): Promise<void> {
  log("Seeding log group daily usage...");

  const dates = generateDateRange(DAYS_OF_DATA);
  const usageRecords: any[] = [];

  for (const logGroupId of logGroupIds) {
    let baseIngestion = randomBetween(0.1, 10);
    let baseStorage = randomBetween(1, 50);

    for (const date of dates) {
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const dayMultiplier = isWeekend ? 0.5 : 1.0;

      const ingestedGb = baseIngestion * dayMultiplier * randomBetween(0.8, 1.3);
      baseStorage += ingestedGb * 0.9; // Most ingested data persists

      usageRecords.push({
        log_group_id: logGroupId,
        date: formatDate(date),
        ingested_gb: Math.round(ingestedGb * 1000) / 1000,
        stored_gb: Math.round(baseStorage * 100) / 100,
        estimated_ingestion_cost: Math.round(ingestedGb * 0.5 * 100) / 100, // $0.50/GB
        estimated_storage_cost: Math.round(baseStorage * 0.03 * 100) / 100, // $0.03/GB/month
      });
    }
  }

  // Insert in batches
  const batchSize = 500;
  for (let i = 0; i < usageRecords.length; i += batchSize) {
    const batch = usageRecords.slice(i, i + batchSize);
    const { error } = await supabase.from("log_group_usage_daily").insert(batch);
    if (error) throw new Error(`Failed to seed log usage: ${error.message}`);
  }

  log(`  Created ${usageRecords.length} log usage records`);
}

async function seedCommitments(accountId: string): Promise<string[]> {
  log("Seeding commitments...");

  const now = new Date();
  const commitments = [
    {
      type: "reserved_instance",
      scope: "ec2:m5.large:us-east-1",
      term: 12,
      hourlyAmount: 0.05,
      startOffset: -180, // Started 6 months ago
    },
    {
      type: "savings_plan",
      scope: "compute",
      term: 36,
      hourlyAmount: 0.20,
      startOffset: -365, // Started 1 year ago
    },
    {
      type: "reserved_instance",
      scope: "rds:db.m5.large:us-east-1",
      term: 12,
      hourlyAmount: 0.08,
      startOffset: -90, // Started 3 months ago
    },
  ].map((c) => {
    const startDate = new Date(now.getTime() + c.startOffset * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + c.term * 30 * 24 * 60 * 60 * 1000);

    return {
      account_id: accountId,
      commitment_type: c.type,
      scope: c.scope,
      term_months: c.term,
      hourly_commitment_amount: c.hourlyAmount,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
    };
  });

  const { data, error } = await supabase
    .from("commitments")
    .insert(commitments)
    .select("id, hourly_commitment_amount");

  if (error) throw new Error(`Failed to seed commitments: ${error.message}`);

  const ids = data.map((d) => d.id);
  log(`  Created ${ids.length} commitments`);
  return ids;
}

async function seedCommitmentUtilization(commitmentIds: string[]): Promise<void> {
  log("Seeding commitment utilization daily...");

  const dates = generateDateRange(DAYS_OF_DATA);
  const records: any[] = [];

  // Get commitment details
  const { data: commitments } = await supabase
    .from("commitments")
    .select("id, hourly_commitment_amount")
    .in("id", commitmentIds);

  if (!commitments) return;

  for (const commitment of commitments) {
    // Last commitment is underutilized (waste pattern)
    const isUnderutilized = commitment.id === commitmentIds[commitmentIds.length - 1];

    for (const date of dates) {
      const utilizationPercent = isUnderutilized
        ? randomBetween(35, 58) // Under 60% utilization
        : randomBetween(70, 95);

      const actualUsage = commitment.hourly_commitment_amount * (utilizationPercent / 100);
      const savings = commitment.hourly_commitment_amount * 0.3 * (utilizationPercent / 100);

      records.push({
        commitment_id: commitment.id,
        date: formatDate(date),
        actual_hourly_usage_equivalent: Math.round(actualUsage * 10000) / 10000,
        utilization_percent: Math.round(utilizationPercent * 100) / 100,
        estimated_savings_vs_ondemand: Math.round(savings * 24 * 100) / 100,
      });
    }
  }

  const { error } = await supabase.from("commitment_utilization_daily").insert(records);
  if (error) throw new Error(`Failed to seed utilization: ${error.message}`);

  log(`  Created ${records.length} commitment utilization records (including 1 underutilized)`);
}

async function seedResourceTags(accountId: string): Promise<void> {
  log("Seeding resource tags...");

  // Get various resource IDs
  const [instancesRes, volumesRes, bucketsRes] = await Promise.all([
    supabase.from("instances").select("instance_id").eq("account_id", accountId).limit(10),
    supabase.from("volumes").select("volume_id").eq("account_id", accountId).limit(10),
    supabase.from("s3_buckets").select("name").eq("account_id", accountId).limit(5),
  ]);

  const tags: any[] = [];
  const teams = ["platform", "data", "ml", "frontend", "backend"];
  const costCenters = ["CC001", "CC002", "CC003", "CC004"];

  // Tag instances
  for (const instance of instancesRes.data || []) {
    tags.push(
      { account_id: accountId, resource_type: "instance", resource_id: instance.instance_id, key: "Team", value: pickRandom(teams) },
      { account_id: accountId, resource_type: "instance", resource_id: instance.instance_id, key: "CostCenter", value: pickRandom(costCenters) }
    );
  }

  // Tag volumes
  for (const volume of volumesRes.data || []) {
    tags.push(
      { account_id: accountId, resource_type: "volume", resource_id: volume.volume_id, key: "Team", value: pickRandom(teams) }
    );
  }

  // Tag S3 buckets
  for (const bucket of bucketsRes.data || []) {
    tags.push(
      { account_id: accountId, resource_type: "s3_bucket", resource_id: bucket.name, key: "Team", value: pickRandom(teams) },
      { account_id: accountId, resource_type: "s3_bucket", resource_id: bucket.name, key: "DataClassification", value: pickRandom(["public", "internal", "confidential"]) }
    );
  }

  const { error } = await supabase.from("resource_tags").insert(tags);
  if (error) throw new Error(`Failed to seed resource tags: ${error.message}`);

  log(`  Created ${tags.length} resource tags`);
}

async function seedMetricsDaily(accountId: string): Promise<void> {
  log("Seeding metrics daily...");

  const dates = generateDateRange(DAYS_OF_DATA);
  const records: any[] = [];

  // Get some instances for metrics
  const { data: instances } = await supabase
    .from("instances")
    .select("instance_id")
    .eq("account_id", accountId)
    .limit(10);

  for (const instance of instances || []) {
    for (const date of dates) {
      records.push({
        account_id: accountId,
        resource_type: "instance",
        resource_id: instance.instance_id,
        date: formatDate(date),
        metric_payload: {
          cpu_avg: randomBetween(5, 80),
          cpu_max: randomBetween(50, 100),
          memory_avg: randomBetween(20, 85),
          network_in_mb: randomBetween(10, 1000),
          network_out_mb: randomBetween(10, 1000),
          disk_read_ops: randomInt(100, 10000),
          disk_write_ops: randomInt(100, 10000),
        },
        estimated_daily_cost: randomBetween(0.5, 10),
      });
    }
  }

  // Insert in batches
  const batchSize = 500;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from("metrics_daily").insert(batch);
    if (error) throw new Error(`Failed to seed metrics: ${error.message}`);
  }

  log(`  Created ${records.length} metrics daily records`);
}

async function seedApiClients(accountId: string): Promise<void> {
  log("Seeding API clients...");

  const clients = [
    { name: "terraform-automation", scopes: ["read:*", "write:*"] },
    { name: "monitoring-readonly", scopes: ["read:instances", "read:metrics"] },
    { name: "cost-analyzer", scopes: ["read:*"] },
  ].map((c) => ({
    account_id: accountId,
    name: c.name,
    access_key_id: `AKIA${faker.string.alphanumeric(16).toUpperCase()}`,
    secret_key_hash: faker.string.alphanumeric(64),
    scopes: c.scopes,
    last_used_at: Math.random() > 0.3 ? new Date().toISOString() : null,
  }));

  const { error } = await supabase.from("api_clients").insert(clients);
  if (error) throw new Error(`Failed to seed API clients: ${error.message}`);

  log(`  Created ${clients.length} API clients`);
}

// Main execution
async function main(): Promise<void> {
  console.log("\n========================================");
  console.log("  AWS Cloud Environment Seed Script");
  console.log("========================================\n");

  try {
    // Clear existing data
    await clearAllData();

    // Seed in FK dependency order
    const accountId = await seedCloudAccount();

    const asgIds = await seedAutoscalingGroups(accountId);
    await seedInstances(accountId, asgIds);

    const clusterIds = await seedContainerClusters(accountId);
    await seedContainerNodes(clusterIds);
    await seedContainerServices(clusterIds);

    await seedLambdaFunctions(accountId);

    const volumeIds = await seedVolumes(accountId);
    await seedSnapshots(accountId, volumeIds);

    const bucketIds = await seedS3Buckets(accountId);
    await seedS3BucketUsage(bucketIds);

    await seedRdsInstances(accountId);
    await seedCacheClusters(accountId);

    await seedLoadBalancers(accountId);
    await seedElasticIps(accountId);
    await seedDataTransferDaily(accountId);

    await seedManagedServices(accountId);
    await seedStreamingClusters(accountId);

    const logGroupIds = await seedLogGroups(accountId);
    await seedLogGroupUsage(logGroupIds);

    const commitmentIds = await seedCommitments(accountId);
    await seedCommitmentUtilization(commitmentIds);

    await seedResourceTags(accountId);
    await seedMetricsDaily(accountId);

    await seedApiClients(accountId);

    console.log("\n========================================");
    console.log("  Seeding completed successfully!");
    console.log("========================================\n");

    console.log("Waste patterns seeded for AI detection:");
    console.log("  - 5 idle instances (CPU < 5%)");
    console.log("  - 3 stopped instances");
    console.log("  - 6 unattached volumes");
    console.log("  - 4 orphaned snapshots");
    console.log("  - 3 unassociated Elastic IPs");
    console.log("  - 2 oversized RDS instances");
    console.log("  - 3 oversized Lambda functions");
    console.log("  - 1 underutilized commitment (<60%)");
    console.log("");

  } catch (error) {
    console.error("\nSeeding failed:", error);
    process.exit(1);
  }
}

main();
