/**
 * Recommendation Engine for Mode 3 (Approval-Based) Workflow
 *
 * Creates, manages, and executes recommendations that require human approval.
 * Integrates with the waste detection engine and action executor.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { WasteDetection } from "./detector"
import { createExecutor, ExecuteActionParams, ActionResult } from "./executor"
import { WASTE_SCENARIOS, WasteScenarioId } from "./scenarios"

// Recommendation status types
export type RecommendationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "snoozed"
  | "scheduled"
  | "executed"
  | "expired"

// Impact level for recommendations
export type ImpactLevel = "low" | "medium" | "high" | "critical"

// Risk level for recommendations
export type RiskLevel = "low" | "medium" | "high"

// Recommendation interface matching the database schema
export interface Recommendation {
  id: string
  detection_id: string
  scenario_id: string
  scenario_name: string
  resource_type: string
  resource_id: string
  resource_name: string
  account_id: string | null
  region: string | null
  env: string | null
  action: string
  title: string
  description: string | null
  ai_explanation: string | null
  impact_level: ImpactLevel
  confidence: number
  risk_level: RiskLevel
  current_monthly_cost: number | null
  potential_savings: number | null
  details: Record<string, unknown>
  status: RecommendationStatus
  snoozed_until: string | null
  scheduled_for: string | null
  rejection_reason: string | null
  user_notes: string | null
  executed_at: string | null
  execution_result: Record<string, unknown> | null
  created_at: string
  updated_at: string
  created_by: string
  actioned_by: string | null
}

// Input for creating a recommendation
export interface CreateRecommendationInput {
  detection: WasteDetection
  title?: string
  description?: string
  aiExplanation?: string
}

// Input for updating a recommendation
export interface UpdateRecommendationInput {
  status?: RecommendationStatus
  rejection_reason?: string
  user_notes?: string
  snoozed_until?: string | null
  scheduled_for?: string | null
  actioned_by?: string
}

// Filter options for listing recommendations
export interface RecommendationFilters {
  status?: RecommendationStatus | RecommendationStatus[]
  scenario_id?: string
  resource_type?: string
  impact_level?: ImpactLevel
  limit?: number
  offset?: number
}

// Resource type breakdown for summary
export interface ResourceTypeBreakdown {
  resourceType: string
  count: number
  savings: number
}

// Scenario breakdown for summary
export interface ScenarioBreakdown {
  scenarioId: string
  scenarioName: string
  count: number
  savings: number
}

// Summary of recommendations
export interface RecommendationSummary {
  total: number
  pending: number
  approved: number
  rejected: number
  snoozed: number
  scheduled: number
  executed: number
  totalPotentialSavings: number
  pendingSavings: number
  // Breakdowns for unified display across Dashboard and Approvals
  byResourceType: ResourceTypeBreakdown[]
  byScenario: ScenarioBreakdown[]
}

/**
 * Determines the impact level based on potential savings
 */
function getImpactLevel(potentialSavings: number): ImpactLevel {
  if (potentialSavings >= 500) return "critical"
  if (potentialSavings >= 200) return "high"
  if (potentialSavings >= 50) return "medium"
  return "low"
}

/**
 * Determines risk level based on resource type and environment
 */
function getRiskLevel(resourceType: string, env: string | null): RiskLevel {
  // Production resources are always high risk
  if (env === "prod" || env === "production") return "high"

  // Databases and caches are medium risk even in non-prod
  if (["rds_instances", "cache_clusters"].includes(resourceType)) {
    return env === "staging" ? "medium" : "low"
  }

  // Staging is medium risk
  if (env === "staging") return "medium"

  return "low"
}

/**
 * Generates a human-readable title for the recommendation
 */
