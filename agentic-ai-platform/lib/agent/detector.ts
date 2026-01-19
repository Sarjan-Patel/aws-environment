/**
 * Waste Detection Engine
 *
 * Core detection logic that analyzes resources from Supabase
 * and identifies waste scenarios with confidence scoring.
 *
 * OPTIMIZED: Uses batch fetching and in-memory processing
 * to reduce database queries from 15+ to 11 parallel queries.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import {
  WasteScenario,
  WasteScenarioId,
  WASTE_SCENARIOS,
  ResourceType,
} from "./scenarios"
import {
  getEC2MonthlyCost,
  getRDSMonthlyCost,
  getCacheMonthlyCost,
  getLoadBalancerMonthlyCost,
  getVolumeMonthlyCost,
  getSnapshotMonthlyCost,
  getUnattachedEIPMonthlyCost,
  getS3TieringSavings,
  getLambdaMonthlyCost,
  getRecommendedSmallerInstance,
  getEC2InstanceSpecs,
  HOURS_PER_MONTH,
} from "@/lib/utils/pricing"

// Cache for detection results (30-second TTL)
interface CacheEntry {
  result: DetectionResult
  timestamp: number
}

let detectionCache: CacheEntry | null = null
const CACHE_TTL_MS = 30000 // 30 seconds

// Pre-fetched resource data structure
interface ResourceData {
  instances: Record<string, unknown>[]
  rdsInstances: Record<string, unknown>[]
  cacheClusters: Record<string, unknown>[]
  loadBalancers: Record<string, unknown>[]
  lambdaFunctions: Record<string, unknown>[]
  volumes: Record<string, unknown>[]
  snapshots: Record<string, unknown>[]
  elasticIps: Record<string, unknown>[]
  s3Buckets: Record<string, unknown>[]
  logGroups: Record<string, unknown>[]
  autoscalingGroups: Record<string, unknown>[]
}

// Detection result for a single resource
export interface WasteDetection {
  id: string
  scenarioId: WasteScenarioId
  scenario: WasteScenario
  // Flattened scenario properties for hooks compatibility
  scenarioName: string
  mode: 2 | 3
  action: string
  resourceId: string
  resourceType: ResourceType
  resourceName: string
  accountId: string
  region: string
  env: string
  confidence: number
  monthlyCost: number
  potentialSavings: number
  details: Record<string, unknown>
  canAutoOptimize: boolean
  optimizationPolicyLocked: boolean
  createdAt: string
}

// Summary of detection results
export interface DetectionSummary {
  totalResources: number
  wasteDetected: number
  totalMonthlyCost: number
  totalPotentialSavings: number
  autoOptimizableSavings: number
  byScenario: Record<WasteScenarioId, number>
  bySeverity: {
    high: number
    medium: number
    low: number
  }
}

// Resource counts computed from fetched data
export interface ResourceCounts {
  instances: number
  rdsInstances: number
  cacheClusters: number
  loadBalancers: number
  lambdaFunctions: number
  volumes: number
  snapshots: number
  elasticIps: number
  s3Buckets: number
  logGroups: number
  autoscalingGroups: number
  total: number
}

// Detection result
export interface DetectionResult {
  detections: WasteDetection[]
  summary: DetectionSummary
  resourceCounts: ResourceCounts
  timestamp: string
}

/**
 * Main waste detector class
 */
export class WasteDetector {
  private supabase: SupabaseClient

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  /**
   * Run full detection across all resources
   * OPTIMIZED: Uses batch fetching and caching
   */
  async detectAll(): Promise<DetectionResult> {
    const detectAllStartTime = performance.now()
    console.log("[Detector] detectAll() started")

    // Check cache first
    if (detectionCache) {
      const age = Date.now() - detectionCache.timestamp
      if (age < CACHE_TTL_MS) {
        const cacheHitTime = performance.now() - detectAllStartTime
        console.log(`[Detector] CACHE HIT - age: ${Math.round(age / 1000)}s, lookup: ${cacheHitTime.toFixed(0)}ms`)
        return detectionCache.result
      }
      console.log(`[Detector] CACHE EXPIRED - Age: ${Math.round(age / 1000)}s exceeds TTL: ${CACHE_TTL_MS / 1000}s`)
    } else {
      console.log("[Detector] CACHE MISS - No cached results")
    }

    console.log("[Detector] Starting parallel fetch of 11 tables...")
    const fetchStartTime = performance.now()

    // OPTIMIZATION: Fetch all resource tables in a single parallel operation
    const resourceData = await this.batchFetchAllResources()

    const fetchDuration = performance.now() - fetchStartTime
    console.log(`[Detector] DB fetch completed in ${fetchDuration.toFixed(0)}ms`)
    console.log(`[Detector] Resource counts:`)
    console.log(`  - instances: ${resourceData.instances.length}`)
    console.log(`  - rds_instances: ${resourceData.rdsInstances.length}`)
    console.log(`  - cache_clusters: ${resourceData.cacheClusters.length}`)
    console.log(`  - load_balancers: ${resourceData.loadBalancers.length}`)
    console.log(`  - lambda_functions: ${resourceData.lambdaFunctions.length}`)
    console.log(`  - volumes: ${resourceData.volumes.length}`)
    console.log(`  - snapshots: ${resourceData.snapshots.length}`)
    console.log(`  - elastic_ips: ${resourceData.elasticIps.length}`)
    console.log(`  - s3_buckets: ${resourceData.s3Buckets.length}`)
    console.log(`  - log_groups: ${resourceData.logGroups.length}`)
    console.log(`  - autoscaling_groups: ${resourceData.autoscalingGroups.length}`)

    // Run all detection functions on pre-fetched data (no more DB calls)
    const detections: WasteDetection[] = []
    const timestamp = new Date().toISOString()

    console.log("[Detector] Starting in-memory detection processing...")

    // Process all detections in-memory using pre-fetched data
    const idleInstances = this.detectIdleInstancesFromData(resourceData.instances)
    console.log(`[Detector] detectIdleInstances: ${idleInstances.length} detections`)
    detections.push(...idleInstances)

    const orphanedEips = this.detectOrphanedEIPsFromData(resourceData.elasticIps)
    console.log(`[Detector] detectOrphanedEIPs: ${orphanedEips.length} detections`)
    detections.push(...orphanedEips)

    const unattachedVolumes = this.detectUnattachedVolumesFromData(resourceData.volumes)
    console.log(`[Detector] detectUnattachedVolumes: ${unattachedVolumes.length} detections`)
    detections.push(...unattachedVolumes)

    const oldSnapshots = this.detectOldSnapshotsFromData(resourceData.snapshots)
    console.log(`[Detector] detectOldSnapshots: ${oldSnapshots.length} detections`)
    detections.push(...oldSnapshots)

    const idleRds = this.detectIdleRDSFromData(resourceData.rdsInstances)
    console.log(`[Detector] detectIdleRDS: ${idleRds.length} detections`)
    detections.push(...idleRds)

    const idleCache = this.detectIdleCacheFromData(resourceData.cacheClusters)
    console.log(`[Detector] detectIdleCache: ${idleCache.length} detections`)
    detections.push(...idleCache)

    const idleLbs = this.detectIdleLoadBalancersFromData(resourceData.loadBalancers)
    console.log(`[Detector] detectIdleLoadBalancers: ${idleLbs.length} detections`)
    detections.push(...idleLbs)

    const overProvLambdas = this.detectOverProvisionedLambdasFromData(resourceData.lambdaFunctions)
    console.log(`[Detector] detectOverProvisionedLambdas: ${overProvLambdas.length} detections`)
    detections.push(...overProvLambdas)

    const s3NoLifecycle = this.detectS3NoLifecycleFromData(resourceData.s3Buckets)
    console.log(`[Detector] detectS3NoLifecycle: ${s3NoLifecycle.length} detections`)
    detections.push(...s3NoLifecycle)

    const logNoRetention = this.detectLogNoRetentionFromData(resourceData.logGroups)
    console.log(`[Detector] detectLogNoRetention: ${logNoRetention.length} detections`)
    detections.push(...logNoRetention)

    const forgottenPreviews = this.detectForgottenPreviewsFromData(resourceData.autoscalingGroups)
    console.log(`[Detector] detectForgottenPreviews: ${forgottenPreviews.length} detections`)
    detections.push(...forgottenPreviews)

    const overProvAsgs = this.detectOverProvisionedASGsFromData(resourceData.autoscalingGroups)
    console.log(`[Detector] detectOverProvisionedASGs: ${overProvAsgs.length} detections`)
    detections.push(...overProvAsgs)

    const staleFeatureEnvs = this.detectStaleFeatureEnvsFromData(resourceData.autoscalingGroups)
    console.log(`[Detector] detectStaleFeatureEnvs: ${staleFeatureEnvs.length} detections`)
    detections.push(...staleFeatureEnvs)

    const idleCiRunners = this.detectIdleCIRunnersFromData(resourceData.instances)
    console.log(`[Detector] detectIdleCIRunners: ${idleCiRunners.length} detections`)
    detections.push(...idleCiRunners)

    const offHoursDev = this.detectOffHoursDevInstancesFromData(resourceData.instances)
    console.log(`[Detector] detectOffHoursDevInstances: ${offHoursDev.length} detections`)
    detections.push(...offHoursDev)

    const overProvInstances = this.detectOverProvisionedInstancesFromData(resourceData.instances)
    console.log(`[Detector] detectOverProvisionedInstances: ${overProvInstances.length} detections`)
    detections.push(...overProvInstances)

    // ==========================================================================
    // QUICK-WIN OPTIMIZATIONS - Phase 1 (No migrations needed)
    // ==========================================================================

    const gp2Volumes = this.detectGp2VolumesFromData(resourceData.volumes)
    console.log(`[Detector] detectGp2Volumes: ${gp2Volumes.length} detections`)
    detections.push(...gp2Volumes)

    const unusedLambdas = this.detectUnusedLambdasFromData(resourceData.lambdaFunctions)
    console.log(`[Detector] detectUnusedLambdas: ${unusedLambdas.length} detections`)
    detections.push(...unusedLambdas)

    const orphanedSnapshots = this.detectOrphanedSnapshotsFromData(resourceData.snapshots, resourceData.volumes)
    console.log(`[Detector] detectOrphanedSnapshots: ${orphanedSnapshots.length} detections`)
    detections.push(...orphanedSnapshots)

    const staticAsgs = this.detectStaticASGsFromData(resourceData.autoscalingGroups)
    console.log(`[Detector] detectStaticASGs: ${staticAsgs.length} detections`)
    detections.push(...staticAsgs)

    // ==========================================================================
    // QUICK-WIN OPTIMIZATIONS - Phase 2 (With migrations)
    // ==========================================================================

    const multiAzNonProd = this.detectMultiAzNonProdFromData(resourceData.rdsInstances)
    console.log(`[Detector] detectMultiAzNonProd: ${multiAzNonProd.length} detections`)
    detections.push(...multiAzNonProd)

    const emptyLbs = this.detectEmptyLoadBalancersFromData(resourceData.loadBalancers)
    console.log(`[Detector] detectEmptyLoadBalancers: ${emptyLbs.length} detections`)
    detections.push(...emptyLbs)

    const s3NoVersionExpiration = this.detectS3NoVersionExpirationFromData(resourceData.s3Buckets)
    console.log(`[Detector] detectS3NoVersionExpiration: ${s3NoVersionExpiration.length} detections`)
    detections.push(...s3NoVersionExpiration)

    const overConfiguredTimeout = this.detectOverConfiguredTimeoutFromData(resourceData.lambdaFunctions)
    console.log(`[Detector] detectOverConfiguredTimeout: ${overConfiguredTimeout.length} detections`)
    detections.push(...overConfiguredTimeout)

    // const processingDuration = performance.now() - processingStartTime
    // console.log(`[Detector] Detection processing completed in ${processingDuration.toFixed(2)}ms`)

    // Calculate summary
    // const summaryStartTime = performance.now()
    const summary = this.calculateSummary(detections)
    // const summaryDuration = performance.now() - summaryStartTime
    // console.log(`[Detector] Summary calculation completed in ${summaryDuration.toFixed(2)}ms`)

    // Compute resource counts from already-fetched data (0 extra queries)
    const resourceCounts = this.computeResourceCounts(resourceData)

    const result: DetectionResult = {
      detections,
      summary,
      resourceCounts,
      timestamp,
    }

    // Cache the result
    detectionCache = {
      result,
      timestamp: Date.now(),
    }

    const totalDuration = performance.now() - detectAllStartTime
    console.log(`[Detector] ✅ Complete: ${totalDuration.toFixed(0)}ms total | DB: ${fetchDuration.toFixed(0)}ms | ${detections.length} detections | $${summary.totalPotentialSavings.toFixed(0)}/mo savings`)

    return result
  }

