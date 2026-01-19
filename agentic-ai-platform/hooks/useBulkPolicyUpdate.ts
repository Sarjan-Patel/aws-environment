"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase/connection"
import {
  validatePolicyUpdate,
  type OptimizationPolicy,
  type ResourceType,
} from "@/lib/utils/policyLock"

interface BulkResource {
  id: string
  type: ResourceType
  env?: string | null
  optimization_policy?: OptimizationPolicy
  optimization_policy_locked?: boolean
}

interface BulkPolicyUpdateParams {
  resources: BulkResource[]
  newPolicy: OptimizationPolicy
}

interface BulkUpdateResult {
  successCount: number
  failCount: number
  skippedCount: number
  results: {
    resourceId: string
    success: boolean
    message: string
  }[]
}

/**
 * Hook to update multiple resources' optimization policies at once
 */
export function useBulkPolicyUpdate() {
  const queryClient = useQueryClient()

  return useMutation<BulkUpdateResult, Error, BulkPolicyUpdateParams>({
    mutationFn: async (params) => {
      const startTime = performance.now()
      console.log(
        `[useBulkPolicyUpdate] Updating ${params.resources.length} resources to ${params.newPolicy}`
      )

      const supabase = getSupabaseClient()
      if (!supabase) {
        throw new Error("Not connected to database")
      }

      const results: BulkUpdateResult["results"] = []
      let successCount = 0
      let failCount = 0
      let skippedCount = 0

      // Group resources by type for batch updates
      const resourcesByType = new Map<ResourceType, BulkResource[]>()
      for (const resource of params.resources) {
        const existing = resourcesByType.get(resource.type) || []
        existing.push(resource)
        resourcesByType.set(resource.type, existing)
      }

      // Process each resource type
      for (const [resourceType, resources] of Array.from(resourcesByType.entries())) {
        const tableName = getTableName(resourceType)

        // Filter resources that can be updated
        const updatableResources: BulkResource[] = []
        for (const resource of resources) {
          const validation = validatePolicyUpdate(
            {
              type: resource.type,
              env: resource.env,
              optimization_policy_locked: resource.optimization_policy_locked,
            },
            params.newPolicy
          )

          if (!validation.valid) {
            skippedCount++
            results.push({
              resourceId: resource.id,
              success: false,
              message: validation.error || "Policy update not allowed",
            })
          } else {
            updatableResources.push(resource)
          }
        }

        if (updatableResources.length === 0) continue

        // Batch update
        const ids = updatableResources.map((r) => r.id)
        const { error } = await supabase
          .from(tableName)
          .update({ optimization_policy: params.newPolicy })
          .in("id", ids)

        if (error) {
          console.error(`[useBulkPolicyUpdate] Error updating ${resourceType}:`, error)
          for (const resource of updatableResources) {
            failCount++
            results.push({
              resourceId: resource.id,
              success: false,
              message: error.message,
            })
          }
        } else {
          for (const resource of updatableResources) {
            successCount++
            results.push({
              resourceId: resource.id,
              success: true,
              message: `Updated to ${params.newPolicy}`,
            })
          }
        }
      }

      const duration = performance.now() - startTime
      console.log(
        `[useBulkPolicyUpdate] Completed in ${duration.toFixed(0)}ms: ${successCount} success, ${failCount} failed, ${skippedCount} skipped`
      )

      return {
        successCount,
        failCount,
        skippedCount,
        results,
      }
    },
    onSuccess: (data) => {
      console.log(
        `[useBulkPolicyUpdate] Bulk update complete: ${data.successCount} updated, ${data.failCount} failed, ${data.skippedCount} skipped`
      )
      // Invalidate all resource queries
      queryClient.invalidateQueries({ queryKey: ["resources"] })
      queryClient.invalidateQueries({ queryKey: ["policy-resources"] })
      queryClient.invalidateQueries({ queryKey: ["instances"] })
      queryClient.invalidateQueries({ queryKey: ["rds-instances"] })
      queryClient.invalidateQueries({ queryKey: ["s3-buckets"] })
      queryClient.invalidateQueries({ queryKey: ["log-groups"] })
      queryClient.invalidateQueries({ queryKey: ["elastic-ips"] })
      queryClient.invalidateQueries({ queryKey: ["volumes"] })
      queryClient.invalidateQueries({ queryKey: ["snapshots"] })
      queryClient.invalidateQueries({ queryKey: ["cache-clusters"] })
      queryClient.invalidateQueries({ queryKey: ["load-balancers"] })
      queryClient.invalidateQueries({ queryKey: ["lambda-functions"] })
      queryClient.invalidateQueries({ queryKey: ["autoscaling-groups"] })
    },
    onError: (error) => {
      console.error("[useBulkPolicyUpdate] Error:", error.message)
    },
  })
}

/**
 * Get the database table name for a resource type
 */
function getTableName(resourceType: ResourceType): string {
  const tableMap: Record<ResourceType, string> = {
    instances: "instances",
    autoscaling_groups: "autoscaling_groups",
    rds_instances: "rds_instances",
    cache_clusters: "cache_clusters",
    load_balancers: "load_balancers",
    s3_buckets: "s3_buckets",
    log_groups: "log_groups",
    elastic_ips: "elastic_ips",
    volumes: "volumes",
    snapshots: "snapshots",
    lambda_functions: "lambda_functions",
  }
  return tableMap[resourceType]
}

// Policy presets for common configurations
export type PolicyPreset = "conservative" | "balanced" | "aggressive"

export interface PresetConfig {
  name: string
  description: string
  policies: Record<ResourceType, OptimizationPolicy>
}

export const POLICY_PRESETS: Record<PolicyPreset, PresetConfig> = {
  conservative: {
    name: "Conservative",
    description: "Recommend only - requires approval for all changes",
    policies: {
      instances: "recommend_only",
      autoscaling_groups: "recommend_only",
      rds_instances: "recommend_only",
      cache_clusters: "recommend_only",
      load_balancers: "recommend_only",
      s3_buckets: "recommend_only",
      log_groups: "recommend_only",
      elastic_ips: "recommend_only",
      volumes: "recommend_only",
      snapshots: "recommend_only",
      lambda_functions: "recommend_only",
    },
  },
  balanced: {
    name: "Balanced",
    description: "Auto-safe for safe resources, recommend for critical",
    policies: {
      instances: "recommend_only",
      autoscaling_groups: "recommend_only",
      rds_instances: "recommend_only",
      cache_clusters: "recommend_only",
      load_balancers: "recommend_only",
      s3_buckets: "auto_safe",
      log_groups: "auto_safe",
      elastic_ips: "auto_safe",
      volumes: "auto_safe",
      snapshots: "auto_safe",
      lambda_functions: "recommend_only",
    },
  },
  aggressive: {
    name: "Aggressive",
    description: "Auto-safe for all non-production resources",
    policies: {
      instances: "auto_safe",
      autoscaling_groups: "recommend_only", // Still recommend for ASGs
      rds_instances: "recommend_only", // Still recommend for databases
      cache_clusters: "recommend_only", // Still recommend for cache
      load_balancers: "recommend_only", // Still recommend for LBs
      s3_buckets: "auto_safe",
      log_groups: "auto_safe",
      elastic_ips: "auto_safe",
      volumes: "auto_safe",
      snapshots: "auto_safe",
      lambda_functions: "auto_safe",
    },
  },
}