function generateTitle(detection: WasteDetection): string {
  const scenario = WASTE_SCENARIOS[detection.scenarioId as WasteScenarioId]
  if (!scenario) return `Optimize ${detection.resourceName}`

  switch (detection.scenarioId) {
    case "idle_rds":
      return `Stop idle RDS instance: ${detection.resourceName}`
    case "idle_cache":
      return `Delete idle cache cluster: ${detection.resourceName}`
    case "idle_load_balancer":
      return `Delete idle load balancer: ${detection.resourceName}`
    case "over_provisioned_lambda":
      return `Rightsize Lambda function: ${detection.resourceName}`
    case "over_provisioned_instance":
      return `Rightsize EC2 instance: ${detection.resourceName}`
    case "over_provisioned_asg":
      return `Scale down ASG: ${detection.resourceName}`
    // Quick-win optimizations - Phase 1
    case "gp2_volume":
      return `Upgrade EBS volume to gp3: ${detection.resourceName}`
    case "unused_lambda":
      return `Delete unused Lambda function: ${detection.resourceName}`
    case "orphaned_snapshot":
      return `Delete orphaned snapshot: ${detection.resourceName}`
    case "static_asg":
      return `Enable dynamic scaling for ASG: ${detection.resourceName}`
    // Quick-win optimizations - Phase 2
    case "multi_az_non_prod":
      return `Disable Multi-AZ for non-prod RDS: ${detection.resourceName}`
    case "empty_load_balancer":
      return `Delete empty load balancer: ${detection.resourceName}`
    case "s3_no_version_expiration":
      return `Add version expiration to S3 bucket: ${detection.resourceName}`
    case "over_configured_lambda_timeout":
      return `Optimize Lambda timeout: ${detection.resourceName}`
    default:
      return `${scenario.name}: ${detection.resourceName}`
  }
}

/**
 * Generates a description for the recommendation using only real data from the detection
 */