  /**
   * Batch fetch all resource tables in parallel
   * This is the key optimization - single round-trip for all data
   */
  private async batchFetchAllResources(): Promise<ResourceData> {
    const [
      instances,
      rdsInstances,
      cacheClusters,
      loadBalancers,
      lambdaFunctions,
      volumes,
      snapshots,
      elasticIps,
      s3Buckets,
      logGroups,
      autoscalingGroups,
    ] = await Promise.all([
      this.supabase.from("instances").select("*"),
      this.supabase.from("rds_instances").select("*"),
      this.supabase.from("cache_clusters").select("*"),
      this.supabase.from("load_balancers").select("*"),
      this.supabase.from("lambda_functions").select("*"),
      this.supabase.from("volumes").select("*"),
      this.supabase.from("snapshots").select("*"),
      this.supabase.from("elastic_ips").select("*"),
      this.supabase.from("s3_buckets").select("*"),
      this.supabase.from("log_groups").select("*"),
      this.supabase.from("autoscaling_groups").select("*"),
    ])

    return {
      instances: instances.data ?? [],
      rdsInstances: rdsInstances.data ?? [],
      cacheClusters: cacheClusters.data ?? [],
      loadBalancers: loadBalancers.data ?? [],
      lambdaFunctions: lambdaFunctions.data ?? [],
      volumes: volumes.data ?? [],
      snapshots: snapshots.data ?? [],
      elasticIps: elasticIps.data ?? [],
      s3Buckets: s3Buckets.data ?? [],
      logGroups: logGroups.data ?? [],
      autoscalingGroups: autoscalingGroups.data ?? [],
    }
  }

  /**
   * Detect idle EC2 instances (IN-MEMORY version)
   */
  private detectIdleInstancesFromData(instances: Record<string, unknown>[]): WasteDetection[] {
    // Filter: running instances with CPU < 5% (prefer avg_cpu_7d, fallback to current_cpu)
    const filtered = instances.filter((i) => {
      if (i.state !== "running") return false

      // Use avg_cpu_7d if available, otherwise fall back to current_cpu
      const avg7dCpu = i.avg_cpu_7d as number | null
      const currentCpu = i.current_cpu as number | null
      const cpuValue = avg7dCpu ?? currentCpu

      // Need at least one CPU metric to determine if idle
      if (cpuValue === null || cpuValue === undefined) return false

      return cpuValue < 5
    })

    return filtered.map((instance) => {
      const scenario = WASTE_SCENARIOS.idle_instance
      const monthlyCost = getEC2MonthlyCost(instance.instance_type as string)

      // Use the same fallback logic
      const avg7dCpu = instance.avg_cpu_7d as number | null
      const currentCpu = instance.current_cpu as number | null
      const cpuValue = avg7dCpu ?? currentCpu ?? 0

      let confidence = scenario.baseConfidence
      if (cpuValue < 2) confidence += 10
      if (instance.env === "dev" || instance.env === "staging") confidence += 5

      return this.createDetection({
        scenarioId: "idle_instance",
        resource: instance,
        resourceType: "instances",
        nameField: "name",
        monthlyCost,
        potentialSavings: monthlyCost * 0.9,
        confidence: Math.min(confidence, 100),
        details: {
          instanceType: instance.instance_type,
          avgCpu7d: cpuValue,
          launchTime: instance.launch_time,
        },
      })
    })
  }

  // Legacy async version (kept for backward compatibility)
  private async detectIdleInstances(): Promise<WasteDetection[]> {
    const { data: instances, error } = await this.supabase
      .from("instances")
      .select("*")
      .eq("state", "running")
      .lt("avg_cpu_7d", 5)

    if (error || !instances) return []
    return this.detectIdleInstancesFromData(instances)
  }

  /**
   * Detect orphaned Elastic IPs (IN-MEMORY version)
   */
  private detectOrphanedEIPsFromData(eips: Record<string, unknown>[]): WasteDetection[] {
    console.log(`[Detector] Orphaned EIPs: Checking ${eips.length} elastic IPs`)

    // Filter: EIPs with no associated instance
    const filtered = eips.filter((e) => {
      console.log(`[Detector] EIP: ${e.public_ip} | associated_instance_id: ${e.associated_instance_id}`)
      if (e.associated_instance_id !== null) {
        console.log(`[Detector]   → SKIP: EIP is associated with ${e.associated_instance_id}`)
        return false
      }
      console.log(`[Detector]   → MATCH: Orphaned EIP detected`)
      return true
    })

    console.log(`[Detector] Orphaned EIPs: Found ${filtered.length} orphaned EIPs`)

    return filtered.map((eip) => {
      const scenario = WASTE_SCENARIOS.orphaned_eip
      const monthlyCost = getUnattachedEIPMonthlyCost()

      return this.createDetection({
        scenarioId: "orphaned_eip",
        resource: eip,
        resourceType: "elastic_ips",
        nameField: "public_ip",
        monthlyCost,
        potentialSavings: monthlyCost,
        confidence: scenario.baseConfidence,
        details: {
          publicIp: eip.public_ip,
          allocationId: eip.allocation_id,
          associatedWith: eip.associated_instance_id,
        },
      })
    })
  }

  // Legacy async version
  private async detectOrphanedEIPs(): Promise<WasteDetection[]> {
    const { data: eips, error } = await this.supabase
      .from("elastic_ips")
      .select("*")
      .is("associated_instance_id", null)

    if (error || !eips) return []
    return this.detectOrphanedEIPsFromData(eips)
  }

  /**
   * Detect unattached EBS volumes (IN-MEMORY version)
   */
  private detectUnattachedVolumesFromData(volumes: Record<string, unknown>[]): WasteDetection[] {
    console.log(`[Detector] Unattached Volumes: Checking ${volumes.length} EBS volumes`)

    // Filter: volumes with state = available
    const filtered = volumes.filter((v) => {
      console.log(`[Detector] Volume: ${v.volume_id} | state: ${v.state} | size: ${v.size_gib}GB`)
      if (v.state !== "available") {
        console.log(`[Detector]   → SKIP: Volume state is ${v.state}, not "available"`)
        return false
      }
      console.log(`[Detector]   → MATCH: Unattached volume detected`)
      return true
    })

    console.log(`[Detector] Unattached Volumes: Found ${filtered.length} unattached volumes`)

    return filtered.map((volume) => {
      const scenario = WASTE_SCENARIOS.unattached_volume
      const monthlyCost = getVolumeMonthlyCost(volume.volume_type as string, volume.size_gib as number)

      let confidence = scenario.baseConfidence
      const daysSinceCreation = this.daysSince(volume.created_at as string)
      if (daysSinceCreation > 30) confidence += 10

      return this.createDetection({
        scenarioId: "unattached_volume",
        resource: volume,
        resourceType: "volumes",
        nameField: "volume_id",
        monthlyCost,
        potentialSavings: monthlyCost,
        confidence: Math.min(confidence, 100),
        details: {
          volumeId: volume.volume_id,
          volumeType: volume.volume_type,
          sizeGib: volume.size_gib,
          daysSinceCreation,
        },
      })
    })
  }

  // Legacy async version
  private async detectUnattachedVolumes(): Promise<WasteDetection[]> {
    const { data: volumes, error } = await this.supabase
      .from("volumes")
      .select("*")
      .eq("state", "available")

    if (error || !volumes) return []
    return this.detectUnattachedVolumesFromData(volumes)
  }

  /**
   * Detect old EBS snapshots (IN-MEMORY version)
   */
  private detectOldSnapshotsFromData(snapshots: Record<string, unknown>[]): WasteDetection[] {
    console.log(`[Detector] Old Snapshots: Checking ${snapshots.length} EBS snapshots`)

    // Filter: snapshots older than 90 days
    const filtered = snapshots.filter((s) => {
      const daysOld = this.daysSince(s.created_at as string)
      console.log(`[Detector] Snapshot: ${s.snapshot_id} | created_at: ${s.created_at} | days old: ${daysOld}`)
      if (daysOld <= 90) {
        console.log(`[Detector]   → SKIP: Snapshot is only ${daysOld} days old (threshold: >90 days)`)
        return false
      }
      console.log(`[Detector]   → MATCH: Old snapshot detected (${daysOld} days)`)
      return true
    })

    console.log(`[Detector] Old Snapshots: Found ${filtered.length} old snapshots`)

    return filtered.map((snapshot) => {
      const scenario = WASTE_SCENARIOS.old_snapshot
      const monthlyCost = getSnapshotMonthlyCost(snapshot.size_gib as number)

      const daysOld = this.daysSince(snapshot.created_at as string)
      let confidence = scenario.baseConfidence
      if (daysOld > 180) confidence += 15
      if (daysOld > 365) confidence += 10

      return this.createDetection({
        scenarioId: "old_snapshot",
        resource: snapshot,
        resourceType: "snapshots",
        nameField: "snapshot_id",
        monthlyCost,
        potentialSavings: monthlyCost,
        confidence: Math.min(confidence, 100),
        details: {
          snapshotId: snapshot.snapshot_id,
          sizeGib: snapshot.size_gib,
          daysOld,
          retentionPolicy: snapshot.retention_policy,
        },
      })
    })
  }

