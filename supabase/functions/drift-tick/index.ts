/**
 * drift-tick: AWS Environment Drift Simulator
 *
 * This Supabase Edge Function simulates realistic cloud environment drift
 * for a FinOps AI platform. Each execution simulates ONE "virtual day" of
 * activity for every cloud account.
 *
 * Responsibilities:
 * - Append new history rows to *_daily metrics tables (never modify past rows)
 * - Update "live" utilization fields on resources
 * - Occasionally introduce realistic "startup mess" scenarios
 * - Respect current world state (including agent modifications)
 */

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ============================================================================
// Types
// ============================================================================

interface Instance {
  id: string
  account_id: string
  instance_id: string
  instance_type: string
  env: string
  region: string
  state: string
  hourly_cost: number
  autoscaling_group_id: string | null
}

interface S3Bucket {
  id: string
  account_id: string
  name: string
  env: string
  lifecycle_policy: Record<string, unknown> | null
}

interface LogGroup {
  id: string
  account_id: string
  name: string
  env: string
  retention_days: number | null
}

interface AutoscalingGroup {
  id: string
  account_id: string
  name: string
  desired_capacity: number
  instance_type: string
  env: string
  region: string
}

interface ProcessResult {
  simulatedDate: string | null
  metrics: number
  s3Usage: number
  logUsage: number
  dataTransfer: number
  scenariosTriggered: string[]
}

// ============================================================================
// Constants
// ============================================================================

const PRICING = {
  S3_STANDARD_PER_GB: 0.023 / 30,
  S3_IA_PER_GB: 0.0125 / 30,
  S3_GLACIER_PER_GB: 0.004 / 30,
  LOG_INGEST_PER_GB: 0.50,
  LOG_STORAGE_PER_GB: 0.03 / 30,
  DATA_TRANSFER_CROSS_REGION: 0.02,
  DATA_TRANSFER_EGRESS: 0.09,
}

const INSTANCE_COSTS: Record<string, number> = {
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

const REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1']

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1))
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function applyRandomWalk(
  baseValue: number,
  minDeltaPercent: number,
  maxDeltaPercent: number,
  biasPercent: number = 0
): number {
  const delta = randomBetween(minDeltaPercent, maxDeltaPercent) / 100
  const biasMultiplier = 1 + biasPercent / 100
  return Math.max(0, baseValue * (1 + delta) * biasMultiplier)
}