function generateDescription(detection: WasteDetection): string {
  const details = detection.details || {}
  const savings = detection.potentialSavings?.toFixed(2) || "0"
  const scenario = WASTE_SCENARIOS[detection.scenarioId as WasteScenarioId]

  // Build description from actual detection data - no placeholders
  const parts: string[] = []

  switch (detection.scenarioId) {
    case "idle_rds":
      parts.push(`RDS instance "${detection.resourceName}"`)
      if (details.instanceClass) parts.push(`(${details.instanceClass})`)
      parts.push("detected as idle.")
      if (details.avgCpu7d !== undefined) parts.push(`Average CPU: ${details.avgCpu7d}%.`)
      if (details.avgConnections7d !== undefined) parts.push(`Average connections: ${details.avgConnections7d}.`)
      break

    case "idle_cache":
      parts.push(`Cache cluster "${detection.resourceName}"`)
      if (details.nodeType) parts.push(`(${details.nodeType})`)
      parts.push("detected as idle.")
      if (details.avgCpu7d !== undefined) parts.push(`Average CPU: ${details.avgCpu7d}%.`)
      if (details.avgConnections7d !== undefined) parts.push(`Average connections: ${details.avgConnections7d}.`)
      break

    case "idle_load_balancer":
      parts.push(`Load balancer "${detection.resourceName}" detected as idle.`)
      if (details.avgRequestCount7d !== undefined) parts.push(`Requests (7d): ${details.avgRequestCount7d}.`)
      break

    case "over_provisioned_lambda":
      parts.push(`Lambda function "${detection.resourceName}" is over-provisioned.`)
      if (details.currentMemoryMb) parts.push(`Current memory: ${details.currentMemoryMb}MB.`)
      if (details.recommendedMemoryMb) parts.push(`Recommended: ${details.recommendedMemoryMb}MB.`)
      break

    case "over_provisioned_instance":
      parts.push(`EC2 instance "${detection.resourceName}" is over-provisioned.`)
      if (details.currentInstanceType) parts.push(`Current type: ${details.currentInstanceType}.`)
      if (details.recommendedInstanceType) parts.push(`Recommended: ${details.recommendedInstanceType}.`)
      if (details.avgCpu7d !== undefined) parts.push(`Avg CPU: ${details.avgCpu7d}%.`)
      if (details.currentMemoryPct !== undefined) parts.push(`Memory: ${details.currentMemoryPct}%.`)
      break

    case "over_provisioned_asg":
      parts.push(`Auto Scaling Group "${detection.resourceName}" is over-provisioned.`)
      if (details.currentCapacity) parts.push(`Current capacity: ${details.currentCapacity}.`)
      if (details.recommendedCapacity) parts.push(`Recommended: ${details.recommendedCapacity}.`)
      break

    // Quick-win optimizations - Phase 1
    case "gp2_volume":
      parts.push(`EBS volume "${detection.resourceName}" is using gp2 type.`)
      if (details.sizeGib) parts.push(`Size: ${details.sizeGib}GB.`)
      parts.push("Upgrading to gp3 offers ~20% cost savings with better baseline performance.")
      break

    case "unused_lambda":
      parts.push(`Lambda function "${detection.resourceName}" has had zero invocations in the last 7 days.`)
      if (details.memoryMb) parts.push(`Memory: ${details.memoryMb}MB.`)
      parts.push("Consider deleting unused functions to eliminate monitoring costs.")
      break

    case "orphaned_snapshot":
      parts.push(`Snapshot "${detection.resourceName}" is orphaned - its source volume no longer exists.`)
      if (details.sizeGib) parts.push(`Size: ${details.sizeGib}GB.`)
      if (details.daysOld) parts.push(`Age: ${details.daysOld} days.`)
      break

    case "static_asg":
      parts.push(`ASG "${detection.resourceName}" has static scaling (min=max=desired).`)
      if (details.currentCapacity) parts.push(`Fixed capacity: ${details.currentCapacity} instances.`)
      parts.push("Enabling dynamic scaling can reduce costs during low demand periods.")
      break

    // Quick-win optimizations - Phase 2
    case "multi_az_non_prod":
      parts.push(`RDS instance "${detection.resourceName}" has Multi-AZ enabled in ${detection.env} environment.`)
      if (details.instanceClass) parts.push(`Instance class: ${details.instanceClass}.`)
      parts.push("Multi-AZ is unnecessary for non-production workloads and doubles the cost.")
      break

    case "empty_load_balancer":
      parts.push(`Load balancer "${detection.resourceName}" has no registered targets.`)
      if (details.targetCount !== undefined) parts.push(`Target count: ${details.targetCount}.`)
      parts.push("Empty load balancers incur base charges (~$16/mo) with no benefit.")
      break

    case "s3_no_version_expiration":
      parts.push(`S3 bucket "${detection.resourceName}" has versioning enabled but no noncurrent version expiration.`)
      parts.push("Old versions accumulate indefinitely, increasing storage costs.")
      parts.push("Add a lifecycle rule to expire noncurrent versions after 30 days.")
      break

    case "over_configured_lambda_timeout":
      parts.push(`Lambda function "${detection.resourceName}" has excessive timeout configuration.`)
      if (details.currentTimeout) parts.push(`Current timeout: ${details.currentTimeout}s.`)
      if (details.avgDurationMs) parts.push(`Avg duration: ${(details.avgDurationMs as number / 1000).toFixed(1)}s.`)
      if (details.recommendedTimeout) parts.push(`Recommended: ${details.recommendedTimeout}s.`)
      break

    default:
      parts.push(scenario?.description || `Optimization opportunity for "${detection.resourceName}".`)
  }

  parts.push(`Potential savings: $${savings}/month.`)

  return parts.join(" ")
}

/**
 * Creates a Recommender instance for managing Mode 3 recommendations
 */