  // Legacy async version
  private async detectOldSnapshots(): Promise<WasteDetection[]> {
    const { data: snapshots, error } = await this.supabase
      .from("snapshots")
      .select("*")

    if (error || !snapshots) return []
    return this.detectOldSnapshotsFromData(snapshots)
  }

  /**
   * Detect idle RDS instances (IN-MEMORY version)
   *
   * RELAXED CRITERIA: Detects RDS as idle if ANY of:
   * - CPU < 15% (low utilization)
   * - Connections <= 1 (almost no active connections)
   * - Environment is preview/dev/staging with low activity
   */
  private detectIdleRDSFromData(rdsInstances: Record<string, unknown>[]): WasteDetection[] {
    console.log(`[Detector] RDS Idle: Checking ${rdsInstances.length} RDS instances`)

    // Filter: available RDS with low CPU OR low connections OR non-prod with low activity
    const filtered = rdsInstances.filter((r) => {
      // Get CPU value with null handling
      const avgCpu = r.avg_cpu_7d as number | null
      const currentCpu = r.current_cpu as number | null
      const cpuValue = avgCpu ?? currentCpu

      // Get connections with null handling
      const avgConnections = r.avg_connections_7d as number | null
      const currentConnections = r.current_connections as number | null
      const connectionsValue = avgConnections ?? currentConnections

      // Get environment
      const env = ((r.env as string) || "").toLowerCase()
      const isNonProd = env.includes("preview") || env.includes("dev") || env.includes("staging") || env.includes("test")

      console.log(`[Detector] RDS: ${r.db_instance_id} | State: ${r.state} | CPU: ${cpuValue}% | Conn: ${connectionsValue} | Env: ${env}`)

      if (r.state !== "available") {
        console.log(`[Detector]   → SKIP: State is ${r.state}, not "available"`)
        return false
      }

      // RELAXED: Use OR logic - detect if ANY condition is met
      const isLowCpu = cpuValue !== null && cpuValue !== undefined && cpuValue < 15
      const isLowConnections = connectionsValue !== null && connectionsValue !== undefined && connectionsValue <= 1
      const isIdleNonProd = isNonProd && cpuValue !== null && cpuValue < 25 && (connectionsValue === null || connectionsValue < 5)

      // If both metrics are null, consider it potentially idle
      const hasNoMetrics = (cpuValue === null || cpuValue === undefined) && (connectionsValue === null || connectionsValue === undefined)

      if (!isLowCpu && !isLowConnections && !isIdleNonProd && !hasNoMetrics) {
        console.log(`[Detector]   → SKIP: CPU ${cpuValue}% >= 15, Conn ${connectionsValue} > 1, not idle non-prod`)
        return false
      }

      console.log(`[Detector]   → MATCH: Idle RDS detected (lowCPU: ${isLowCpu}, lowConn: ${isLowConnections}, idleNonProd: ${isIdleNonProd})`)
      return true
    })

    console.log(`[Detector] RDS Idle: Found ${filtered.length} idle RDS instances`)

    return filtered.map((rds) => {
      const scenario = WASTE_SCENARIOS.idle_rds
      const monthlyCost = getRDSMonthlyCost(rds.instance_class as string)

      // Use the same null handling
      const avgCpu = rds.avg_cpu_7d as number | null
      const currentCpu = rds.current_cpu as number | null
      const cpuValue = avgCpu ?? currentCpu ?? 0
      const avgConnections = rds.avg_connections_7d as number | null
      const currentConnections = rds.current_connections as number | null
      const connectionsValue = avgConnections ?? currentConnections ?? 0

      let confidence = scenario.baseConfidence
      if (cpuValue < 1) confidence += 10
      if (connectionsValue === 0) confidence += 10

      return this.createDetection({
        scenarioId: "idle_rds",
        resource: rds,
        resourceType: "rds_instances",
        nameField: "db_instance_id",
        monthlyCost,
        potentialSavings: monthlyCost * 0.8,
        confidence: Math.min(confidence, 100),
        details: {
          dbInstanceId: rds.db_instance_id,
          instanceClass: rds.instance_class,
          engine: rds.engine,
          avgCpu7d: cpuValue,
          avgConnections7d: connectionsValue,
        },
      })
    })
  }

  // Legacy async version
  private async detectIdleRDS(): Promise<WasteDetection[]> {
    const { data: rdsInstances, error } = await this.supabase
      .from("rds_instances")
      .select("*")
      .eq("state", "available")
      .lt("avg_cpu_7d", 5)
      .lt("avg_connections_7d", 2)

    if (error || !rdsInstances) return []
    return this.detectIdleRDSFromData(rdsInstances)
  }

  /**
   * Detect idle ElastiCache clusters (IN-MEMORY version)
   *
   * RELAXED CRITERIA: Detects ElastiCache as idle if ANY of:
   * - CPU < 15% (low utilization)
   * - Connections <= 3 (very few active connections)
   * - Environment is preview/dev/staging with low activity
   */
  private detectIdleCacheFromData(clusters: Record<string, unknown>[]): WasteDetection[] {
    console.log(`[Detector] ElastiCache Idle: Checking ${clusters.length} cache clusters`)

    // Filter: clusters with low CPU OR low connections OR non-prod with low activity
    const filtered = clusters.filter((c) => {
      // Get CPU value with null handling
      const avgCpu = c.avg_cpu_7d as number | null
      const currentCpu = c.current_cpu as number | null
      const cpuValue = avgCpu ?? currentCpu

      // Get connections with null handling
      const avgConnections = c.avg_connections_7d as number | null
      const currentConnections = c.current_connections as number | null
      const connectionsValue = avgConnections ?? currentConnections

      // Get environment
      const env = ((c.env as string) || "").toLowerCase()
      const isNonProd = env.includes("preview") || env.includes("dev") || env.includes("staging") || env.includes("test")

      console.log(`[Detector] Cache: ${c.cluster_id} | CPU: ${cpuValue}% | Conn: ${connectionsValue} | Env: ${env}`)

      // RELAXED: Use OR logic - detect if ANY condition is met
      const isLowCpu = cpuValue !== null && cpuValue !== undefined && cpuValue < 15
      const isLowConnections = connectionsValue !== null && connectionsValue !== undefined && connectionsValue <= 3
      const isIdleNonProd = isNonProd && cpuValue !== null && cpuValue < 25 && (connectionsValue === null || connectionsValue < 10)

      // If both metrics are null, consider it potentially idle
      const hasNoMetrics = (cpuValue === null || cpuValue === undefined) && (connectionsValue === null || connectionsValue === undefined)

      if (!isLowCpu && !isLowConnections && !isIdleNonProd && !hasNoMetrics) {
        console.log(`[Detector]   → SKIP: CPU ${cpuValue}% >= 15, Conn ${connectionsValue} > 3, not idle non-prod`)
        return false
      }

      console.log(`[Detector]   → MATCH: Idle cache cluster detected (lowCPU: ${isLowCpu}, lowConn: ${isLowConnections}, idleNonProd: ${isIdleNonProd})`)
      return true
    })

    console.log(`[Detector] ElastiCache Idle: Found ${filtered.length} idle cache clusters`)

    return filtered.map((cluster) => {
      const scenario = WASTE_SCENARIOS.idle_cache
      const monthlyCost = getCacheMonthlyCost(cluster.node_type as string, cluster.num_nodes as number)

      // Use the same null handling
      const avgCpu = cluster.avg_cpu_7d as number | null
      const currentCpu = cluster.current_cpu as number | null
      const cpuValue = avgCpu ?? currentCpu ?? 0
      const avgConnections = cluster.avg_connections_7d as number | null
      const currentConnections = cluster.current_connections as number | null
      const connectionsValue = avgConnections ?? currentConnections ?? 0

      let confidence = scenario.baseConfidence
      if (cpuValue < 1) confidence += 15
      if (connectionsValue === 0) confidence += 10

      return this.createDetection({
        scenarioId: "idle_cache",
        resource: cluster,
        resourceType: "cache_clusters",
        nameField: "cluster_id",
        monthlyCost,
        potentialSavings: monthlyCost,
        confidence: Math.min(confidence, 100),
        details: {
          clusterId: cluster.cluster_id,
          nodeType: cluster.node_type,
          numNodes: cluster.num_nodes,
          engine: cluster.engine,
          avgCpu7d: cpuValue,
          avgConnections7d: connectionsValue,
        },
      })
    })
  }

  // Legacy async version
  private async detectIdleCache(): Promise<WasteDetection[]> {
    const { data: clusters, error } = await this.supabase
      .from("cache_clusters")
      .select("*")
      .lt("avg_cpu_7d", 5)
      .lt("avg_connections_7d", 5)

    if (error || !clusters) return []
    return this.detectIdleCacheFromData(clusters)
  }

  /**
   * Detect idle Load Balancers (IN-MEMORY version)
   */
  private detectIdleLoadBalancersFromData(lbs: Record<string, unknown>[]): WasteDetection[] {
    console.log(`[Detector] Load Balancer Idle: Checking ${lbs.length} load balancers`)

    // Filter: load balancers with avg_request_count_7d < 1000
    const filtered = lbs.filter((lb) => {
      // Get request count with null handling
      const avgRequestCount = lb.avg_request_count_7d as number | null
      const currentRequestCount = lb.current_request_count as number | null
      const requestCount = avgRequestCount ?? currentRequestCount

      console.log(`[Detector] LB: ${lb.name} | avg_request_count_7d: ${avgRequestCount} | current_request_count: ${currentRequestCount}`)

      // If metrics are null, consider it idle (no activity data means likely unused)
      const requestCheck = requestCount === null || requestCount === undefined ? true : requestCount < 1000

      if (!requestCheck) {
        console.log(`[Detector]   → SKIP: Request count ${requestCount ?? 'N/A'} < 1000: ${requestCheck}`)
        return false
      }

      console.log(`[Detector]   → MATCH: Idle load balancer detected`)
      return true
    })

    console.log(`[Detector] Load Balancer Idle: Found ${filtered.length} idle load balancers`)

    return filtered.map((lb) => {
      const scenario = WASTE_SCENARIOS.idle_load_balancer
      const monthlyCost = getLoadBalancerMonthlyCost(0.1)

      // Use the same null handling
      const avgRequestCount = lb.avg_request_count_7d as number | null
      const currentRequestCount = lb.current_request_count as number | null
      const requestCount = avgRequestCount ?? currentRequestCount ?? 0

      let confidence = scenario.baseConfidence
      if (requestCount < 100) confidence += 15

      return this.createDetection({
        scenarioId: "idle_load_balancer",
        resource: lb,
        resourceType: "load_balancers",
        nameField: "name",
        monthlyCost,
        potentialSavings: monthlyCost,
        confidence: Math.min(confidence, 100),
        details: {
          name: lb.name,
          type: lb.type,
          env: lb.env,
          avgRequestCount7d: requestCount,
        },
      })
    })
  }

