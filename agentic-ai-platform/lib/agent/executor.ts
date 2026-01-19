/**
 * Action Executor for Auto-Safe Optimizations (Phase 6)
 *
 * Executes optimization actions on cloud resources.
 * For this demo, actions update the Supabase database to simulate AWS operations.
 *
 * Actions supported:
 * - terminate_asg: Delete ASG and set instances to terminated
 * - scale_down_asg: Reduce ASG desired capacity
 * - terminate_instance: Terminate an EC2 instance
 * - stop_instance: Stop an EC2 instance
 * - rightsize_instance: Rightsize an EC2 instance to a smaller type
 * - add_lifecycle_policy: Add lifecycle policy to S3 bucket
 * - set_retention: Set retention policy on CloudWatch log group
 * - release_eip: Release an Elastic IP
 * - delete_volume: Delete an EBS volume
 * - delete_snapshot: Delete an EBS snapshot
 * - stop_rds: Stop an RDS instance
 * - downsize_rds: Downsize an RDS instance
 * - delete_cache: Delete an ElastiCache cluster
 * - delete_lb: Delete a load balancer
 * - rightsize_lambda: Rightsize a Lambda function
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { ActionType, ResourceType } from "./scenarios"
import { clearDetectionCache } from "./detector"

export interface ActionResult {
  success: boolean
  action: ActionType
  resourceId: string
  resourceType: ResourceType
  message: string
  previousState?: Record<string, unknown>
  newState?: Record<string, unknown>
  executedAt: string
  durationMs: number
}

export interface ExecuteActionParams {
  action: ActionType
  resourceType: ResourceType
  resourceId: string
  resourceName: string
  detectionId: string
  scenarioId: string
  details?: Record<string, unknown>
}

export interface AuditLogEntry {
  action: ActionType
  resource_type: ResourceType
  resource_id: string
  resource_name: string
  scenario_id: string
  detection_id: string
  success: boolean
  message: string
  previous_state: Record<string, unknown> | null
  new_state: Record<string, unknown> | null
  executed_at: string
  duration_ms: number
  executed_by: string
}

/**
 * Creates an executor instance for running optimization actions
 */
export function createExecutor(supabaseUrl: string, supabaseKey: string) {
  console.log("[Executor] Creating executor instance")
  const supabase = createClient(supabaseUrl, supabaseKey)

  return {
    /**
     * Execute a single optimization action
     */
    async executeAction(params: ExecuteActionParams): Promise<ActionResult> {
      const startTime = performance.now()
      console.log(`[Executor] Executing action: ${params.action} on ${params.resourceType}/${params.resourceId}`)

      try {
        let result: ActionResult

        switch (params.action) {
          case "terminate_instance":
            result = await terminateInstance(supabase, params, startTime)
            break
          case "stop_instance":
            result = await stopInstance(supabase, params, startTime)
            break
          case "terminate_asg":
            result = await terminateAsg(supabase, params, startTime)
            break
          case "scale_down_asg":
            result = await scaleDownAsg(supabase, params, startTime)
            break
          case "release_eip":
            result = await releaseEip(supabase, params, startTime)
            break
          case "delete_volume":
            result = await deleteVolume(supabase, params, startTime)
            break
          case "delete_snapshot":
            result = await deleteSnapshot(supabase, params, startTime)
            break
          case "add_lifecycle_policy":
            result = await addLifecyclePolicy(supabase, params, startTime)
            break
          case "set_retention":
            result = await setRetention(supabase, params, startTime)
            break
          case "stop_rds":
            result = await stopRds(supabase, params, startTime)
            break
          case "downsize_rds":
            result = await downsizeRds(supabase, params, startTime)
            break
          case "delete_cache":
            result = await deleteCache(supabase, params, startTime)
            break
          case "delete_lb":
            result = await deleteLoadBalancer(supabase, params, startTime)
            break
          case "rightsize_lambda":
            result = await rightsizeLambda(supabase, params, startTime)
            break
          case "rightsize_instance":
            result = await rightsizeInstance(supabase, params, startTime)
            break
          // Phase 1: Quick-win actions
          case "upgrade_volume_type":
            result = await upgradeVolumeType(supabase, params, startTime)
            break
          case "delete_lambda":
            result = await deleteLambda(supabase, params, startTime)
            break
          case "delete_orphaned_snapshot":
            result = await deleteOrphanedSnapshot(supabase, params, startTime)
            break
          case "enable_asg_scaling":
            result = await enableAsgScaling(supabase, params, startTime)
            break
          // Phase 2: Quick-win actions
          case "disable_multi_az":
            result = await disableMultiAz(supabase, params, startTime)
            break
          case "delete_empty_lb":
            result = await deleteEmptyLb(supabase, params, startTime)
            break
          case "add_version_expiration":
            result = await addVersionExpiration(supabase, params, startTime)
            break
          case "optimize_lambda_timeout":
            result = await optimizeLambdaTimeout(supabase, params, startTime)
            break
          default:
            throw new Error(`Unknown action type: ${params.action}`)
        }

        // Log the action to audit log
        await logAction(supabase, params, result)

        // Clear the detection cache so next detection fetch returns fresh data
        if (result.success) {
          clearDetectionCache()
          console.log(`[Executor] Detection cache cleared after successful action`)
        }

        const duration = performance.now() - startTime
        console.log(`[Executor] ✅ Action completed in ${duration.toFixed(0)}ms: ${result.message}`)

        return result
      } catch (error) {
        const duration = performance.now() - startTime
        console.error(`[Executor] ❌ Action failed after ${duration.toFixed(0)}ms:`, error)

        const failedResult: ActionResult = {
          success: false,
          action: params.action,
          resourceId: params.resourceId,
          resourceType: params.resourceType,
          message: error instanceof Error ? error.message : "Action failed",
          executedAt: new Date().toISOString(),
          durationMs: duration,
        }

        // Log the failed action
        await logAction(supabase, params, failedResult).catch(console.error)

        return failedResult
      }
    },

    /**
     * Get audit log entries
     */
    async getAuditLog(limit = 50): Promise<AuditLogEntry[]> {
      console.log(`[Executor] Fetching audit log (limit: ${limit})`)
      const startTime = performance.now()

      const { data, error } = await supabase
        .from("action_audit_log")
        .select("*")
        .order("executed_at", { ascending: false })
        .limit(limit)

      if (error) {
        console.error(`[Executor] ❌ Failed to fetch audit log:`, error)
        return []
      }

      const duration = performance.now() - startTime
      console.log(`[Executor] Fetched ${data?.length ?? 0} audit entries in ${duration.toFixed(0)}ms`)

      return data ?? []
    },
  }
}