function generateInstanceId(): string {
  const hex = Array.from({ length: 17 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
  return `i-${hex}`
}

// ============================================================================
// Date Determination
// ============================================================================

async function determineNextVirtualDay(
  supabase: SupabaseClient,
  accountId: string
): Promise<{ nextDate: Date; lastDate: Date } | null> {
  const { data, error } = await supabase
    .from('metrics_daily')
    .select('date')
    .eq('account_id', accountId)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    console.log(`No metrics history for account ${accountId}, skipping`)
    return null
  }

  const lastDate = new Date(data.date)
  const nextDate = addDays(lastDate, 1)

  return { nextDate, lastDate }
}

// ============================================================================
// Instance Cost Drift
// ============================================================================

async function driftInstanceCosts(
  supabase: SupabaseClient,
  accountId: string,
  nextDate: Date,
  lastDate: Date
): Promise<number> {
  const dateStr = formatDate(nextDate)
  const lastDateStr = formatDate(lastDate)
  const weekend = isWeekend(nextDate)

  // Get running instances
  const { data: instances, error: instError } = await supabase
    .from('instances')
    .select('id, account_id, instance_id, instance_type, env, region, state, hourly_cost')
    .eq('account_id', accountId)
    .eq('state', 'running')

  if (instError || !instances?.length) {
    return 0
  }

  // Get yesterday's costs for each instance
  const instanceIds = instances.map((i: Instance) => i.instance_id)
  const { data: yesterdayCosts } = await supabase
    .from('metrics_daily')
    .select('resource_id, estimated_daily_cost')
    .eq('account_id', accountId)
    .eq('resource_type', 'instances')
    .eq('date', lastDateStr)
    .in('resource_id', instanceIds)

  const costMap = new Map(
    (yesterdayCosts || []).map((c: { resource_id: string; estimated_daily_cost: number }) => [
      c.resource_id,
      c.estimated_daily_cost,
    ])
  )

  // Generate new daily metrics
  const metricsRows = instances.map((instance: Instance) => {
    const baseCost =
      costMap.get(instance.instance_id) ||
      (instance.hourly_cost || INSTANCE_COSTS[instance.instance_type] || 0.1) * 24

    // Random walk: -3% to +5%
    let newCost = applyRandomWalk(baseCost, -3, 5)

    // Prod bias: extra +2% growth
    if (instance.env === 'prod') {
      newCost = applyRandomWalk(newCost, 0, 0, 2)
    }

    // Weekend adjustment for non-prod
    if (weekend && instance.env !== 'prod') {
      newCost *= randomBetween(0.7, 0.85)
    }

    return {
      account_id: accountId,
      resource_type: 'instances',
      resource_id: instance.instance_id,
      date: dateStr,
      metric_payload: {
        cpu_avg: randomBetween(10, 70),
        memory_avg: randomBetween(20, 80),
        instance_type: instance.instance_type,
        env: instance.env,
      },
      estimated_daily_cost: Math.round(newCost * 10000) / 10000,
    }
  })

  // Insert with conflict handling
  const { error } = await supabase
    .from('metrics_daily')
    .upsert(metricsRows, { onConflict: 'resource_type,resource_id,date', ignoreDuplicates: true })

  if (error) {
    console.error('Error inserting metrics_daily:', error)
    throw error
  }

  return metricsRows.length
}

// ============================================================================
// S3 Usage Drift
// ============================================================================

async function driftS3Usage(
  supabase: SupabaseClient,
  accountId: string,
  nextDate: Date,
  lastDate: Date
): Promise<number> {
  const dateStr = formatDate(nextDate)
  const lastDateStr = formatDate(lastDate)

  // Get all buckets
  const { data: buckets, error: bucketError } = await supabase
    .from('s3_buckets')
    .select('id, account_id, name, env, lifecycle_policy')
    .eq('account_id', accountId)

  if (bucketError || !buckets?.length) {
    return 0
  }

  // Get yesterday's usage
  const bucketIds = buckets.map((b: S3Bucket) => b.id)
  const { data: yesterdayUsage } = await supabase
    .from('s3_bucket_usage_daily')
    .select('bucket_id, storage_gb_standard, storage_gb_ia, storage_gb_glacier')
    .eq('date', lastDateStr)
    .in('bucket_id', bucketIds)

  const usageMap = new Map(
    (yesterdayUsage || []).map((u: { bucket_id: string; storage_gb_standard: number; storage_gb_ia: number; storage_gb_glacier: number }) => [
      u.bucket_id,
      u,
    ])
  )

  const usageRows = buckets.map((bucket: S3Bucket) => {
    const yesterday = usageMap.get(bucket.id) || {
      storage_gb_standard: randomBetween(50, 500),
      storage_gb_ia: 0,
      storage_gb_glacier: 0,
    }

    // Daily growth rate
    const growthRate = bucket.env === 'prod' ? randomBetween(0.01, 0.03) : randomBetween(0.003, 0.015)

    let standardGb = yesterday.storage_gb_standard * (1 + growthRate)
    let iaGb = yesterday.storage_gb_ia
    let glacierGb = yesterday.storage_gb_glacier

    // Lifecycle policy transitions
    const hasLifecycle =
      bucket.lifecycle_policy && Object.keys(bucket.lifecycle_policy).length > 0

    if (hasLifecycle) {
      // Move 0.5% from standard to IA
      const toIa = standardGb * 0.005
      standardGb -= toIa
      iaGb += toIa

      // Move 0.3% from IA to Glacier
      const toGlacier = iaGb * 0.003
      iaGb -= toGlacier
      glacierGb += toGlacier
    }

    const storageCost =
      standardGb * PRICING.S3_STANDARD_PER_GB +
      iaGb * PRICING.S3_IA_PER_GB +
      glacierGb * PRICING.S3_GLACIER_PER_GB

    const requestsCost = randomInt(100, 100000) * 0.0000004

    return {
      bucket_id: bucket.id,
      date: dateStr,
      storage_gb_standard: Math.round(standardGb * 100) / 100,
      storage_gb_ia: Math.round(iaGb * 100) / 100,
      storage_gb_glacier: Math.round(glacierGb * 100) / 100,
      requests_count: randomInt(100, 100000),
      estimated_storage_cost: Math.round(storageCost * 10000) / 10000,
      estimated_request_cost: Math.round(requestsCost * 10000) / 10000,
    }
  })

  const { error } = await supabase
    .from('s3_bucket_usage_daily')
    .upsert(usageRows, { onConflict: 'bucket_id,date', ignoreDuplicates: true })

  if (error) {
    console.error('Error inserting s3_bucket_usage_daily:', error)
    throw error
  }

  return usageRows.length
}

// ============================================================================
// Log Usage Drift
// ============================================================================

async function driftLogUsage(
  supabase: SupabaseClient,
  accountId: string,
  nextDate: Date,
  lastDate: Date
): Promise<number> {
  const dateStr = formatDate(nextDate)
  const lastDateStr = formatDate(lastDate)
  const weekend = isWeekend(nextDate)

  // Get all log groups
  const { data: logGroups, error: lgError } = await supabase
    .from('log_groups')
    .select('id, account_id, name, env, retention_days')
    .eq('account_id', accountId)

  if (lgError || !logGroups?.length) {
    return 0
  }

  // Get yesterday's usage
  const logGroupIds = logGroups.map((lg: LogGroup) => lg.id)
  const { data: yesterdayUsage } = await supabase
    .from('log_group_usage_daily')
    .select('log_group_id, ingested_gb, stored_gb')
    .eq('date', lastDateStr)
    .in('log_group_id', logGroupIds)

  const usageMap = new Map(
    (yesterdayUsage || []).map((u: { log_group_id: string; ingested_gb: number; stored_gb: number }) => [u.log_group_id, u])
  )

  // Retention caps
  const retentionCaps: Record<number, number> = {
    7: 20,
    14: 35,
    30: 60,
    60: 120,
    90: 200,
  }

  const usageRows = logGroups.map((lg: LogGroup) => {
    const yesterday = usageMap.get(lg.id) || { ingested_gb: 0, stored_gb: 0 }

    // Daily ingest
    let ingestedGb = lg.env === 'prod' ? randomBetween(0.5, 3) : randomBetween(0.1, 0.8)

    // Weekend reduction
    if (weekend && lg.env !== 'preview') {
      ingestedGb *= 0.7
    }

    // Calculate stored
    let storedGb = yesterday.stored_gb + ingestedGb

    // Apply retention cap
    if (lg.retention_days) {
      const cap = retentionCaps[lg.retention_days] || lg.retention_days * 2
      storedGb = Math.min(storedGb, cap)
    }

    const ingestCost = ingestedGb * PRICING.LOG_INGEST_PER_GB
    const storageCost = storedGb * PRICING.LOG_STORAGE_PER_GB

    return {
      log_group_id: lg.id,
      date: dateStr,
      ingested_gb: Math.round(ingestedGb * 1000) / 1000,
      stored_gb: Math.round(storedGb * 100) / 100,
      estimated_ingestion_cost: Math.round(ingestCost * 100) / 100,
      estimated_storage_cost: Math.round(storageCost * 100) / 100,
    }
  })

  const { error } = await supabase
    .from('log_group_usage_daily')
    .upsert(usageRows, { onConflict: 'log_group_id,date', ignoreDuplicates: true })

  if (error) {
    console.error('Error inserting log_group_usage_daily:', error)
    throw error
  }

  return usageRows.length
}

// ============================================================================
// Data Transfer Drift
// ============================================================================

async function driftDataTransfer(
  supabase: SupabaseClient,
  accountId: string,
  nextDate: Date
): Promise<number> {
  const dateStr = formatDate(nextDate)

  const transferRecords = [
    {
      account_id: accountId,
      date: dateStr,
      source_region: 'us-east-1',
      dest_region: 'us-west-2',
      direction: 'cross-region',
      gb_transferred: Math.round(randomBetween(5, 50) * 100) / 100,
      estimated_transfer_cost: 0,
    },
    {
      account_id: accountId,
      date: dateStr,
      source_region: 'us-east-1',
      dest_region: 'internet',
      direction: 'egress',
      gb_transferred: Math.round(randomBetween(20, 200) * 100) / 100,
      estimated_transfer_cost: 0,
    },
    {
      account_id: accountId,
      date: dateStr,
      source_region: 'us-east-1',
      dest_region: 'us-east-1',
      direction: 'cross-az',
      gb_transferred: Math.round(randomBetween(100, 500) * 100) / 100,
      estimated_transfer_cost: 0,
    },
  ]

  // Calculate costs
  transferRecords.forEach((r) => {
    if (r.direction === 'egress') {
      r.estimated_transfer_cost =
        Math.round(r.gb_transferred * PRICING.DATA_TRANSFER_EGRESS * 100) / 100
    } else if (r.direction === 'cross-region') {
      r.estimated_transfer_cost =
        Math.round(r.gb_transferred * PRICING.DATA_TRANSFER_CROSS_REGION * 100) / 100
    } else {
      r.estimated_transfer_cost = Math.round(r.gb_transferred * 0.01 * 100) / 100
    }
  })

  const { error } = await supabase.from('data_transfer_daily').insert(transferRecords)

  if (error) {
    console.error('Error inserting data_transfer_daily:', error)
    throw error
  }

  return transferRecords.length
}

// ============================================================================
// Live Utilization Update
// ============================================================================

async function updateLiveUtilization(
  supabase: SupabaseClient,
  accountId: string,
  nextDate: Date
): Promise<void> {
  const weekend = isWeekend(nextDate)

  // Get running instances
  const { data: instances, error: instError } = await supabase
    .from('instances')
    .select('id, env, state')
    .eq('account_id', accountId)
    .eq('state', 'running')

  if (instError || !instances?.length) {
    return
  }

  // Update each instance's live metrics
  for (const instance of instances) {
    let cpu: number
    let memory: number

    if (instance.env === 'prod') {
      // Prod: medium-high usage with small fluctuations
      cpu = randomBetween(40, 70)
      memory = randomBetween(50, 80)
    } else if (instance.env === 'preview') {
      // Preview: starts high, drops to very low
      cpu = randomBetween(2, 15)
      memory = randomBetween(10, 30)
    } else {
      // Dev/staging: lower usage, near zero on weekends
      cpu = weekend ? randomBetween(1, 10) : randomBetween(15, 45)
      memory = weekend ? randomBetween(5, 20) : randomBetween(20, 50)
    }

    await supabase
      .from('instances')
      .update({
        current_cpu: Math.round(cpu * 100) / 100,
        current_memory: Math.round(memory * 100) / 100,
        updated_at: new Date().toISOString(),
      })
      .eq('id', instance.id)
  }

  // Update ASG utilization
  const { data: asgs } = await supabase
    .from('autoscaling_groups')
    .select('id')
    .eq('account_id', accountId)

  if (asgs?.length) {
    for (const asg of asgs) {
      await supabase
        .from('autoscaling_groups')
        .update({
          current_utilization: Math.round(randomBetween(30, 70) * 100) / 100,
          updated_at: new Date().toISOString(),
        })
        .eq('id', asg.id)
    }
  }
}

// ============================================================================
// Startup Mess Scenarios
// ============================================================================

async function logResourceChangeEvent(
  supabase: SupabaseClient,
  accountId: string,
  resourceType: string,
  resourceId: string,
  fieldName: string,
  oldValue: string | null,
  newValue: string
): Promise<void> {
  await supabase.from('resource_change_events').insert({
    account_id: accountId,
    resource_type: resourceType,
    resource_id: resourceId,
    change_source: 'drift_engine',
    field_name: fieldName,
    old_value: oldValue,
    new_value: newValue,
  })
}

async function createForgottenPreviewEnvironment(
  supabase: SupabaseClient,
  accountId: string
): Promise<string | null> {
  // 5-10% probability
  if (Math.random() > 0.08) {
    return null
  }

  const previewId = `preview-${Date.now()}`
  const region = pickRandom(REGIONS)
  const instanceType = pickRandom(['t3.medium', 'm5.large'])
  const desiredCapacity = randomInt(4, 8)

  // Create ASG
  const { data: asg, error: asgError } = await supabase
    .from('autoscaling_groups')
    .insert({
      account_id: accountId,
      name: `${previewId}-asg`,
      min_size: 0,
      max_size: 10,
      desired_capacity: desiredCapacity,
      instance_type: instanceType,
      env: 'preview',
      region: region,
      optimization_policy: 'auto_safe',
    })
    .select('id')
    .single()

  if (asgError) {
    console.error('Failed to create preview ASG:', asgError)
    return null
  }

  // Create instances for the ASG
  const instances = Array.from({ length: desiredCapacity }, () => ({
    account_id: accountId,
    instance_id: generateInstanceId(),
    name: `${previewId}-instance`,
    instance_type: instanceType,
    env: 'preview',
    region: region,
    state: 'running',
    autoscaling_group_id: asg.id,
    hourly_cost: INSTANCE_COSTS[instanceType] || 0.1,
    avg_cpu_7d: randomBetween(5, 30),
    current_cpu: randomBetween(40, 80), // Initially busy
    current_memory: randomBetween(30, 60),
    optimization_policy: 'auto_safe',
    tags: { preview_id: previewId, created_by: 'drift_engine' },
  }))

  const { error: instError } = await supabase.from('instances').insert(instances)

  if (instError) {
    console.error('Failed to create preview instances:', instError)
    return null
  }

  // Create a log group for the preview
  await supabase.from('log_groups').insert({
    account_id: accountId,
    name: `/preview/${previewId}/application`,
    env: 'preview',
    region: region,
    retention_days: 7,
    optimization_policy: 'auto_safe',
    tags: { preview_id: previewId },
  })

  // Log the change
  await logResourceChangeEvent(
    supabase,
    accountId,
    'autoscaling_group',
    asg.id,
    'created',
    null,
    `Preview environment ${previewId} with ${desiredCapacity} instances`
  )

  return `Created preview environment ${previewId} with ${desiredCapacity} instances`
}

async function overProvisionRandomAsg(
  supabase: SupabaseClient,
  accountId: string
): Promise<string | null> {
  // 5-10% probability
  if (Math.random() > 0.08) {
    return null
  }

  // Get non-prod ASGs
  const { data: asgs, error } = await supabase
    .from('autoscaling_groups')
    .select('id, name, desired_capacity, env')
    .eq('account_id', accountId)
    .neq('env', 'prod')

  if (error || !asgs?.length) {
    return null
  }

  const asg = pickRandom(asgs) as AutoscalingGroup
  const increase = randomInt(1, 2)
  const newCapacity = asg.desired_capacity + increase

  const { error: updateError } = await supabase
    .from('autoscaling_groups')
    .update({
      desired_capacity: newCapacity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', asg.id)

  if (updateError) {
    console.error('Failed to over-provision ASG:', updateError)
    return null
  }

  await logResourceChangeEvent(
    supabase,
    accountId,
    'autoscaling_group',
    asg.id,
    'desired_capacity',
    String(asg.desired_capacity),
    String(newCapacity)
  )

  return `Over-provisioned ASG ${asg.name}: ${asg.desired_capacity} → ${newCapacity}`
}

// ============================================================================
// Safe Auto-Act Waste Scenarios
// These create opportunities for the AI agent to auto-optimize safely
// ============================================================================

/**
 * Creates an idle CI runner instance that finished its job but wasn't terminated.
 * Safe Auto-Act can terminate these without human approval.
 */
async function createIdleCIRunner(
  supabase: SupabaseClient,
  accountId: string
): Promise<string | null> {
  // 6% probability
  if (Math.random() > 0.06) {
    return null
  }

  const region = pickRandom(REGIONS)
  const instanceType = pickRandom(['t3.medium', 't3.large', 'c5.large'])
  const runnerId = `ci-runner-${Date.now()}`

  const { data: instance, error } = await supabase
    .from('instances')
    .insert({
      account_id: accountId,
      instance_id: generateInstanceId(),
      name: runnerId,
      instance_type: instanceType,
      env: 'ci',
      region: region,
      state: 'running',
      hourly_cost: INSTANCE_COSTS[instanceType] || 0.1,
      current_cpu: randomBetween(0, 3), // Idle - job finished
      current_memory: randomBetween(5, 15),
      avg_cpu_7d: randomBetween(2, 10),
      optimization_policy: 'auto_safe', // Safe to auto-terminate
      tags: {
        purpose: 'ci_runner',
        created_by: 'drift_engine',
        job_status: 'completed',
        idle_since: new Date().toISOString(),
      },
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create idle CI runner:', error)
    return null
  }

  await logResourceChangeEvent(
    supabase,
    accountId,
    'instance',
    instance.id,
    'created',
    null,
    `Idle CI runner ${runnerId} (job completed, should be terminated)`
  )

  return `Created idle CI runner ${runnerId} with 0-3% CPU (auto_safe)`
}

/**
 * Creates an S3 bucket without lifecycle policy - candidate for tiering optimization.
 * Safe Auto-Act can add lifecycle policies to move old data to IA/Glacier.
 */
async function createUnoptimizedS3Bucket(
  supabase: SupabaseClient,
  accountId: string
): Promise<string | null> {
  // 5% probability
  if (Math.random() > 0.05) {
    return null
  }

  const bucketName = `logs-archive-${Date.now()}`
  const region = pickRandom(REGIONS)

  const { data: bucket, error } = await supabase
    .from('s3_buckets')
    .insert({
      account_id: accountId,
      name: bucketName,
      env: pickRandom(['dev', 'staging']),
      region: region,
      lifecycle_policy: null, // No lifecycle - waste!
      versioning_enabled: false,
      optimization_policy: 'auto_safe',
      tags: {
        purpose: 'log_archive',
        created_by: 'drift_engine',
        needs_lifecycle: 'true',
      },
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create unoptimized S3 bucket:', error)
    return null
  }

  // Add initial storage (all in Standard tier - inefficient)
  const storageGb = randomBetween(100, 500)
  await supabase.from('s3_bucket_usage_daily').insert({
    bucket_id: bucket.id,
    date: new Date().toISOString().split('T')[0],
    storage_gb_standard: storageGb,
    storage_gb_ia: 0, // Should have some data here
    storage_gb_glacier: 0, // Should have some data here
    requests_count: randomInt(100, 1000),
    estimated_storage_cost: storageGb * PRICING.S3_STANDARD_PER_GB,
    estimated_request_cost: 0.01,
  })

  await logResourceChangeEvent(
    supabase,
    accountId,
    's3_bucket',
    bucket.id,
    'created',
    null,
    `S3 bucket ${bucketName} without lifecycle policy (${storageGb.toFixed(0)} GB in Standard)`
  )

  return `Created S3 bucket ${bucketName} without lifecycle policy (${storageGb.toFixed(0)} GB wasted in Standard tier)`
}

/**
 * Creates a log group with no retention (never expires) or excessive retention.
 * Safe Auto-Act can set appropriate retention to reduce storage costs.
 */
async function createLogGroupWithoutRetention(
  supabase: SupabaseClient,
  accountId: string
): Promise<string | null> {
  // 5% probability
  if (Math.random() > 0.05) {
    return null
  }

  const env = pickRandom(['dev', 'staging', 'preview'])
  const logGroupName = `/aws/lambda/${env}-function-${Date.now()}`
  const region = pickRandom(REGIONS)

  const { data: logGroup, error } = await supabase
    .from('log_groups')
    .insert({
      account_id: accountId,
      name: logGroupName,
      env: env,
      region: region,
      retention_days: null, // Never expires - waste!
      optimization_policy: 'auto_safe',
      tags: {
        purpose: 'lambda_logs',
        created_by: 'drift_engine',
        needs_retention: 'true',
      },
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create log group without retention:', error)
    return null
  }

  // Add accumulated logs (expensive without retention)
  const storedGb = randomBetween(50, 200)
  await supabase.from('log_group_usage_daily').insert({
    log_group_id: logGroup.id,
    date: new Date().toISOString().split('T')[0],
    ingested_gb: randomBetween(0.5, 2),
    stored_gb: storedGb, // Large because no retention!
    estimated_ingestion_cost: 1.0,
    estimated_storage_cost: storedGb * PRICING.LOG_STORAGE_PER_GB,
  })

  await logResourceChangeEvent(
    supabase,
    accountId,
    'log_group',
    logGroup.id,
    'created',
    null,
    `Log group ${logGroupName} with no retention (${storedGb.toFixed(0)} GB accumulated)`
  )

  return `Created log group ${logGroupName} with no retention policy (${storedGb.toFixed(0)} GB accumulated)`
}

/**
 * Creates a dev/staging instance that's running during off-hours.
 * Safe Auto-Act can schedule these to stop nights/weekends.
 */
async function createOffHoursDevInstance(
  supabase: SupabaseClient,
  accountId: string,
  simulatedDate: Date
): Promise<string | null> {
  // Only trigger on weekends or "night hours" (we simulate this as weekend)
  if (!isWeekend(simulatedDate)) {
    return null
  }

  // 10% probability on weekends
  if (Math.random() > 0.10) {
    return null
  }

  const region = pickRandom(REGIONS)
  const instanceType = pickRandom(['t3.large', 'm5.large', 'm5.xlarge'])
  const instanceName = `dev-workstation-${Date.now()}`

  const { data: instance, error } = await supabase
    .from('instances')
    .insert({
      account_id: accountId,
      instance_id: generateInstanceId(),
      name: instanceName,
      instance_type: instanceType,
      env: 'dev',
      region: region,
      state: 'running',
      hourly_cost: INSTANCE_COSTS[instanceType] || 0.1,
      current_cpu: randomBetween(0, 5), // Idle on weekend
      current_memory: randomBetween(10, 25),
      avg_cpu_7d: randomBetween(15, 40),
      optimization_policy: 'auto_safe',
      tags: {
        purpose: 'developer_workstation',
        created_by: 'drift_engine',
        schedule: 'weekdays_only', // Should be off on weekends!
        running_off_hours: 'true',
      },
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create off-hours dev instance:', error)
    return null
  }

  await logResourceChangeEvent(
    supabase,
    accountId,
    'instance',
    instance.id,
    'created',
    null,
    `Dev instance ${instanceName} running on weekend (should be scheduled off)`
  )

  return `Created dev instance ${instanceName} running on weekend (schedule: weekdays_only, auto_safe)`
}

/**
 * Creates a feature branch environment that's older than 7 days.
 * Safe Auto-Act can clean up stale feature environments.
 */
async function createStaleFeatureEnvironment(
  supabase: SupabaseClient,
  accountId: string
): Promise<string | null> {
  // 4% probability
  if (Math.random() > 0.04) {
    return null
  }

  const featureName = pickRandom([
    'feature-user-auth',
    'feature-payment-flow',
    'feature-dashboard-v2',
    'feature-api-refactor',
    'feature-mobile-app',
    'bugfix-login-issue',
    'experiment-new-ui',
  ])
  const featureId = `${featureName}-${randomInt(100, 999)}`
  const region = pickRandom(REGIONS)
  const instanceType = 't3.medium'
  const daysOld = randomInt(10, 30) // 10-30 days old

  // Create ASG for feature environment
  const { data: asg, error: asgError } = await supabase
    .from('autoscaling_groups')
    .insert({
      account_id: accountId,
      name: `${featureId}-asg`,
      min_size: 0,
      max_size: 4,
      desired_capacity: 2,
      instance_type: instanceType,
      env: 'feature',
      region: region,
      optimization_policy: 'auto_safe',
      tags: {
        feature_branch: featureId,
        created_by: 'drift_engine',
        days_old: String(daysOld),
        pr_status: pickRandom(['merged', 'closed', 'stale']),
      },
    })
    .select('id')
    .single()

  if (asgError) {
    console.error('Failed to create stale feature ASG:', asgError)
    return null
  }

  // Create 2 instances for the feature environment
  const instances = Array.from({ length: 2 }, () => ({
    account_id: accountId,
    instance_id: generateInstanceId(),
    name: `${featureId}-instance`,
    instance_type: instanceType,
    env: 'feature',
    region: region,
    state: 'running',
    autoscaling_group_id: asg.id,
    hourly_cost: INSTANCE_COSTS[instanceType] || 0.1,
    current_cpu: randomBetween(1, 8), // Very low - nobody using it
    current_memory: randomBetween(10, 25),
    avg_cpu_7d: randomBetween(3, 12),
    optimization_policy: 'auto_safe',
    tags: {
      feature_branch: featureId,
      created_by: 'drift_engine',
      days_old: String(daysOld),
    },
  }))

  await supabase.from('instances').insert(instances)

  await logResourceChangeEvent(
    supabase,
    accountId,
    'autoscaling_group',
    asg.id,
    'created',
    null,
    `Stale feature environment ${featureId} (${daysOld} days old, PR ${instances[0].tags.pr_status})`
  )

  return `Created stale feature environment ${featureId} (${daysOld} days old, auto_safe)`
}

// ============================================================================
// Main Account Processing
// ============================================================================

async function processAccount(
  supabase: SupabaseClient,
  accountId: string
): Promise<ProcessResult> {
  const result: ProcessResult = {
    simulatedDate: null,
    metrics: 0,
    s3Usage: 0,
    logUsage: 0,
    dataTransfer: 0,
    scenariosTriggered: [],
  }

  // 1. Determine next virtual day
  const dateInfo = await determineNextVirtualDay(supabase, accountId)
  if (!dateInfo) {
    return result
  }

  const { nextDate, lastDate } = dateInfo
  result.simulatedDate = formatDate(nextDate)

  console.log(`Processing account ${accountId}: simulating ${result.simulatedDate}`)

  // 2. Drift instance costs
  result.metrics = await driftInstanceCosts(supabase, accountId, nextDate, lastDate)

  // 3. Drift S3 usage
  result.s3Usage = await driftS3Usage(supabase, accountId, nextDate, lastDate)

  // 4. Drift log usage
  result.logUsage = await driftLogUsage(supabase, accountId, nextDate, lastDate)

  // 5. Drift data transfer
  result.dataTransfer = await driftDataTransfer(supabase, accountId, nextDate)

  // 6. Update live utilization
  await updateLiveUtilization(supabase, accountId, nextDate)

  // 7. Introduce startup mess scenarios (original)
  const previewResult = await createForgottenPreviewEnvironment(supabase, accountId)
  if (previewResult) {
    result.scenariosTriggered.push(previewResult)
  }

  const overProvisionResult = await overProvisionRandomAsg(supabase, accountId)
  if (overProvisionResult) {
    result.scenariosTriggered.push(overProvisionResult)
  }

  // 8. Safe Auto-Act waste scenarios (for AI agent to auto-optimize)
  const ciRunnerResult = await createIdleCIRunner(supabase, accountId)
  if (ciRunnerResult) {
    result.scenariosTriggered.push(ciRunnerResult)
  }

  const s3BucketResult = await createUnoptimizedS3Bucket(supabase, accountId)
  if (s3BucketResult) {
    result.scenariosTriggered.push(s3BucketResult)
  }

  const logGroupResult = await createLogGroupWithoutRetention(supabase, accountId)
  if (logGroupResult) {
    result.scenariosTriggered.push(logGroupResult)
  }

  const offHoursResult = await createOffHoursDevInstance(supabase, accountId, nextDate)
  if (offHoursResult) {
    result.scenariosTriggered.push(offHoursResult)
  }

  const staleFeatureResult = await createStaleFeatureEnvironment(supabase, accountId)
  if (staleFeatureResult) {
    result.scenariosTriggered.push(staleFeatureResult)
  }

  return result
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    // Note: For production, add proper authentication here.
    // Currently allowing unauthenticated access for pg_cron compatibility.
    // The function only modifies demo data and is not exposed publicly.

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get all cloud accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('cloud_accounts')
      .select('id, name')

    if (accountsError) {
      throw accountsError
    }

    if (!accounts?.length) {
      console.log('No cloud accounts found')
      return new Response(
        JSON.stringify({
          ok: true,
          accountsProcessed: 0,
          simulatedDate: null,
          message: 'No cloud accounts to process',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    let simulatedDate: string | null = null
    const results: Record<string, ProcessResult> = {}

    for (const account of accounts) {
      try {
        const result = await processAccount(supabase, account.id)
        results[account.id] = result
        if (result.simulatedDate) {
          simulatedDate = result.simulatedDate
        }
      } catch (err) {
        console.error(`Error processing account ${account.id}:`, err)
        results[account.id] = {
          simulatedDate: null,
          metrics: 0,
          s3Usage: 0,
          logUsage: 0,
          dataTransfer: 0,
          scenariosTriggered: [`Error: ${(err as Error).message}`],
        }
      }
    }

    const executionTimeMs = Date.now() - startTime

    // Aggregate results
    const totalMetrics = Object.values(results).reduce((sum, r) => sum + r.metrics, 0)
    const totalS3 = Object.values(results).reduce((sum, r) => sum + r.s3Usage, 0)
    const totalLogs = Object.values(results).reduce((sum, r) => sum + r.logUsage, 0)
    const totalTransfer = Object.values(results).reduce((sum, r) => sum + r.dataTransfer, 0)
    const allScenarios = Object.values(results).flatMap((r) => r.scenariosTriggered)

    console.log(
      JSON.stringify({
        simulatedDate,
        accountsProcessed: accounts.length,
        rowsAppended: {
          metrics_daily: totalMetrics,
          s3_bucket_usage_daily: totalS3,
          log_group_usage_daily: totalLogs,
          data_transfer_daily: totalTransfer,
        },
        scenariosTriggered: allScenarios,
        executionTimeMs,
      })
    )

    return new Response(
      JSON.stringify({
        ok: true,
        simulatedDate,
        accountsProcessed: accounts.length,
        rowsAppended: {
          metrics_daily: totalMetrics,
          s3_bucket_usage_daily: totalS3,
          log_group_usage_daily: totalLogs,
          data_transfer_daily: totalTransfer,
        },
        scenariosTriggered: allScenarios,
        executionTimeMs,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('drift-tick error:', error)
    return new Response(
      JSON.stringify({
        ok: false,
        error: (error as Error).message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