  // Legacy async version
  private async detectIdleLoadBalancers(): Promise<WasteDetection[]> {
    const { data: lbs, error } = await this.supabase
      .from("load_balancers")
      .select("*")
      .lt("avg_request_count_7d", 1000)

    if (error || !lbs) return []
    return this.detectIdleLoadBalancersFromData(lbs)
  }

  /**
   * Detect over-provisioned Lambda functions (IN-MEMORY version)
   */
  private detectOverProvisionedLambdasFromData(lambdas: Record<string, unknown>[]): WasteDetection[] {
    console.log(`[Detector] Lambda Over-provisioned: Checking ${lambdas.length} Lambda functions`)

    // Filter: functions with memory data and using < 50% of allocated memory
    const filtered = lambdas.filter((fn) => {
      const avgMemory = fn.avg_memory_used_mb_7d as number
      const memoryMb = fn.memory_mb as number

      console.log(`[Detector] Lambda: ${fn.name} | memory_mb: ${memoryMb} | avg_memory_used_mb_7d: ${avgMemory}`)

      if (!avgMemory || !memoryMb) {
        console.log(`[Detector]   → SKIP: Missing memory metrics (avg_memory: ${avgMemory}, memory_mb: ${memoryMb})`)
        return false
      }

      const utilizationPct = (avgMemory / memoryMb) * 100
      if (utilizationPct >= 50) {
        console.log(`[Detector]   → SKIP: Memory utilization ${utilizationPct.toFixed(1)}% >= 50%`)
        return false
      }

      console.log(`[Detector]   → MATCH: Over-provisioned Lambda (${utilizationPct.toFixed(1)}% utilization)`)
      return true
    })

    console.log(`[Detector] Lambda Over-provisioned: Found ${filtered.length} over-provisioned functions`)

    return filtered.map((fn) => {
      const scenario = WASTE_SCENARIOS.over_provisioned_lambda
      const avgMemory = fn.avg_memory_used_mb_7d as number
      const memoryMb = fn.memory_mb as number
      const utilizationPct = (avgMemory / memoryMb) * 100

      // Calculate optimal memory (round up to nearest 64MB, with 1.5x safety margin)
      const optimalMemory = Math.max(128, Math.ceil((avgMemory * 1.5) / 64) * 64)

      // Get actual metrics from the function
      const invocations7d = (fn.invocations_7d as number) || 0
      const avgDurationMs = (fn.avg_duration_ms_7d as number) || 0
      
      // Convert 7-day metrics to monthly (multiply by ~4.2857)
      const monthlyInvocations = invocations7d * (30 / 7)
      
      // Use estimated_monthly_cost from database if available, otherwise calculate
      let monthlyCost: number
      if (fn.estimated_monthly_cost && (fn.estimated_monthly_cost as number) > 0) {
        monthlyCost = fn.estimated_monthly_cost as number
      } else if (invocations7d > 0 && avgDurationMs > 0) {
        // Calculate monthly cost using proper pricing function
        monthlyCost = getLambdaMonthlyCost(memoryMb, avgDurationMs, monthlyInvocations)
      } else {
        // Fallback: use a reasonable estimate based on memory allocation
        // Lambda minimum cost for a function with average usage
        const estimatedInvocationsPerMonth = 100000 // conservative estimate
        const estimatedAvgDuration = avgDurationMs || 100 // ms
        monthlyCost = getLambdaMonthlyCost(memoryMb, estimatedAvgDuration, estimatedInvocationsPerMonth)
      }

      // Calculate optimized monthly cost with the recommended memory
      let optimizedMonthlyCost: number
      if (invocations7d > 0 && avgDurationMs > 0) {
        optimizedMonthlyCost = getLambdaMonthlyCost(optimalMemory, avgDurationMs, monthlyInvocations)
      } else {
        // Use the same estimated invocations as we used for current cost
        const estimatedInvocationsPerMonth = monthlyInvocations > 0 ? monthlyInvocations : 100000
        const estimatedAvgDuration = avgDurationMs > 0 ? avgDurationMs : 100
        optimizedMonthlyCost = getLambdaMonthlyCost(optimalMemory, estimatedAvgDuration, estimatedInvocationsPerMonth)
      }

      // Potential savings is the difference between current and optimized costs
      const potentialSavings = Math.max(0, monthlyCost - optimizedMonthlyCost)

      let confidence = scenario.baseConfidence
      if (utilizationPct < 25) confidence += 10
      if (utilizationPct < 10) confidence += 5

      return this.createDetection({
        scenarioId: "over_provisioned_lambda",
        resource: fn,
        resourceType: "lambda_functions",
        nameField: "name",
        monthlyCost,
        potentialSavings,
        confidence: Math.min(confidence, 100),
        details: {
          functionName: fn.name,
          currentMemoryMb: memoryMb,
          avgMemoryUsedMb: avgMemory,
          utilizationPct: Math.round(utilizationPct),
          recommendedMemoryMb: optimalMemory,
          invocations7d,
          avgDurationMs,
          currentMonthlyCost: monthlyCost,
          optimizedMonthlyCost,
        },
      })
    })
  }

  // Legacy async version
  private async detectOverProvisionedLambdas(): Promise<WasteDetection[]> {
    const { data: lambdas, error } = await this.supabase
      .from("lambda_functions")
      .select("*")
      .not("avg_memory_used_mb_7d", "is", null)

    if (error || !lambdas) return []
    return this.detectOverProvisionedLambdasFromData(lambdas)
  }

  /**
   * Detect S3 buckets without lifecycle policies (IN-MEMORY version)
   */
  private detectS3NoLifecycleFromData(buckets: Record<string, unknown>[]): WasteDetection[] {
    console.log(`[Detector] S3 No Lifecycle: Checking ${buckets.length} S3 buckets`)

    // Filter: buckets with empty or no lifecycle policy/rules
    const filtered = buckets.filter((b) => {
      // Check both lifecycle_policy and lifecycle_rules columns
      const policy = b.lifecycle_policy as Record<string, unknown> | null
      const rules = b.lifecycle_rules as unknown[] | null

      console.log(`[Detector] S3: ${b.name} | lifecycle_policy: ${policy ? 'set' : 'null'} | lifecycle_rules: ${rules ? `${rules.length} rules` : 'null'}`)

      // Has rules in lifecycle_rules column? Skip
      if (rules && Array.isArray(rules) && rules.length > 0) {
        console.log(`[Detector]   → SKIP: Has ${rules.length} lifecycle rules`)
        return false
      }

      // Has policy in lifecycle_policy column? Skip
      if (policy && Object.keys(policy).length > 0) {
        const policyRules = (policy as { rules?: unknown[] }).rules
        if (policyRules && policyRules.length > 0) {
          console.log(`[Detector]   → SKIP: Has lifecycle policy with ${policyRules.length} rules`)
          return false
        }
      }

      console.log(`[Detector]   → MATCH: S3 bucket without lifecycle policy`)
      return true
    })

    console.log(`[Detector] S3 No Lifecycle: Found ${filtered.length} buckets without lifecycle`)

    return filtered.map((bucket) => {
      const scenario = WASTE_SCENARIOS.s3_no_lifecycle
      const estimatedSizeGb = 100
      const monthlyCost = estimatedSizeGb * 0.023
      const potentialSavings = getS3TieringSavings(estimatedSizeGb)

      return this.createDetection({
        scenarioId: "s3_no_lifecycle",
        resource: bucket,
        resourceType: "s3_buckets",
        nameField: "name",
        monthlyCost,
        potentialSavings,
        confidence: scenario.baseConfidence,
        details: {
          bucketName: bucket.name,
          env: bucket.env,
          lifecyclePolicy: bucket.lifecycle_policy,
          recommendation: "Add lifecycle policy to tier data to cheaper storage",
        },
      })
    })
  }

  // Legacy async version
  private async detectS3NoLifecycle(): Promise<WasteDetection[]> {
    const { data: buckets, error } = await this.supabase
      .from("s3_buckets")
      .select("*")

    if (error || !buckets) return []
    return this.detectS3NoLifecycleFromData(buckets)
  }

  /**
   * Detect CloudWatch Log Groups without retention (IN-MEMORY version)
   */
  private detectLogNoRetentionFromData(logGroups: Record<string, unknown>[]): WasteDetection[] {
    console.log(`[Detector] Log No Retention: Checking ${logGroups.length} CloudWatch log groups`)

    // Filter: log groups with no retention set (check both retention_days and retention_in_days)
    const filtered = logGroups.filter((lg) => {
      console.log(`[Detector] Log Group: ${lg.name} | retention_days: ${lg.retention_days} | retention_in_days: ${lg.retention_in_days}`)

      // Skip if retention_in_days is set (from executor)
      if (lg.retention_in_days !== null && lg.retention_in_days !== undefined) {
        console.log(`[Detector]   → SKIP: Has retention_in_days set to ${lg.retention_in_days}`)
        return false
      }
      // Skip if retention_days is set (original column)
      if (lg.retention_days !== null && lg.retention_days !== undefined) {
        console.log(`[Detector]   → SKIP: Has retention_days set to ${lg.retention_days}`)
        return false
      }

      console.log(`[Detector]   → MATCH: Log group without retention policy`)
      return true
    })

    console.log(`[Detector] Log No Retention: Found ${filtered.length} log groups without retention`)

    return filtered.map((lg) => {
      const scenario = WASTE_SCENARIOS.log_no_retention
      const estimatedSizeGb = 10
      const currentMonthlyCost = estimatedSizeGb * 0.03
      const potentialSavings = currentMonthlyCost * 0.9

      return this.createDetection({
        scenarioId: "log_no_retention",
        resource: lg,
        resourceType: "log_groups",
        nameField: "name",
        monthlyCost: currentMonthlyCost,
        potentialSavings,
        confidence: scenario.baseConfidence,
        details: {
          logGroupName: lg.name,
          env: lg.env,
          currentRetention: "Never expires",
          recommendedRetention: "30 days",
        },
      })
    })
  }