export function createRecommender(supabaseUrl: string, supabaseKey: string) {
  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey)
  const executor = createExecutor(supabaseUrl, supabaseKey)

  return {
    /**
     * Create a new recommendation from a waste detection
     */
    async createFromDetection(input: CreateRecommendationInput): Promise<Recommendation> {
      const { detection, title, description, aiExplanation } = input

      const recommendation = {
        detection_id: detection.id,
        scenario_id: detection.scenarioId,
        scenario_name: detection.scenarioName,
        resource_type: detection.resourceType,
        resource_id: detection.resourceId,
        resource_name: detection.resourceName,
        account_id: detection.accountId || null,
        region: detection.region || null,
        env: detection.env || null,
        action: detection.action,
        title: title || generateTitle(detection),
        description: description || generateDescription(detection),
        ai_explanation: aiExplanation || null,
        impact_level: getImpactLevel(detection.potentialSavings),
        confidence: detection.confidence,
        risk_level: getRiskLevel(detection.resourceType, detection.env),
        current_monthly_cost: detection.monthlyCost,
        potential_savings: detection.potentialSavings,
        details: detection.details,
        status: "pending" as RecommendationStatus,
        created_by: "waste-detector",
      }

      const { data, error } = await supabase
        .from("recommendations")
        .insert(recommendation)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create recommendation: ${error.message}`)
      }

      return data as Recommendation
    },

    /**
     * Create recommendations from multiple waste detections (Mode 3 only)
     */
    async createFromDetections(detections: WasteDetection[]): Promise<Recommendation[]> {
      // Filter for Mode 3 detections only
      const mode3Detections = detections.filter((d) => d.mode === 3)

      if (mode3Detections.length === 0) {
        return []
      }

      // Check for existing pending recommendations to avoid duplicates
      const detectionIds = mode3Detections.map((d) => d.id)
      const { data: existing } = await supabase
        .from("recommendations")
        .select("detection_id")
        .in("detection_id", detectionIds)
        .in("status", ["pending", "snoozed", "scheduled"])

      const existingIds = new Set(existing?.map((e) => e.detection_id) || [])

      // Filter out detections that already have pending recommendations
      const newDetections = mode3Detections.filter((d) => !existingIds.has(d.id))

      if (newDetections.length === 0) {
        return []
      }

      // Create recommendations for new detections
      const recommendations = newDetections.map((detection) => ({
        detection_id: detection.id,
        scenario_id: detection.scenarioId,
        scenario_name: detection.scenarioName,
        resource_type: detection.resourceType,
        resource_id: detection.resourceId,
        resource_name: detection.resourceName,
        account_id: detection.accountId || null,
        region: detection.region || null,
        env: detection.env || null,
        action: detection.action,
        title: generateTitle(detection),
        description: generateDescription(detection),
        impact_level: getImpactLevel(detection.potentialSavings),
        confidence: detection.confidence,
        risk_level: getRiskLevel(detection.resourceType, detection.env),
        current_monthly_cost: detection.monthlyCost,
        potential_savings: detection.potentialSavings,
        details: detection.details,
        status: "pending" as RecommendationStatus,
        created_by: "waste-detector",
      }))

      const { data, error } = await supabase
        .from("recommendations")
        .insert(recommendations)
        .select()

      if (error) {
        throw new Error(`Failed to create recommendations: ${error.message}`)
      }

      return (data as Recommendation[]) || []
    },

    /**
     * Get a single recommendation by ID
     */
    async getById(id: string): Promise<Recommendation | null> {
      const { data, error } = await supabase
        .from("recommendations")
        .select("*")
        .eq("id", id)
        .single()

      if (error) {
        if (error.code === "PGRST116") return null // Not found
        throw new Error(`Failed to fetch recommendation: ${error.message}`)
      }

      return data as Recommendation
    },

    /**
     * List recommendations with optional filters
     */
    async list(filters: RecommendationFilters = {}): Promise<Recommendation[]> {
      let query = supabase
        .from("recommendations")
        .select("*")
        .order("created_at", { ascending: false })

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in("status", filters.status)
        } else {
          query = query.eq("status", filters.status)
        }
      }

      if (filters.scenario_id) {
        query = query.eq("scenario_id", filters.scenario_id)
      }

      if (filters.resource_type) {
        query = query.eq("resource_type", filters.resource_type)
      }

      if (filters.impact_level) {
        query = query.eq("impact_level", filters.impact_level)
      }

      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to list recommendations: ${error.message}`)
      }

      return (data as Recommendation[]) || []
    },

    /**
     * Get summary statistics for recommendations
     */
    async getSummary(): Promise<RecommendationSummary> {
      const { data, error } = await supabase
        .from("recommendations")
        .select("status, potential_savings, resource_type, scenario_id, scenario_name")

      if (error) {
        throw new Error(`Failed to get summary: ${error.message}`)
      }

      const recs = data || []

      // Track breakdowns by resource type and scenario (only pending/actionable items)
      const resourceTypeMap = new Map<string, { count: number; savings: number }>()
      const scenarioMap = new Map<string, { scenarioName: string; count: number; savings: number }>()

      const summary: RecommendationSummary = {
        total: recs.length,
        pending: 0,
        approved: 0,
        rejected: 0,
        snoozed: 0,
        scheduled: 0,
        executed: 0,
        totalPotentialSavings: 0,
        pendingSavings: 0,
        byResourceType: [],
        byScenario: [],
      }

      for (const rec of recs) {
        summary.totalPotentialSavings += rec.potential_savings || 0
        const isPending = rec.status === "pending" || rec.status === "snoozed" || rec.status === "scheduled"

        switch (rec.status) {
          case "pending":
            summary.pending++
            summary.pendingSavings += rec.potential_savings || 0
            break
          case "approved":
            summary.approved++
            break
          case "rejected":
            summary.rejected++
            break
          case "snoozed":
            summary.snoozed++
            summary.pendingSavings += rec.potential_savings || 0
            break
          case "scheduled":
            summary.scheduled++
            summary.pendingSavings += rec.potential_savings || 0
            break
          case "executed":
            summary.executed++
            break
        }

        // Only track breakdowns for pending/actionable items
        if (isPending && rec.resource_type) {
          const existing = resourceTypeMap.get(rec.resource_type) || { count: 0, savings: 0 }
          existing.count++
          existing.savings += rec.potential_savings || 0
          resourceTypeMap.set(rec.resource_type, existing)
        }

        if (isPending && rec.scenario_id) {
          const existing = scenarioMap.get(rec.scenario_id) || {
            scenarioName: rec.scenario_name || rec.scenario_id,
            count: 0,
            savings: 0
          }
          existing.count++
          existing.savings += rec.potential_savings || 0
          scenarioMap.set(rec.scenario_id, existing)
        }
      }

      // Convert maps to sorted arrays (by savings descending)
      summary.byResourceType = Array.from(resourceTypeMap.entries())
        .map(([resourceType, data]) => ({ resourceType, ...data }))
        .sort((a, b) => b.savings - a.savings)

      summary.byScenario = Array.from(scenarioMap.entries())
        .map(([scenarioId, data]) => ({ scenarioId, ...data }))
        .sort((a, b) => b.savings - a.savings)

      return summary
    },

    /**
     * Update a recommendation
     */
    async update(id: string, input: UpdateRecommendationInput): Promise<Recommendation> {
      const { data, error } = await supabase
        .from("recommendations")
        .update(input)
        .eq("id", id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update recommendation: ${error.message}`)
      }

      return data as Recommendation
    },

    /**
     * Approve a recommendation (changes status to approved)
     */
    async approve(id: string, actionedBy?: string): Promise<Recommendation> {
      return this.update(id, {
        status: "approved",
        actioned_by: actionedBy || "user",
      })
    },

    /**
     * Reject a recommendation
     */
    async reject(id: string, reason?: string, actionedBy?: string): Promise<Recommendation> {
      return this.update(id, {
        status: "rejected",
        rejection_reason: reason,
        actioned_by: actionedBy || "user",
      })
    },

    /**
     * Snooze a recommendation for a specified duration
     */
    async snooze(id: string, days: number, actionedBy?: string): Promise<Recommendation> {
      const snoozedUntil = new Date()
      snoozedUntil.setDate(snoozedUntil.getDate() + days)

      return this.update(id, {
        status: "snoozed",
        snoozed_until: snoozedUntil.toISOString(),
        actioned_by: actionedBy || "user",
      })
    },

    /**
     * Schedule a recommendation for future execution
     */
    async schedule(id: string, scheduledFor: Date, actionedBy?: string): Promise<Recommendation> {
      return this.update(id, {
        status: "scheduled",
        scheduled_for: scheduledFor.toISOString(),
        actioned_by: actionedBy || "user",
      })
    },

    /**
     * Execute an approved recommendation
     */
    async execute(id: string): Promise<{ recommendation: Recommendation; result: ActionResult }> {
      // Get the recommendation
      const recommendation = await this.getById(id)

      if (!recommendation) {
        throw new Error(`Recommendation not found: ${id}`)
      }

      if (recommendation.status !== "approved" && recommendation.status !== "scheduled") {
        throw new Error(`Recommendation must be approved or scheduled to execute. Current status: ${recommendation.status}`)
      }

      // Execute the action
      const params: ExecuteActionParams = {
        action: recommendation.action as ExecuteActionParams["action"],
        resourceType: recommendation.resource_type as ExecuteActionParams["resourceType"],
        resourceId: recommendation.resource_id,
        resourceName: recommendation.resource_name,
        detectionId: recommendation.detection_id,
        scenarioId: recommendation.scenario_id,
        details: recommendation.details,
      }

      const result = await executor.executeAction(params)

      // Update the recommendation with execution result
      const updatedRecommendation = await this.update(id, {
        status: result.success ? "executed" : "approved", // Keep as approved if execution failed
      })

      // Also update executed_at and execution_result directly
      await supabase
        .from("recommendations")
        .update({
          executed_at: result.success ? new Date().toISOString() : null,
          execution_result: result,
        })
        .eq("id", id)

      return {
        recommendation: updatedRecommendation,
        result,
      }
    },

    /**
     * Delete a recommendation
     */
    async delete(id: string): Promise<void> {
      const { error } = await supabase
        .from("recommendations")
        .delete()
        .eq("id", id)

      if (error) {
        throw new Error(`Failed to delete recommendation: ${error.message}`)
      }
    },

    /**
     * Check and unsnoze recommendations that have passed their snooze period
     */
    async checkSnoozedRecommendations(): Promise<number> {
      const { data, error } = await supabase
        .from("recommendations")
        .update({
          status: "pending",
          snoozed_until: null,
        })
        .eq("status", "snoozed")
        .lt("snoozed_until", new Date().toISOString())
        .select()

      if (error) {
        throw new Error(`Failed to check snoozed recommendations: ${error.message}`)
      }

      return data?.length || 0
    },

    /**
     * Execute scheduled recommendations that are due
     */
    async executeScheduledRecommendations(): Promise<{ executed: number; failed: number }> {
      const { data: scheduled, error } = await supabase
        .from("recommendations")
        .select("*")
        .eq("status", "scheduled")
        .lt("scheduled_for", new Date().toISOString())

      if (error) {
        throw new Error(`Failed to fetch scheduled recommendations: ${error.message}`)
      }

      let executed = 0
      let failed = 0

      for (const rec of scheduled || []) {
        try {
          // Mark as approved first, then execute
          await this.approve(rec.id, "scheduler")
          const { result } = await this.execute(rec.id)

          if (result.success) {
            executed++
          } else {
            failed++
          }
        } catch {
          failed++
        }
      }

      return { executed, failed }
    },
  }
}

export type Recommender = ReturnType<typeof createRecommender>