/**
 * Log action to audit table
 */
async function logAction(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  result: ActionResult
): Promise<void> {
  console.log(`[Executor] Logging action to audit log`)

  const entry: Omit<AuditLogEntry, "id"> = {
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    resource_name: params.resourceName,
    scenario_id: params.scenarioId,
    detection_id: params.detectionId,
    success: result.success,
    message: result.message,
    previous_state: result.previousState ?? null,
    new_state: result.newState ?? null,
    executed_at: result.executedAt,
    duration_ms: Math.round(result.durationMs),
    executed_by: "auto-safe-agent",
  }

  const { error } = await supabase.from("action_audit_log").insert(entry)

  if (error) {
    console.error(`[Executor] ❌ Failed to log action:`, error)
    // Don't throw - audit logging failure shouldn't fail the action
  }
}

// =============================================================================
// Instance Actions
// =============================================================================

async function terminateInstance(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Terminating instance: ${params.resourceId}`)

  // Get current state - try by id first, then by instance_id
  let { data: instance, error: fetchError } = await supabase
    .from("instances")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  if (fetchError || !instance) {
    const result = await supabase
      .from("instances")
      .select("*")
      .eq("instance_id", params.resourceId)
      .single()
    instance = result.data
    fetchError = result.error
  }

  if (fetchError || !instance) {
    throw new Error(`Instance not found: ${params.resourceId}`)
  }

  const previousState = { state: instance.state }

  // Update to terminated using the instance's actual id
  const { error: updateError } = await supabase
    .from("instances")
    .update({ state: "terminated", updated_at: new Date().toISOString() })
    .eq("id", instance.id)

  if (updateError) {
    throw new Error(`Failed to terminate instance: ${updateError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `Instance ${instance.instance_id || params.resourceName} terminated successfully`,
    previousState,
    newState: { state: "terminated" },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

async function stopInstance(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Stopping instance: ${params.resourceId}`)

  // Get current state - try by id first, then by instance_id
  let { data: instance, error: fetchError } = await supabase
    .from("instances")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  // Fallback to instance_id if not found by id
  if (fetchError || !instance) {
    const result = await supabase
      .from("instances")
      .select("*")
      .eq("instance_id", params.resourceId)
      .single()
    instance = result.data
    fetchError = result.error
  }

  if (fetchError || !instance) {
    throw new Error(`Instance not found: ${params.resourceId}`)
  }

  const previousState = { state: instance.state }

  // Update to stopped using the instance's actual id
  const { error: updateError } = await supabase
    .from("instances")
    .update({ state: "stopped", updated_at: new Date().toISOString() })
    .eq("id", instance.id)

  if (updateError) {
    throw new Error(`Failed to stop instance: ${updateError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `Instance ${instance.instance_id || params.resourceName} stopped successfully`,
    previousState,
    newState: { state: "stopped" },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

// =============================================================================
// Auto Scaling Group Actions
// =============================================================================

async function terminateAsg(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Terminating ASG: ${params.resourceId}`)

  // Get current state - try by id first, then by asg_name
  let { data: asg, error: fetchError } = await supabase
    .from("autoscaling_groups")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  // Fallback to asg_name if not found by id
  if (fetchError || !asg) {
    const result = await supabase
      .from("autoscaling_groups")
      .select("*")
      .eq("asg_name", params.resourceId)
      .single()
    asg = result.data
    fetchError = result.error
  }

  if (fetchError || !asg) {
    throw new Error(`ASG not found: ${params.resourceId}`)
  }

  const previousState = {
    desired_capacity: asg.desired_capacity,
    min_size: asg.min_size,
    max_size: asg.max_size,
  }

  // Set all capacities to 0 (simulating termination)
  const { error: updateError } = await supabase
    .from("autoscaling_groups")
    .update({
      desired_capacity: 0,
      min_size: 0,
      max_size: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", asg.id)

  if (updateError) {
    throw new Error(`Failed to terminate ASG: ${updateError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `ASG ${params.resourceName} terminated (capacity set to 0)`,
    previousState,
    newState: { desired_capacity: 0, min_size: 0, max_size: 0 },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

async function scaleDownAsg(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Scaling down ASG: ${params.resourceId}`)

  // Get current state - try by id first, then by asg_name
  let { data: asg, error: fetchError } = await supabase
    .from("autoscaling_groups")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  // Fallback to asg_name if not found by id
  if (fetchError || !asg) {
    const result = await supabase
      .from("autoscaling_groups")
      .select("*")
      .eq("asg_name", params.resourceId)
      .single()
    asg = result.data
    fetchError = result.error
  }

  if (fetchError || !asg) {
    throw new Error(`ASG not found: ${params.resourceId}`)
  }

  const previousState = {
    desired_capacity: asg.desired_capacity,
    min_size: asg.min_size,
  }

  // Scale down by 50% or to min 1
  const newDesired = Math.max(1, Math.floor(asg.desired_capacity / 2))
  const newMin = Math.min(newDesired, asg.min_size)

  const { error: updateError } = await supabase
    .from("autoscaling_groups")
    .update({
      desired_capacity: newDesired,
      min_size: newMin,
      updated_at: new Date().toISOString(),
    })
    .eq("id", asg.id)

  if (updateError) {
    throw new Error(`Failed to scale down ASG: ${updateError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `ASG ${params.resourceName} scaled down from ${asg.desired_capacity} to ${newDesired}`,
    previousState,
    newState: { desired_capacity: newDesired, min_size: newMin },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

// =============================================================================
// Elastic IP Actions
// =============================================================================

async function releaseEip(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Releasing EIP: ${params.resourceId}`)

  // Get current state - try by id first, then by allocation_id
  let { data: eip, error: fetchError } = await supabase
    .from("elastic_ips")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  // Fallback to allocation_id if not found by id
  if (fetchError || !eip) {
    const result = await supabase
      .from("elastic_ips")
      .select("*")
      .eq("allocation_id", params.resourceId)
      .single()
    eip = result.data
    fetchError = result.error
  }

  if (fetchError || !eip) {
    throw new Error(`Elastic IP not found: ${params.resourceId}`)
  }

  const previousState = {
    public_ip: eip.public_ip,
    association_id: eip.association_id,
  }

  // Delete the EIP record (simulating release)
  const { error: deleteError } = await supabase
    .from("elastic_ips")
    .delete()
    .eq("id", eip.id)

  if (deleteError) {
    throw new Error(`Failed to release EIP: ${deleteError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `Elastic IP ${eip.public_ip} released successfully`,
    previousState,
    newState: { released: true },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

// =============================================================================
// EBS Volume Actions
// =============================================================================

async function deleteVolume(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Deleting volume: ${params.resourceId}`)

  // Get current state - try by id first, then by volume_id
  let { data: volume, error: fetchError } = await supabase
    .from("volumes")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  // Fallback to volume_id if not found by id
  if (fetchError || !volume) {
    const result = await supabase
      .from("volumes")
      .select("*")
      .eq("volume_id", params.resourceId)
      .single()
    volume = result.data
    fetchError = result.error
  }

  if (fetchError || !volume) {
    throw new Error(`Volume not found: ${params.resourceId}`)
  }

  const previousState = {
    state: volume.state,
    size_gb: volume.size_gb,
    volume_type: volume.volume_type,
  }

  // Update state to deleted (or actually delete)
  const { error: updateError } = await supabase
    .from("volumes")
    .update({ state: "deleted", updated_at: new Date().toISOString() })
    .eq("id", volume.id)

  if (updateError) {
    throw new Error(`Failed to delete volume: ${updateError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `Volume ${params.resourceName} (${volume.size_gb}GB) deleted successfully`,
    previousState,
    newState: { state: "deleted" },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

// =============================================================================
// EBS Snapshot Actions
// =============================================================================

async function deleteSnapshot(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Deleting snapshot: ${params.resourceId}`)

  // Get current state - try by id first, then by snapshot_id
  let { data: snapshot, error: fetchError } = await supabase
    .from("snapshots")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  // Fallback to snapshot_id if not found by id
  if (fetchError || !snapshot) {
    const result = await supabase
      .from("snapshots")
      .select("*")
      .eq("snapshot_id", params.resourceId)
      .single()
    snapshot = result.data
    fetchError = result.error
  }

  if (fetchError || !snapshot) {
    throw new Error(`Snapshot not found: ${params.resourceId}`)
  }

  const previousState = {
    state: snapshot.state,
    volume_size_gb: snapshot.volume_size_gb,
    start_time: snapshot.start_time,
  }

  // Delete the snapshot record
  const { error: deleteError } = await supabase
    .from("snapshots")
    .delete()
    .eq("id", snapshot.id)

  if (deleteError) {
    throw new Error(`Failed to delete snapshot: ${deleteError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `Snapshot ${params.resourceName} deleted successfully`,
    previousState,
    newState: { deleted: true },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

// =============================================================================
// S3 Bucket Actions
// =============================================================================

async function addLifecyclePolicy(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Adding lifecycle policy to bucket: ${params.resourceId}`)

  // Get current state - try by id first, then by bucket_name
  let { data: bucket, error: fetchError } = await supabase
    .from("s3_buckets")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  // Fallback to bucket_name if not found by id
  if (fetchError || !bucket) {
    const result = await supabase
      .from("s3_buckets")
      .select("*")
      .eq("bucket_name", params.resourceId)
      .single()
    bucket = result.data
    fetchError = result.error
  }

  if (fetchError || !bucket) {
    throw new Error(`S3 bucket not found: ${params.resourceId}`)
  }

  const previousState = {
    lifecycle_rules: bucket.lifecycle_rules,
  }

  // Add intelligent tiering lifecycle rule
  const newLifecycleRules = [
    ...(bucket.lifecycle_rules || []),
    {
      id: "intelligent-tiering",
      status: "Enabled",
      transitions: [
        { days: 30, storage_class: "INTELLIGENT_TIERING" },
        { days: 90, storage_class: "GLACIER" },
      ],
    },
  ]

  const { error: updateError } = await supabase
    .from("s3_buckets")
    .update({
      lifecycle_rules: newLifecycleRules,
    })
    .eq("id", bucket.id)

  if (updateError) {
    throw new Error(`Failed to add lifecycle policy: ${updateError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `Lifecycle policy added to bucket ${params.resourceName}`,
    previousState,
    newState: { lifecycle_rules: newLifecycleRules },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

// =============================================================================
// CloudWatch Log Group Actions
// =============================================================================

async function setRetention(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Setting retention on log group: ${params.resourceId}`)

  // Get current state - try by id first, then by log_group_name
  let { data: logGroup, error: fetchError } = await supabase
    .from("log_groups")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  // Fallback to log_group_name if not found by id
  if (fetchError || !logGroup) {
    const result = await supabase
      .from("log_groups")
      .select("*")
      .eq("log_group_name", params.resourceId)
      .single()
    logGroup = result.data
    fetchError = result.error
  }

  if (fetchError || !logGroup) {
    throw new Error(`Log group not found: ${params.resourceId}`)
  }

  const previousState = {
    retention_in_days: logGroup.retention_in_days,
  }

  // Set 30-day retention
  const newRetention = 30

  const { error: updateError } = await supabase
    .from("log_groups")
    .update({
      retention_in_days: newRetention,
    })
    .eq("id", logGroup.id)

  if (updateError) {
    throw new Error(`Failed to set retention: ${updateError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `Retention set to ${newRetention} days for ${logGroup.log_group_name || params.resourceName}`,
    previousState,
    newState: { retention_in_days: newRetention },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

// =============================================================================
// RDS Actions
// =============================================================================

async function stopRds(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Stopping RDS instance: ${params.resourceId}`)

  // Get current state - try by id first, then by db_instance_id
  let { data: rds, error: fetchError } = await supabase
    .from("rds_instances")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  // Fallback to db_instance_id if not found by id
  if (fetchError || !rds) {
    const result = await supabase
      .from("rds_instances")
      .select("*")
      .eq("db_instance_id", params.resourceId)
      .single()
    rds = result.data
    fetchError = result.error
  }

  if (fetchError || !rds) {
    throw new Error(`RDS instance not found: ${params.resourceId}`)
  }

  const previousState = {
    status: rds.status,
  }

  const { error: updateError } = await supabase
    .from("rds_instances")
    .update({
      status: "stopped",
      updated_at: new Date().toISOString(),
    })
    .eq("id", rds.id)

  if (updateError) {
    throw new Error(`Failed to stop RDS instance: ${updateError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `RDS instance ${params.resourceName} stopped successfully`,
    previousState,
    newState: { status: "stopped" },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

async function downsizeRds(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Downsizing RDS instance: ${params.resourceId}`)

  // Get current state - try by id first, then by db_instance_id
  let { data: rds, error: fetchError } = await supabase
    .from("rds_instances")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  // Fallback to db_instance_id if not found by id
  if (fetchError || !rds) {
    const result = await supabase
      .from("rds_instances")
      .select("*")
      .eq("db_instance_id", params.resourceId)
      .single()
    rds = result.data
    fetchError = result.error
  }

  if (fetchError || !rds) {
    throw new Error(`RDS instance not found: ${params.resourceId}`)
  }

  const previousState = {
    instance_class: rds.instance_class,
  }

  // Downsize to smaller instance class
  const instanceSizes = ["db.t3.micro", "db.t3.small", "db.t3.medium", "db.t3.large", "db.t3.xlarge"]
  const currentIndex = instanceSizes.indexOf(rds.instance_class)
  const newClass = currentIndex > 0 ? instanceSizes[currentIndex - 1] : rds.instance_class

  const { error: updateError } = await supabase
    .from("rds_instances")
    .update({
      instance_class: newClass,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rds.id)

  if (updateError) {
    throw new Error(`Failed to downsize RDS instance: ${updateError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `RDS instance ${params.resourceName} downsized from ${rds.instance_class} to ${newClass}`,
    previousState,
    newState: { instance_class: newClass },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

// =============================================================================
// ElastiCache Actions
// =============================================================================

async function deleteCache(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Deleting cache cluster: ${params.resourceId}`)

  // Get current state - try by id first, then by cluster_id
  let { data: cache, error: fetchError } = await supabase
    .from("cache_clusters")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  // Fallback to cluster_id if not found by id
  if (fetchError || !cache) {
    const result = await supabase
      .from("cache_clusters")
      .select("*")
      .eq("cluster_id", params.resourceId)
      .single()
    cache = result.data
    fetchError = result.error
  }

  if (fetchError || !cache) {
    throw new Error(`Cache cluster not found: ${params.resourceId}`)
  }

  const previousState = {
    cluster_id: cache.cluster_id,
    node_type: cache.node_type,
    num_nodes: cache.num_nodes,
  }

  // Delete the cache cluster record
  const { error: deleteError } = await supabase
    .from("cache_clusters")
    .delete()
    .eq("id", cache.id)

  if (deleteError) {
    throw new Error(`Failed to delete cache cluster: ${deleteError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `Cache cluster ${params.resourceName} deleted successfully`,
    previousState,
    newState: { deleted: true },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

// =============================================================================
// Load Balancer Actions
// =============================================================================

async function deleteLoadBalancer(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Deleting load balancer: ${params.resourceId}`)

  // Get current state - try by id first, then by lb_arn
  let { data: lb, error: fetchError } = await supabase
    .from("load_balancers")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  // Fallback to lb_arn if not found by id
  if (fetchError || !lb) {
    const result = await supabase
      .from("load_balancers")
      .select("*")
      .eq("lb_arn", params.resourceId)
      .single()
    lb = result.data
    fetchError = result.error
  }

  if (fetchError || !lb) {
    throw new Error(`Load balancer not found: ${params.resourceId}`)
  }

  const previousState = {
    state: lb.state,
    type: lb.type,
  }

  // Delete the load balancer record
  const { error: deleteError } = await supabase
    .from("load_balancers")
    .delete()
    .eq("id", lb.id)

  if (deleteError) {
    throw new Error(`Failed to delete load balancer: ${deleteError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `Load balancer ${params.resourceName} deleted successfully`,
    previousState,
    newState: { deleted: true },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

// =============================================================================
// Lambda Actions
// =============================================================================

async function rightsizeLambda(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Rightsizing Lambda function: ${params.resourceId}`)

  // Get current state - try by id first, then by function_name
  let { data: lambda, error: fetchError } = await supabase
    .from("lambda_functions")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  // Fallback to function_name if not found by id
  if (fetchError || !lambda) {
    const result = await supabase
      .from("lambda_functions")
      .select("*")
      .eq("function_name", params.resourceId)
      .single()
    lambda = result.data
    fetchError = result.error
  }

  if (fetchError || !lambda) {
    throw new Error(`Lambda function not found: ${params.resourceId}`)
  }

  const previousState = {
    memory_mb: lambda.memory_mb,
  }

  // Rightsize to 50% of current or minimum 128MB
  const newMemory = Math.max(128, Math.floor(lambda.memory_mb / 2))

  const { error: updateError } = await supabase
    .from("lambda_functions")
    .update({
      memory_mb: newMemory,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lambda.id)

  if (updateError) {
    throw new Error(`Failed to rightsize Lambda: ${updateError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `Lambda ${lambda.function_name || params.resourceName} rightsized from ${lambda.memory_mb}MB to ${newMemory}MB`,
    previousState,
    newState: { memory_mb: newMemory },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

// =============================================================================
// EC2 Instance Rightsizing Actions
// =============================================================================

async function rightsizeInstance(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Rightsizing EC2 instance: ${params.resourceId}`)

  // Get current state - try by id first, then by instance_id
  let { data: instance, error: fetchError } = await supabase
    .from("instances")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  // Fallback to instance_id if not found by id
  if (fetchError || !instance) {
    const result = await supabase
      .from("instances")
      .select("*")
      .eq("instance_id", params.resourceId)
      .single()
    instance = result.data
    fetchError = result.error
  }

  if (fetchError || !instance) {
    throw new Error(`Instance not found: ${params.resourceId}`)
  }

  const previousState = {
    instance_type: instance.instance_type,
  }

  // Get the recommended instance type from detection details
  const recommendedType = params.details?.recommendedInstanceType as string

  if (!recommendedType) {
    throw new Error(`No recommended instance type provided for rightsizing`)
  }

  // Update to the recommended instance type
  const { error: updateError } = await supabase
    .from("instances")
    .update({
      instance_type: recommendedType,
      updated_at: new Date().toISOString(),
    })
    .eq("id", instance.id)

  if (updateError) {
    throw new Error(`Failed to rightsize instance: ${updateError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `Instance ${instance.instance_id || params.resourceName} rightsized from ${instance.instance_type} to ${recommendedType}`,
    previousState,
    newState: { instance_type: recommendedType },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

// =============================================================================
// QUICK-WIN OPTIMIZATIONS - Phase 1 Actions
// =============================================================================

/**
 * Upgrade EBS volume from gp2 to gp3
 */
async function upgradeVolumeType(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Upgrading volume type: ${params.resourceId}`)

  // Get current state - try by id first, then by volume_id
  let { data: volume, error: fetchError } = await supabase
    .from("volumes")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  if (fetchError || !volume) {
    const result = await supabase
      .from("volumes")
      .select("*")
      .eq("volume_id", params.resourceId)
      .single()
    volume = result.data
    fetchError = result.error
  }

  if (fetchError || !volume) {
    throw new Error(`Volume not found: ${params.resourceId}`)
  }

  const previousState = {
    volume_type: volume.volume_type,
  }

  // Update to gp3
  const { error: updateError } = await supabase
    .from("volumes")
    .update({
      volume_type: "gp3",
      updated_at: new Date().toISOString(),
    })
    .eq("id", volume.id)

  if (updateError) {
    throw new Error(`Failed to upgrade volume type: ${updateError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `Volume ${volume.volume_id} upgraded from gp2 to gp3`,
    previousState,
    newState: { volume_type: "gp3" },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

/**
 * Delete unused Lambda function
 */
async function deleteLambda(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Deleting Lambda function: ${params.resourceId}`)

  // Get current state - try by id first, then by function_name
  let { data: lambda, error: fetchError } = await supabase
    .from("lambda_functions")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  if (fetchError || !lambda) {
    const result = await supabase
      .from("lambda_functions")
      .select("*")
      .eq("function_name", params.resourceId)
      .single()
    lambda = result.data
    fetchError = result.error
  }

  if (fetchError || !lambda) {
    throw new Error(`Lambda function not found: ${params.resourceId}`)
  }

  const previousState = {
    name: lambda.name,
    memory_mb: lambda.memory_mb,
    runtime: lambda.runtime,
  }

  // Delete the Lambda function record
  const { error: deleteError } = await supabase
    .from("lambda_functions")
    .delete()
    .eq("id", lambda.id)

  if (deleteError) {
    throw new Error(`Failed to delete Lambda function: ${deleteError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `Lambda function ${lambda.name} deleted successfully`,
    previousState,
    newState: { deleted: true },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

/**
 * Delete orphaned EBS snapshot
 */
async function deleteOrphanedSnapshot(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Deleting orphaned snapshot: ${params.resourceId}`)

  // Get current state - try by id first, then by snapshot_id
  let { data: snapshot, error: fetchError } = await supabase
    .from("snapshots")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  if (fetchError || !snapshot) {
    const result = await supabase
      .from("snapshots")
      .select("*")
      .eq("snapshot_id", params.resourceId)
      .single()
    snapshot = result.data
    fetchError = result.error
  }

  if (fetchError || !snapshot) {
    throw new Error(`Snapshot not found: ${params.resourceId}`)
  }

  const previousState = {
    snapshot_id: snapshot.snapshot_id,
    source_volume_id: snapshot.source_volume_id,
    size_gib: snapshot.size_gib,
  }

  // Delete the snapshot record
  const { error: deleteError } = await supabase
    .from("snapshots")
    .delete()
    .eq("id", snapshot.id)

  if (deleteError) {
    throw new Error(`Failed to delete orphaned snapshot: ${deleteError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `Orphaned snapshot ${snapshot.snapshot_id} deleted successfully`,
    previousState,
    newState: { deleted: true },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

/**
 * Enable dynamic scaling for static ASG
 */
async function enableAsgScaling(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Enabling ASG scaling: ${params.resourceId}`)

  // Get current state - try by id first, then by asg_name
  let { data: asg, error: fetchError } = await supabase
    .from("autoscaling_groups")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  if (fetchError || !asg) {
    const result = await supabase
      .from("autoscaling_groups")
      .select("*")
      .eq("asg_name", params.resourceId)
      .single()
    asg = result.data
    fetchError = result.error
  }

  if (fetchError || !asg) {
    throw new Error(`ASG not found: ${params.resourceId}`)
  }

  const previousState = {
    min_size: asg.min_size,
    max_size: asg.max_size,
    desired_capacity: asg.desired_capacity,
  }

  // Enable scaling: set min to 1, max to 2x current
  const newMinSize = 1
  const newMaxSize = Math.max(asg.desired_capacity * 2, 4)

  const { error: updateError } = await supabase
    .from("autoscaling_groups")
    .update({
      min_size: newMinSize,
      max_size: newMaxSize,
      updated_at: new Date().toISOString(),
    })
    .eq("id", asg.id)

  if (updateError) {
    throw new Error(`Failed to enable ASG scaling: ${updateError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `ASG ${params.resourceName} scaling enabled (min: ${newMinSize}, max: ${newMaxSize})`,
    previousState,
    newState: { min_size: newMinSize, max_size: newMaxSize },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

// =============================================================================
// QUICK-WIN OPTIMIZATIONS - Phase 2 Actions
// =============================================================================

/**
 * Disable Multi-AZ for non-production RDS
 */
async function disableMultiAz(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Disabling Multi-AZ: ${params.resourceId}`)

  // Get current state - try by id first, then by db_instance_id
  let { data: rds, error: fetchError } = await supabase
    .from("rds_instances")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  if (fetchError || !rds) {
    const result = await supabase
      .from("rds_instances")
      .select("*")
      .eq("db_instance_id", params.resourceId)
      .single()
    rds = result.data
    fetchError = result.error
  }

  if (fetchError || !rds) {
    throw new Error(`RDS instance not found: ${params.resourceId}`)
  }

  const previousState = {
    multi_az: rds.multi_az,
  }

  // Disable Multi-AZ
  const { error: updateError } = await supabase
    .from("rds_instances")
    .update({
      multi_az: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rds.id)

  if (updateError) {
    throw new Error(`Failed to disable Multi-AZ: ${updateError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `Multi-AZ disabled for RDS ${rds.db_instance_id}`,
    previousState,
    newState: { multi_az: false },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

/**
 * Delete empty load balancer
 */
async function deleteEmptyLb(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Deleting empty load balancer: ${params.resourceId}`)

  // Get current state - try by id first, then by lb_arn
  let { data: lb, error: fetchError } = await supabase
    .from("load_balancers")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  if (fetchError || !lb) {
    const result = await supabase
      .from("load_balancers")
      .select("*")
      .eq("lb_arn", params.resourceId)
      .single()
    lb = result.data
    fetchError = result.error
  }

  if (fetchError || !lb) {
    throw new Error(`Load balancer not found: ${params.resourceId}`)
  }

  const previousState = {
    name: lb.name,
    type: lb.type,
    target_count: lb.target_count,
  }

  // Delete the load balancer record
  const { error: deleteError } = await supabase
    .from("load_balancers")
    .delete()
    .eq("id", lb.id)

  if (deleteError) {
    throw new Error(`Failed to delete empty load balancer: ${deleteError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `Empty load balancer ${lb.name} deleted successfully`,
    previousState,
    newState: { deleted: true },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

/**
 * Add noncurrent version expiration to S3 bucket
 */
async function addVersionExpiration(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Adding version expiration to bucket: ${params.resourceId}`)

  // Get current state - try by id first, then by bucket_name
  let { data: bucket, error: fetchError } = await supabase
    .from("s3_buckets")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  if (fetchError || !bucket) {
    const result = await supabase
      .from("s3_buckets")
      .select("*")
      .eq("bucket_name", params.resourceId)
      .single()
    bucket = result.data
    fetchError = result.error
  }

  if (fetchError || !bucket) {
    throw new Error(`S3 bucket not found: ${params.resourceId}`)
  }

  const previousState = {
    lifecycle_rules: bucket.lifecycle_rules,
  }

  // Add noncurrent version expiration rule
  const existingRules = (bucket.lifecycle_rules as unknown[]) || []
  const newRule = {
    id: "expire-noncurrent-versions",
    status: "Enabled",
    noncurrent_version_expiration: { days: 30 },
  }

  const newLifecycleRules = [...existingRules, newRule]

  const { error: updateError } = await supabase
    .from("s3_buckets")
    .update({
      lifecycle_rules: newLifecycleRules,
    })
    .eq("id", bucket.id)

  if (updateError) {
    throw new Error(`Failed to add version expiration: ${updateError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `Version expiration (30 days) added to bucket ${bucket.name}`,
    previousState,
    newState: { lifecycle_rules: newLifecycleRules },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

/**
 * Optimize Lambda function timeout
 */
async function optimizeLambdaTimeout(
  supabase: SupabaseClient,
  params: ExecuteActionParams,
  startTime: number
): Promise<ActionResult> {
  console.log(`[Executor] Optimizing Lambda timeout: ${params.resourceId}`)

  // Get current state - try by id first, then by function_name
  let { data: lambda, error: fetchError } = await supabase
    .from("lambda_functions")
    .select("*")
    .eq("id", params.resourceId)
    .single()

  if (fetchError || !lambda) {
    const result = await supabase
      .from("lambda_functions")
      .select("*")
      .eq("function_name", params.resourceId)
      .single()
    lambda = result.data
    fetchError = result.error
  }

  if (fetchError || !lambda) {
    throw new Error(`Lambda function not found: ${params.resourceId}`)
  }

  const previousState = {
    timeout_seconds: lambda.timeout_seconds,
  }

  // Get recommended timeout from detection details
  const recommendedTimeout = params.details?.recommendedTimeout as number

  if (!recommendedTimeout) {
    throw new Error(`No recommended timeout provided for optimization`)
  }

  // Update to the recommended timeout
  const { error: updateError } = await supabase
    .from("lambda_functions")
    .update({
      timeout_seconds: recommendedTimeout,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lambda.id)

  if (updateError) {
    throw new Error(`Failed to optimize Lambda timeout: ${updateError.message}`)
  }

  return {
    success: true,
    action: params.action,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    message: `Lambda ${lambda.name} timeout optimized from ${lambda.timeout_seconds}s to ${recommendedTimeout}s`,
    previousState,
    newState: { timeout_seconds: recommendedTimeout },
    executedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  }
}

export type { SupabaseClient }