  // Legacy async version
  private async detectLogNoRetention(): Promise<WasteDetection[]> {
    const { data: logGroups, error } = await this.supabase
      .from("log_groups")
      .select("*")
      .is("retention_days", null)

    if (error || !logGroups) return []
    return this.detectLogNoRetentionFromData(logGroups)
  }

  /**
   * Detect forgotten preview environments (IN-MEMORY version)
   * ASGs with 'preview' in name or env, with low utilization
   */
  private detectForgottenPreviewsFromData(asgs: Record<string, unknown>[]): WasteDetection[] {
    console.log(`[Detector] Forgotten Previews: Checking ${asgs.length} Auto Scaling Groups`)

    // Filter for preview environments with low utilization
    // Skip ASGs with desired_capacity = 0 (already terminated)
    const filtered = asgs.filter((asg) => {
      const desiredCapacity = asg.desired_capacity as number
      const env = (asg.env as string)?.toLowerCase() || ""
      const name = (asg.name as string)?.toLowerCase() || ""

      console.log(`[Detector] ASG (Preview): ${asg.name} | env: ${env} | capacity: ${desiredCapacity} | utilization: ${asg.current_utilization}`)

      // Skip already terminated ASGs (capacity = 0)
      if (!desiredCapacity || desiredCapacity === 0) {
        console.log(`[Detector]   → SKIP: Capacity is 0 (already terminated)`)
        return false
      }

      const isPreview = env.includes("preview") || name.includes("preview") || name.includes("pr-")
      if (!isPreview) {
        console.log(`[Detector]   → SKIP: Not a preview environment`)
        return false
      }

      const isLowUtil = !asg.current_utilization || (asg.current_utilization as number) < 10
      if (!isLowUtil) {
        console.log(`[Detector]   → SKIP: Utilization ${asg.current_utilization}% >= 10%`)
        return false
      }

      console.log(`[Detector]   → MATCH: Forgotten preview environment`)
      return true
    })

    console.log(`[Detector] Forgotten Previews: Found ${filtered.length} forgotten preview environments`)

    return filtered.map((asg) => {
      const scenario = WASTE_SCENARIOS.forgotten_preview
      const instanceCost = getEC2MonthlyCost(asg.instance_type as string)
      const monthlyCost = instanceCost * (asg.desired_capacity as number)

      let confidence = scenario.baseConfidence
      const daysOld = this.daysSince(asg.created_at as string)
      if (daysOld > 7) confidence += 10
      if (daysOld > 14) confidence += 5

      return this.createDetection({
        scenarioId: "forgotten_preview",
        resource: asg,
        resourceType: "autoscaling_groups",
        nameField: "name",
        monthlyCost,
        potentialSavings: monthlyCost,
        confidence: Math.min(confidence, 100),
        details: {
          asgName: asg.name,
          instanceType: asg.instance_type,
          desiredCapacity: asg.desired_capacity,
          currentUtilization: asg.current_utilization || 0,
          daysOld,
        },
      })
    })
  }

  // Legacy async version
  private async detectForgottenPreviews(): Promise<WasteDetection[]> {
    const { data: asgs, error } = await this.supabase
      .from("autoscaling_groups")
      .select("*")

    if (error || !asgs) return []
    return this.detectForgottenPreviewsFromData(asgs)
  }

  /**
   * Detect over-provisioned Auto Scaling Groups (IN-MEMORY version)
   * ASGs with more capacity than needed based on utilization
   */
  private detectOverProvisionedASGsFromData(asgs: Record<string, unknown>[]): WasteDetection[] {
    console.log(`[Detector] Over-provisioned ASGs: Checking ${asgs.length} Auto Scaling Groups`)

    // Filter: ASGs with desired_capacity > 1, low utilization, and more than min_size
    const filtered = asgs.filter((asg) => {
      const desiredCapacity = asg.desired_capacity as number
      const utilization = (asg.current_utilization as number) || 0
      const minSize = asg.min_size as number

      console.log(`[Detector] ASG (Over-prov): ${asg.name} | capacity: ${desiredCapacity} | min_size: ${minSize} | utilization: ${utilization}%`)

      if (desiredCapacity <= 1) {
        console.log(`[Detector]   → SKIP: Capacity ${desiredCapacity} <= 1`)
        return false
      }
      if (utilization >= 30) {
        console.log(`[Detector]   → SKIP: Utilization ${utilization}% >= 30%`)
        return false
      }
      if (desiredCapacity <= minSize) {
        console.log(`[Detector]   → SKIP: Capacity ${desiredCapacity} <= min_size ${minSize}`)
        return false
      }

      console.log(`[Detector]   → MATCH: Over-provisioned ASG`)
      return true
    })

    console.log(`[Detector] Over-provisioned ASGs: Found ${filtered.length} over-provisioned ASGs`)

    return filtered.map((asg) => {
      const scenario = WASTE_SCENARIOS.over_provisioned_asg
      const utilization = (asg.current_utilization as number) || 0
      const desiredCapacity = asg.desired_capacity as number
      const minSize = asg.min_size as number
      const instanceCost = getEC2MonthlyCost(asg.instance_type as string)
      const currentMonthlyCost = instanceCost * desiredCapacity

      const optimalCapacity = Math.max(
        minSize,
        Math.ceil(desiredCapacity * (utilization / 50))
      )
      const savingsCapacity = desiredCapacity - optimalCapacity
      const potentialSavings = instanceCost * savingsCapacity

      let confidence = scenario.baseConfidence
      if (utilization < 20) confidence += 10
      if (utilization < 10) confidence += 10

      return this.createDetection({
        scenarioId: "over_provisioned_asg",
        resource: asg,
        resourceType: "autoscaling_groups",
        nameField: "name",
        monthlyCost: currentMonthlyCost,
        potentialSavings,
        confidence: Math.min(confidence, 100),
        details: {
          asgName: asg.name,
          instanceType: asg.instance_type,
          currentCapacity: desiredCapacity,
          minSize: minSize,
          maxSize: asg.max_size,
          currentUtilization: utilization,
          recommendedCapacity: optimalCapacity,
        },
      })
    })
  }

  // Legacy async version
  private async detectOverProvisionedASGs(): Promise<WasteDetection[]> {
    const { data: asgs, error } = await this.supabase
      .from("autoscaling_groups")
      .select("*")
      .gt("desired_capacity", 1)

    if (error || !asgs) return []
    return this.detectOverProvisionedASGsFromData(asgs)
  }

  /**
   * Detect stale feature branch environments (IN-MEMORY version)
   * ASGs with 'feature' in name, older than 7 days with low usage
   */
  private detectStaleFeatureEnvsFromData(asgs: Record<string, unknown>[]): WasteDetection[] {
    console.log(`[Detector] Stale Feature Envs: Checking ${asgs.length} Auto Scaling Groups`)

    // Filter for feature environments older than 7 days
    // Skip ASGs with desired_capacity = 0 (already terminated)
    const filtered = asgs.filter((asg) => {
      const desiredCapacity = asg.desired_capacity as number
      const env = (asg.env as string)?.toLowerCase() || ""
      const name = (asg.name as string)?.toLowerCase() || ""
      const daysOld = this.daysSince(asg.created_at as string)

      console.log(`[Detector] ASG (Feature): ${asg.name} | env: ${env} | capacity: ${desiredCapacity} | days old: ${daysOld} | utilization: ${asg.current_utilization}`)

      // Skip already terminated ASGs (capacity = 0)
      if (!desiredCapacity || desiredCapacity === 0) {
        console.log(`[Detector]   → SKIP: Capacity is 0 (already terminated)`)
        return false
      }

      const isFeature = env.includes("feature") || name.includes("feature") || name.includes("feat-")
      if (!isFeature) {
        console.log(`[Detector]   → SKIP: Not a feature branch environment`)
        return false
      }

      if (daysOld <= 7) {
        console.log(`[Detector]   → SKIP: Only ${daysOld} days old (threshold: >7 days)`)
        return false
      }

      const isLowUtil = !asg.current_utilization || (asg.current_utilization as number) < 20
      if (!isLowUtil) {
        console.log(`[Detector]   → SKIP: Utilization ${asg.current_utilization}% >= 20%`)
        return false
      }

      console.log(`[Detector]   → MATCH: Stale feature branch environment`)
      return true
    })

    console.log(`[Detector] Stale Feature Envs: Found ${filtered.length} stale feature environments`)

    return filtered.map((asg) => {
      const scenario = WASTE_SCENARIOS.stale_feature_env
      const instanceCost = getEC2MonthlyCost(asg.instance_type as string)
      const monthlyCost = instanceCost * (asg.desired_capacity as number)
      const daysOld = this.daysSince(asg.created_at as string)

      let confidence = scenario.baseConfidence
      if (daysOld > 14) confidence += 10
      if (daysOld > 30) confidence += 5

      return this.createDetection({
        scenarioId: "stale_feature_env",
        resource: asg,
        resourceType: "autoscaling_groups",
        nameField: "name",
        monthlyCost,
        potentialSavings: monthlyCost,
        confidence: Math.min(confidence, 100),
        details: {
          asgName: asg.name,
          instanceType: asg.instance_type,
          desiredCapacity: asg.desired_capacity,
          currentUtilization: asg.current_utilization || 0,
          daysOld,
          recommendation: "Feature branch may be abandoned - consider cleanup",
        },
      })
    })
  }

  // Legacy async version
  private async detectStaleFeatureEnvs(): Promise<WasteDetection[]> {
    const { data: asgs, error } = await this.supabase
      .from("autoscaling_groups")
      .select("*")

    if (error || !asgs) return []
    return this.detectStaleFeatureEnvsFromData(asgs)
  }

  /**
   * Detect idle CI runners (IN-MEMORY version)
   * Instances tagged as CI runners that are idle
   */
  private detectIdleCIRunnersFromData(instances: Record<string, unknown>[]): WasteDetection[] {
    // First filter: running instances with avg_cpu_7d < 5
    const lowCpuRunning = instances.filter(
      (i) => i.state === "running" && (i.avg_cpu_7d as number) < 5
    )

    // Then filter for CI runners based on tags or name
    const filtered = lowCpuRunning.filter((instance) => {
      const name = ((instance.name as string) || "").toLowerCase()
      const tags = (instance.tags as Record<string, unknown>) || {}
      const tagValues = Object.values(tags).map((v) => String(v).toLowerCase())
      const tagKeys = Object.keys(tags).map((k) => k.toLowerCase())

      const isCI =
        name.includes("ci") ||
        name.includes("runner") ||
        name.includes("jenkins") ||
        name.includes("gitlab-runner") ||
        name.includes("github-actions") ||
        tagKeys.includes("ci") ||
        tagKeys.includes("runner") ||
        tagValues.some(
          (v) => v.includes("ci") || v.includes("runner") || v.includes("build")
        )

      return isCI
    })

    return filtered.map((instance) => {
      const scenario = WASTE_SCENARIOS.idle_ci_runner
      const monthlyCost = getEC2MonthlyCost(instance.instance_type as string)

      let confidence = scenario.baseConfidence
      if ((instance.avg_cpu_7d as number) < 2) confidence += 5

      return this.createDetection({
        scenarioId: "idle_ci_runner",
        resource: instance,
        resourceType: "instances",
        nameField: "name",
        monthlyCost,
        potentialSavings: monthlyCost,
        confidence: Math.min(confidence, 100),
        details: {
          instanceName: instance.name,
          instanceType: instance.instance_type,
          avgCpu7d: instance.avg_cpu_7d,
          tags: instance.tags,
          recommendation: "CI runner appears idle - terminate if job completed",
        },
      })
    })
  }

  // Legacy async version
  private async detectIdleCIRunners(): Promise<WasteDetection[]> {
    const { data: instances, error } = await this.supabase
      .from("instances")
      .select("*")
      .eq("state", "running")
      .lt("avg_cpu_7d", 5)

    if (error || !instances) return []
    return this.detectIdleCIRunnersFromData(instances)
  }

  /**
   * Detect dev instances running during off-hours (IN-MEMORY version)
   * Dev instances running on weekends or late night
   */
  private detectOffHoursDevInstancesFromData(instances: Record<string, unknown>[]): WasteDetection[] {
    // Check if current time is off-hours (weekend or outside 7am-7pm)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const hour = now.getHours()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isOffHours = hour < 7 || hour > 19

    // Only run this detection during off-hours
    if (!isWeekend && !isOffHours) {
      return []
    }

    // Filter: running dev instances
    const filtered = instances.filter(
      (i) => i.state === "running" && i.env === "dev"
    )

    return filtered.map((instance) => {
      const scenario = WASTE_SCENARIOS.off_hours_dev
      const monthlyCost = getEC2MonthlyCost(instance.instance_type as string)
      const offHoursSavings = monthlyCost * 0.6

      let confidence = scenario.baseConfidence
      if (isWeekend) confidence += 10
      if ((instance.avg_cpu_7d as number) < 5) confidence += 5

      return this.createDetection({
        scenarioId: "off_hours_dev",
        resource: instance,
        resourceType: "instances",
        nameField: "name",
        monthlyCost,
        potentialSavings: offHoursSavings,
        confidence: Math.min(confidence, 100),
        details: {
          instanceName: instance.name,
          instanceType: instance.instance_type,
          avgCpu7d: instance.avg_cpu_7d,
          isWeekend,
          currentHour: hour,
          recommendation: "Stop dev instances during off-hours to save costs",
        },
      })
    })
  }

  // Legacy async version
  private async detectOffHoursDevInstances(): Promise<WasteDetection[]> {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const hour = now.getHours()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isOffHours = hour < 7 || hour > 19

    if (!isWeekend && !isOffHours) {
      return []
    }

    const { data: instances, error } = await this.supabase
      .from("instances")
      .select("*")
      .eq("state", "running")
      .eq("env", "dev")

    if (error || !instances) return []
    return this.detectOffHoursDevInstancesFromData(instances)
  }

  /**
   * Detect over-provisioned EC2 instances (IN-MEMORY version)
   * Instances with low CPU and memory utilization that can be downsized
   */
  private detectOverProvisionedInstancesFromData(instances: Record<string, unknown>[]): WasteDetection[] {
    // Debug: Log all running instances and their metrics
    const runningInstances = instances.filter((i) => i.state === "running")
    console.log(`[Detector] EC2 Rightsizing: Checking ${runningInstances.length} running instances out of ${instances.length} total`)

    // Filter: running instances with low utilization that can be downsized
    // - CPU < 30% (prefer avg_cpu_7d, fallback to current_cpu)
    // - Memory < 40% (prefer current_memory, fallback to check if we have any metric)
    // - Instance type has a smaller option available
    // - Exclude instances already flagged as idle (CPU < 5%)
    const filtered = instances.filter((i) => {
      if (i.state !== "running") return false

      // Use avg_cpu_7d if available, otherwise fall back to current_cpu
      const avg7dCpu = i.avg_cpu_7d as number | null
      const currentCpu = i.current_cpu as number | null
      const cpuValue = avg7dCpu ?? currentCpu ?? null

      // Use current_memory if available
      const currentMemory = i.current_memory as number | null

      const instanceType = i.instance_type as string
      const smallerType = getRecommendedSmallerInstance(instanceType)

      // Debug logging for each instance with raw values
      console.log(`[Detector] EC2 Rightsizing: ${i.name} | Type: ${instanceType} | avg_cpu_7d: ${avg7dCpu} | current_cpu: ${currentCpu} | current_memory: ${currentMemory} | Smaller: ${smallerType || 'NONE'}`)

      // Skip if no CPU metric available at all
      if (cpuValue === null) {
        console.log(`[Detector]   → SKIP: No CPU metric available (avg_cpu_7d and current_cpu both null)`)
        return false
      }

      // Skip if already idle (will be caught by idle detection)
      if (cpuValue < 5) {
        console.log(`[Detector]   → SKIP: CPU too low (${cpuValue}% < 5%), will use idle detection`)
        return false
      }

      // Check if utilization is low enough to warrant rightsizing
      const lowCpu = cpuValue < 30
      // If memory is null, only check CPU (more lenient check)
      const lowMemory = currentMemory === null || currentMemory < 40

      // Both CPU must be low, and memory either unavailable or low
      if (!lowCpu || !lowMemory) {
        console.log(`[Detector]   → SKIP: Utilization not low enough (CPU ${cpuValue}% < 30: ${lowCpu}, Mem ${currentMemory ?? 'N/A'}% < 40: ${lowMemory})`)
        return false
      }

      // Must have a smaller instance type available
      if (!smallerType) {
        console.log(`[Detector]   → SKIP: No smaller instance type available for ${instanceType}`)
        return false
      }

      console.log(`[Detector]   → MATCH: Will recommend downsizing to ${smallerType}`)
      return true
    })

    console.log(`[Detector] EC2 Rightsizing: Found ${filtered.length} instances to rightsize`)

    return filtered.map((instance) => {
      const scenario = WASTE_SCENARIOS.over_provisioned_instance
      const instanceType = instance.instance_type as string

      // Use the same fallback logic as filtering
      const avg7dCpu = instance.avg_cpu_7d as number | null
      const currentCpu = instance.current_cpu as number | null
      const cpuValue = avg7dCpu ?? currentCpu ?? 0
      const currentMemory = (instance.current_memory as number) ?? 0

      // Get current and recommended instance details
      const currentSpecs = getEC2InstanceSpecs(instanceType)
      const recommendedType = getRecommendedSmallerInstance(instanceType)!
      const recommendedSpecs = getEC2InstanceSpecs(recommendedType)

      // Calculate costs
      const currentMonthlyCost = getEC2MonthlyCost(instanceType)
      const recommendedMonthlyCost = getEC2MonthlyCost(recommendedType)
      const potentialSavings = currentMonthlyCost - recommendedMonthlyCost

      // Adjust confidence based on how underutilized the instance is
      let confidence = scenario.baseConfidence
      if (cpuValue < 15) confidence += 10
      if (currentMemory < 25) confidence += 5
      if (instance.env === "dev" || instance.env === "staging") confidence += 5

      return this.createDetection({
        scenarioId: "over_provisioned_instance",
        resource: instance,
        resourceType: "instances",
        nameField: "name",
        monthlyCost: currentMonthlyCost,
        potentialSavings,
        confidence: Math.min(confidence, 100),
        details: {
          instanceName: instance.name,
          instanceId: instance.instance_id,
          currentInstanceType: instanceType,
          recommendedInstanceType: recommendedType,
          currentVcpu: currentSpecs?.vcpu,
          currentMemoryGb: currentSpecs?.memoryGb,
          recommendedVcpu: recommendedSpecs?.vcpu,
          recommendedMemoryGb: recommendedSpecs?.memoryGb,
          avgCpu7d: cpuValue,
          currentMemoryPct: currentMemory,
          currentMonthlyCost,
          recommendedMonthlyCost,
          recommendation: `Downsize from ${instanceType} to ${recommendedType}`,
        },
      })
    })
  }

  // ============================================================================
  // QUICK-WIN OPTIMIZATIONS - Phase 1 (No migrations needed)
  // ============================================================================

  /**
   * Detect GP2 volumes that should be upgraded to GP3 (IN-MEMORY version)
   * GP3 offers ~20% cost savings with better baseline performance
   */
  private detectGp2VolumesFromData(volumes: Record<string, unknown>[]): WasteDetection[] {
    console.log(`[Detector] GP2 Volumes: Checking ${volumes.length} EBS volumes`)

    // Filter: volumes with volume_type = 'gp2' and not deleted
    const filtered = volumes.filter((v) => {
      const volumeType = v.volume_type as string
      const state = v.state as string

      console.log(`[Detector] Volume: ${v.volume_id} | type: ${volumeType} | state: ${state}`)

      if (state === "deleted") {
        console.log(`[Detector]   → SKIP: Volume is deleted`)
        return false
      }

      if (volumeType !== "gp2") {
        console.log(`[Detector]   → SKIP: Volume type is ${volumeType}, not gp2`)
        return false
      }

      console.log(`[Detector]   → MATCH: GP2 volume detected`)
      return true
    })

    console.log(`[Detector] GP2 Volumes: Found ${filtered.length} gp2 volumes to upgrade`)

    return filtered.map((volume) => {
      const scenario = WASTE_SCENARIOS.gp2_volume
      const monthlyCost = getVolumeMonthlyCost("gp2", volume.size_gib as number)
      // GP3 is ~20% cheaper than GP2
      const gp3Cost = getVolumeMonthlyCost("gp3", volume.size_gib as number)
      const potentialSavings = monthlyCost - gp3Cost

      return this.createDetection({
        scenarioId: "gp2_volume",
        resource: volume,
        resourceType: "volumes",
        nameField: "volume_id",
        monthlyCost,
        potentialSavings,
        confidence: scenario.baseConfidence,
        details: {
          volumeId: volume.volume_id,
          currentType: "gp2",
          recommendedType: "gp3",
          sizeGib: volume.size_gib,
          currentMonthlyCost: monthlyCost,
          projectedMonthlyCost: gp3Cost,
        },
      })
    })
  }

  /**
   * Detect unused Lambda functions (IN-MEMORY version)
   * Functions with zero invocations in the last 7 days
   */
  private detectUnusedLambdasFromData(lambdas: Record<string, unknown>[]): WasteDetection[] {
    console.log(`[Detector] Unused Lambdas: Checking ${lambdas.length} Lambda functions`)

    // Filter: functions with invocations_7d = 0 or null
    const filtered = lambdas.filter((fn) => {
      const invocations = fn.invocations_7d as number | null

      console.log(`[Detector] Lambda: ${fn.name} | invocations_7d: ${invocations}`)

      if (invocations !== null && invocations !== undefined && invocations > 0) {
        console.log(`[Detector]   → SKIP: Has ${invocations} invocations in 7 days`)
        return false
      }

      console.log(`[Detector]   → MATCH: Unused Lambda detected`)
      return true
    })

    console.log(`[Detector] Unused Lambdas: Found ${filtered.length} unused Lambda functions`)

    return filtered.map((fn) => {
      const scenario = WASTE_SCENARIOS.unused_lambda
      // Estimate cost based on memory allocation (even unused functions have storage costs)
      const memoryMb = (fn.memory_mb as number) || 128
      const estimatedMonitoringCost = 0.50 // CloudWatch Logs/metrics overhead
      const monthlyCost = estimatedMonitoringCost

      return this.createDetection({
        scenarioId: "unused_lambda",
        resource: fn,
        resourceType: "lambda_functions",
        nameField: "name",
        monthlyCost,
        potentialSavings: monthlyCost,
        confidence: scenario.baseConfidence,
        details: {
          functionName: fn.name,
          memoryMb,
          invocations7d: 0,
          runtime: fn.runtime,
          lastModified: fn.updated_at,
        },
      })
    })
  }

  /**
   * Detect orphaned snapshots (IN-MEMORY version)
   * Snapshots whose source volume no longer exists
   */
  private detectOrphanedSnapshotsFromData(
    snapshots: Record<string, unknown>[],
    volumes: Record<string, unknown>[]
  ): WasteDetection[] {
    console.log(`[Detector] Orphaned Snapshots: Checking ${snapshots.length} snapshots against ${volumes.length} volumes`)

    // Build a set of all existing volume IDs (not deleted)
    const existingVolumeIds = new Set(
      volumes
        .filter((v) => v.state !== "deleted")
        .map((v) => v.volume_id as string)
    )

    console.log(`[Detector] Orphaned Snapshots: ${existingVolumeIds.size} active volumes found`)

    // Filter: snapshots whose source_volume_id doesn't exist
    const filtered = snapshots.filter((s) => {
      const sourceVolumeId = s.source_volume_id as string | null

      console.log(`[Detector] Snapshot: ${s.snapshot_id} | source_volume_id: ${sourceVolumeId}`)

      // If no source volume ID, can't determine if orphaned
      if (!sourceVolumeId) {
        console.log(`[Detector]   → SKIP: No source volume ID`)
        return false
      }

      // Check if the source volume still exists
      if (existingVolumeIds.has(sourceVolumeId)) {
        console.log(`[Detector]   → SKIP: Source volume ${sourceVolumeId} still exists`)
        return false
      }

      console.log(`[Detector]   → MATCH: Orphaned snapshot (volume ${sourceVolumeId} no longer exists)`)
      return true
    })

    console.log(`[Detector] Orphaned Snapshots: Found ${filtered.length} orphaned snapshots`)

    return filtered.map((snapshot) => {
      const scenario = WASTE_SCENARIOS.orphaned_snapshot
      const monthlyCost = getSnapshotMonthlyCost(snapshot.size_gib as number)

      return this.createDetection({
        scenarioId: "orphaned_snapshot",
        resource: snapshot,
        resourceType: "snapshots",
        nameField: "snapshot_id",
        monthlyCost,
        potentialSavings: monthlyCost,
        confidence: scenario.baseConfidence,
        details: {
          snapshotId: snapshot.snapshot_id,
          sourceVolumeId: snapshot.source_volume_id,
          sizeGib: snapshot.size_gib,
          createdAt: snapshot.created_at,
          daysOld: this.daysSince(snapshot.created_at as string),
        },
      })
    })
  }

  /**
   * Detect static ASGs (IN-MEMORY version)
   * ASGs with min_size = max_size = desired_capacity > 1 (not actually scaling)
   */
  private detectStaticASGsFromData(asgs: Record<string, unknown>[]): WasteDetection[] {
    console.log(`[Detector] Static ASGs: Checking ${asgs.length} Auto Scaling Groups`)

    // Filter: ASGs where min = max = desired and desired > 1
    const filtered = asgs.filter((asg) => {
      const minSize = asg.min_size as number
      const maxSize = asg.max_size as number
      const desiredCapacity = asg.desired_capacity as number

      console.log(`[Detector] ASG: ${asg.name} | min: ${minSize} | max: ${maxSize} | desired: ${desiredCapacity}`)

      // Skip terminated ASGs
      if (desiredCapacity === 0) {
        console.log(`[Detector]   → SKIP: ASG is terminated (capacity = 0)`)
        return false
      }

      // Check if static (all values equal)
      if (minSize !== maxSize || maxSize !== desiredCapacity) {
        console.log(`[Detector]   → SKIP: ASG has dynamic scaling (min ≠ max or max ≠ desired)`)
        return false
      }

      // Only flag if desired > 1 (single instance ASGs might be intentional)
      if (desiredCapacity <= 1) {
        console.log(`[Detector]   → SKIP: Single instance ASG (may be intentional)`)
        return false
      }

      console.log(`[Detector]   → MATCH: Static ASG detected (min = max = desired = ${desiredCapacity})`)
      return true
    })

    console.log(`[Detector] Static ASGs: Found ${filtered.length} static ASGs`)

    return filtered.map((asg) => {
      const scenario = WASTE_SCENARIOS.static_asg
      const instanceCost = getEC2MonthlyCost(asg.instance_type as string)
      const desiredCapacity = asg.desired_capacity as number
      const monthlyCost = instanceCost * desiredCapacity

      // Potential savings from enabling scaling (estimate 30% reduction)
      const potentialSavings = monthlyCost * 0.3

      return this.createDetection({
        scenarioId: "static_asg",
        resource: asg,
        resourceType: "autoscaling_groups",
        nameField: "name",
        monthlyCost,
        potentialSavings,
        confidence: scenario.baseConfidence,
        details: {
          asgName: asg.name,
          instanceType: asg.instance_type,
          currentCapacity: desiredCapacity,
          minSize: asg.min_size,
          maxSize: asg.max_size,
          recommendedMinSize: 1,
          recommendedMaxSize: desiredCapacity * 2,
          recommendation: "Enable dynamic scaling to optimize costs based on demand",
        },
      })
    })
  }

  // ============================================================================
  // QUICK-WIN OPTIMIZATIONS - Phase 2 (With migrations)
  // ============================================================================

  /**
   * Detect Multi-AZ enabled on non-production RDS instances (IN-MEMORY version)
   * Multi-AZ doubles the cost and is unnecessary for dev/staging/test environments
   */
  private detectMultiAzNonProdFromData(rdsInstances: Record<string, unknown>[]): WasteDetection[] {
    console.log(`[Detector] Multi-AZ Non-Prod: Checking ${rdsInstances.length} RDS instances`)

    const nonProdEnvs = ["dev", "staging", "test", "preview", "development", "qa"]

    // Filter: RDS with multi_az = true and env in non-prod list
    const filtered = rdsInstances.filter((r) => {
      const multiAz = r.multi_az as boolean
      const env = ((r.env as string) || "").toLowerCase()

      console.log(`[Detector] RDS: ${r.db_instance_id} | multi_az: ${multiAz} | env: ${env}`)

      // If multi_az column doesn't exist or is false, skip
      if (multiAz !== true) {
        console.log(`[Detector]   → SKIP: Multi-AZ not enabled`)
        return false
      }

      // Check if non-production environment
      const isNonProd = nonProdEnvs.some((e) => env.includes(e))
      if (!isNonProd) {
        console.log(`[Detector]   → SKIP: Production environment (${env})`)
        return false
      }

      console.log(`[Detector]   → MATCH: Multi-AZ on non-prod RDS detected`)
      return true
    })

    console.log(`[Detector] Multi-AZ Non-Prod: Found ${filtered.length} instances`)

    return filtered.map((rds) => {
      const scenario = WASTE_SCENARIOS.multi_az_non_prod
      const monthlyCost = getRDSMonthlyCost(rds.instance_class as string)
      // Multi-AZ roughly doubles the cost
      const potentialSavings = monthlyCost * 0.5

      return this.createDetection({
        scenarioId: "multi_az_non_prod",
        resource: rds,
        resourceType: "rds_instances",
        nameField: "db_instance_id",
        monthlyCost,
        potentialSavings,
        confidence: scenario.baseConfidence,
        details: {
          dbInstanceId: rds.db_instance_id,
          instanceClass: rds.instance_class,
          engine: rds.engine,
          env: rds.env,
          multiAz: true,
          recommendation: "Disable Multi-AZ for non-production workloads",
        },
      })
    })
  }

  /**
   * Detect empty Load Balancers (IN-MEMORY version)
   * Load balancers with target_count = 0 or healthy_target_count = 0
   */
  private detectEmptyLoadBalancersFromData(lbs: Record<string, unknown>[]): WasteDetection[] {
    console.log(`[Detector] Empty Load Balancers: Checking ${lbs.length} load balancers`)

    // Filter: LBs with target_count = 0
    const filtered = lbs.filter((lb) => {
      const targetCount = lb.target_count as number | null
      const healthyTargetCount = lb.healthy_target_count as number | null

      console.log(`[Detector] LB: ${lb.name} | target_count: ${targetCount} | healthy_target_count: ${healthyTargetCount}`)

      // If target_count column exists and is 0, it's empty
      if (targetCount !== null && targetCount !== undefined && targetCount === 0) {
        console.log(`[Detector]   → MATCH: Empty LB (target_count = 0)`)
        return true
      }

      // If healthy_target_count exists and is 0 (but target_count might be > 0)
      if (healthyTargetCount !== null && healthyTargetCount !== undefined && healthyTargetCount === 0 && targetCount !== null && targetCount > 0) {
        console.log(`[Detector]   → MATCH: LB with no healthy targets`)
        return true
      }

      console.log(`[Detector]   → SKIP: LB has targets`)
      return false
    })

    console.log(`[Detector] Empty Load Balancers: Found ${filtered.length} empty LBs`)

    return filtered.map((lb) => {
      const scenario = WASTE_SCENARIOS.empty_load_balancer
      // Base ALB cost is ~$16/mo + LCU charges
      const monthlyCost = getLoadBalancerMonthlyCost(0)

      return this.createDetection({
        scenarioId: "empty_load_balancer",
        resource: lb,
        resourceType: "load_balancers",
        nameField: "name",
        monthlyCost,
        potentialSavings: monthlyCost,
        confidence: scenario.baseConfidence,
        details: {
          name: lb.name,
          type: lb.type,
          targetCount: lb.target_count ?? "unknown",
          healthyTargetCount: lb.healthy_target_count ?? "unknown",
          recommendation: "Delete load balancer or register healthy targets",
        },
      })
    })
  }

  /**
   * Detect S3 buckets with versioning but no noncurrent version expiration (IN-MEMORY version)
   * Versioned buckets without expiration accumulate old versions indefinitely
   */
  private detectS3NoVersionExpirationFromData(buckets: Record<string, unknown>[]): WasteDetection[] {
    console.log(`[Detector] S3 No Version Expiration: Checking ${buckets.length} S3 buckets`)

    // Filter: versioned buckets without noncurrent version expiration
    const filtered = buckets.filter((b) => {
      const versioningEnabled = b.versioning_enabled as boolean
      const lifecycleRules = b.lifecycle_rules as unknown[] | null

      console.log(`[Detector] S3: ${b.name} | versioning_enabled: ${versioningEnabled} | lifecycle_rules: ${lifecycleRules?.length ?? 0}`)

      // If versioning not enabled, skip (nothing to expire)
      if (versioningEnabled !== true) {
        console.log(`[Detector]   → SKIP: Versioning not enabled`)
        return false
      }

      // Check if any lifecycle rule has noncurrent_version_expiration
      if (lifecycleRules && Array.isArray(lifecycleRules)) {
        const hasNoncurrentExpiration = lifecycleRules.some((rule) => {
          const r = rule as Record<string, unknown>
          return r.noncurrent_version_expiration || r.NoncurrentVersionExpiration
        })

        if (hasNoncurrentExpiration) {
          console.log(`[Detector]   → SKIP: Has noncurrent version expiration rule`)
          return false
        }
      }

      console.log(`[Detector]   → MATCH: Versioned bucket without noncurrent version expiration`)
      return true
    })

    console.log(`[Detector] S3 No Version Expiration: Found ${filtered.length} buckets`)

    return filtered.map((bucket) => {
      const scenario = WASTE_SCENARIOS.s3_no_version_expiration
      // Estimate based on typical version accumulation
      const estimatedVersionStorageGb = 50
      const monthlyCost = estimatedVersionStorageGb * 0.023
      const potentialSavings = monthlyCost * 0.7 // 70% savings from expiring old versions

      return this.createDetection({
        scenarioId: "s3_no_version_expiration",
        resource: bucket,
        resourceType: "s3_buckets",
        nameField: "name",
        monthlyCost,
        potentialSavings,
        confidence: scenario.baseConfidence,
        details: {
          bucketName: bucket.name,
          versioningEnabled: true,
          hasNoncurrentExpiration: false,
          recommendation: "Add lifecycle rule to expire noncurrent versions after 30 days",
        },
      })
    })
  }

  /**
   * Detect Lambda functions with over-configured timeout (IN-MEMORY version)
   * Functions with timeout >> actual duration
   */
  private detectOverConfiguredTimeoutFromData(lambdas: Record<string, unknown>[]): WasteDetection[] {
    console.log(`[Detector] Over-Configured Timeout: Checking ${lambdas.length} Lambda functions`)

    // Filter: functions where timeout is 3x+ the actual avg duration
    const filtered = lambdas.filter((fn) => {
      const timeoutSeconds = (fn.timeout_seconds as number) || 30
      const avgDurationMs = fn.avg_duration_ms_7d as number | null

      console.log(`[Detector] Lambda: ${fn.name} | timeout: ${timeoutSeconds}s | avg_duration_ms_7d: ${avgDurationMs}`)

      // Need duration data to compare
      if (avgDurationMs === null || avgDurationMs === undefined || avgDurationMs === 0) {
        console.log(`[Detector]   → SKIP: No duration data`)
        return false
      }

      // Convert to same units (seconds)
      const avgDurationSeconds = avgDurationMs / 1000

      // Flag if timeout is 3x or more the actual duration
      if (timeoutSeconds < avgDurationSeconds * 3) {
        console.log(`[Detector]   → SKIP: Timeout ${timeoutSeconds}s is reasonable for ${avgDurationSeconds.toFixed(1)}s avg duration`)
        return false
      }

      // Also skip if timeout is already small (< 10s)
      if (timeoutSeconds < 10) {
        console.log(`[Detector]   → SKIP: Timeout already optimized (< 10s)`)
        return false
      }

      console.log(`[Detector]   → MATCH: Timeout ${timeoutSeconds}s >> avg duration ${avgDurationSeconds.toFixed(1)}s`)
      return true
    })

    console.log(`[Detector] Over-Configured Timeout: Found ${filtered.length} functions`)

    return filtered.map((fn) => {
      const scenario = WASTE_SCENARIOS.over_configured_lambda_timeout
      const memoryMb = (fn.memory_mb as number) || 128
      const timeoutSeconds = (fn.timeout_seconds as number) || 30
      const avgDurationMs = (fn.avg_duration_ms_7d as number) || 0
      const invocations7d = (fn.invocations_7d as number) || 0

      // Calculate recommended timeout (2x avg duration, rounded up, min 3s)
      const recommendedTimeout = Math.max(3, Math.ceil((avgDurationMs / 1000) * 2))

      // Lambda billing is per 1ms of execution, but timeout itself doesn't directly cost
      // However, over-configured timeout can lead to runaway costs if functions hang
      const monthlyCost = getLambdaMonthlyCost(memoryMb, avgDurationMs, invocations7d * (30 / 7))
      const potentialSavings = monthlyCost * 0.1 // Indirect savings from better resource management

      return this.createDetection({
        scenarioId: "over_configured_lambda_timeout",
        resource: fn,
        resourceType: "lambda_functions",
        nameField: "name",
        monthlyCost,
        potentialSavings,
        confidence: scenario.baseConfidence,
        details: {
          functionName: fn.name,
          currentTimeout: timeoutSeconds,
          avgDurationMs: avgDurationMs,
          recommendedTimeout,
          invocations7d,
          recommendation: `Reduce timeout from ${timeoutSeconds}s to ${recommendedTimeout}s`,
        },
      })
    })
  }

  /**
   * Helper to create a detection object
   */
  private createDetection({
    scenarioId,
    resource,
    resourceType,
    nameField,
    monthlyCost,
    potentialSavings,
    confidence,
    details,
  }: {
    scenarioId: WasteScenarioId
    resource: Record<string, unknown>
    resourceType: ResourceType
    nameField: string
    monthlyCost: number
    potentialSavings: number
    confidence: number
    details: Record<string, unknown>
  }): WasteDetection {
    const scenario = WASTE_SCENARIOS[scenarioId]
    const canAutoOptimize = scenario.mode === 2 && !resource.optimization_policy_locked

    return {
      id: `${scenarioId}-${resource.id}`,
      scenarioId,
      scenario,
      // Flattened scenario properties for hooks compatibility
      scenarioName: scenario.name,
      mode: scenario.mode,
      action: scenario.action,
      resourceId: String(resource.id),
      resourceType,
      resourceName: String(resource[nameField] || resource.id),
      accountId: String(resource.account_id || ""),
      region: String(resource.region || ""),
      env: String(resource.env || "unknown"),
      confidence,
      monthlyCost,
      potentialSavings,
      details,
      canAutoOptimize,
      optimizationPolicyLocked: Boolean(resource.optimization_policy_locked),
      createdAt: new Date().toISOString(),
    }
  }

  /**
   * Compute resource counts from pre-fetched data (0 extra queries)
   */
  private computeResourceCounts(resourceData: ResourceData): ResourceCounts {
    const counts: ResourceCounts = {
      instances: resourceData.instances.length,
      rdsInstances: resourceData.rdsInstances.length,
      cacheClusters: resourceData.cacheClusters.length,
      loadBalancers: resourceData.loadBalancers.length,
      lambdaFunctions: resourceData.lambdaFunctions.length,
      volumes: resourceData.volumes.length,
      snapshots: resourceData.snapshots.length,
      elasticIps: resourceData.elasticIps.length,
      s3Buckets: resourceData.s3Buckets.length,
      logGroups: resourceData.logGroups.length,
      autoscalingGroups: resourceData.autoscalingGroups.length,
      total: 0,
    }
    counts.total = Object.values(counts).reduce((sum, val) => sum + val, 0)
    return counts
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(detections: WasteDetection[]): DetectionSummary {
    const summary: DetectionSummary = {
      totalResources: 0,
      wasteDetected: detections.length,
      totalMonthlyCost: 0,
      totalPotentialSavings: 0,
      autoOptimizableSavings: 0,
      byScenario: {} as Record<WasteScenarioId, number>,
      bySeverity: {
        high: 0,
        medium: 0,
        low: 0,
      },
    }

    for (const detection of detections) {
      summary.totalMonthlyCost += detection.monthlyCost
      summary.totalPotentialSavings += detection.potentialSavings

      if (detection.canAutoOptimize) {
        summary.autoOptimizableSavings += detection.potentialSavings
      }

      // Count by scenario
      summary.byScenario[detection.scenarioId] =
        (summary.byScenario[detection.scenarioId] || 0) + 1

      // Count by severity
      summary.bySeverity[detection.scenario.severity]++
    }

    return summary
  }

  /**
   * Calculate days since a date
   */
  private daysSince(dateString: string): number {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  }
}

/**
 * Create a detector instance from connection details
 */
export function createDetector(supabaseUrl: string, supabaseKey: string): WasteDetector {
  return new WasteDetector(supabaseUrl, supabaseKey)
}

/**
 * Clear the detection cache (useful for forcing a fresh detection)
 */
export function clearDetectionCache(): void {
  detectionCache = null
  // console.log("[Detector] Cache cleared")
}

/**
 * Get cache status for debugging
 */
export function getCacheStatus(): { cached: boolean; ageMs: number | null } {
  if (!detectionCache) {
    return { cached: false, ageMs: null }
  }
  return {
    cached: true,
    ageMs: Date.now() - detectionCache.timestamp,
  }
}
