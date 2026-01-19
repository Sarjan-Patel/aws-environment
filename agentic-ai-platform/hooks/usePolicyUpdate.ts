"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase/connection"
import {
  validatePolicyUpdate,
  type OptimizationPolicy,
  type ResourceType,
} from "@/lib/utils/policyLock"

interface PolicyUpdateParams {
  resourceId: string
  resourceType: ResourceType
  newPolicy: OptimizationPolicy
  env?: string | null
  optimization_policy_locked?: boolean
}

interface PolicyUpdateResult {
  success: boolean
  resourceId: string
  previousPolicy: OptimizationPolicy | null
  newPolicy: OptimizationPolicy
  message: string
}

/**
 * Hook to update a single resource's optimization policy
 */
export function usePolicyUpdate() {
  const queryClient = useQueryClient()

  return useMutation<PolicyUpdateResult, Error, PolicyUpdateParams>({
    mutationFn: async (params) => {
      const startTime = performance.now()
      console.log(
        `[usePolicyUpdate] Updating policy: ${params.resourceType}/${params.resourceId} -> ${params.newPolicy}`
      )

      // Validate the update
      const validation = validatePolicyUpdate(
        {
          type: params.resourceType,
          env: params.env,
          optimization_policy_locked: params.optimization_policy_locked,
        },
        params.newPolicy
      )

      if (!validation.valid) {
        throw new Error(validation.error || "Policy update not allowed")
      }

      const supabase = getSupabaseClient()
      if (!supabase) {
        throw new Error("Not connected to database")
      }

      // Get the table name from resource type
      const tableName = getTableName(params.resourceType)

      // Get current policy for audit
      const { data: current, error: fetchError } = await supabase
        .from(tableName)
        .select("optimization_policy")
        .eq("id", params.resourceId)
        .single()

      if (fetchError) {
        console.error("[usePolicyUpdate] Error fetching current policy:", fetchError)
        throw new Error(`Failed to fetch current policy: ${fetchError.message}`)
      }

      const previousPolicy = current?.optimization_policy as OptimizationPolicy | null

      // Update the policy
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ optimization_policy: params.newPolicy })
        .eq("id", params.resourceId)

      if (updateError) {
        console.error("[usePolicyUpdate] Error updating policy:", updateError)
        throw new Error(`Failed to update policy: ${updateError.message}`)
      }

      const duration = performance.now() - startTime
      console.log(
        `[usePolicyUpdate] Policy updated in ${duration.toFixed(0)}ms: ${previousPolicy} -> ${params.newPolicy}`
      )

      return {
        success: true,
        resourceId: params.resourceId,
        previousPolicy,
        newPolicy: params.newPolicy,
        message: `Policy updated to ${params.newPolicy}`,
      }
    },
    onSuccess: (data, variables) => {
      console.log("[usePolicyUpdate] Success:", data.message)
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["resources"] })
      queryClient.invalidateQueries({ queryKey: ["policy-resources"] })
      queryClient.invalidateQueries({ queryKey: [getQueryKey(variables.resourceType)] })
    },
    onError: (error) => {
      console.error("[usePolicyUpdate] Error:", error.message)
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

/**
 * Get the query key for a resource type
 */
function getQueryKey(resourceType: ResourceType): string {
  const queryKeyMap: Record<ResourceType, string> = {
    instances: "instances",
    autoscaling_groups: "autoscaling-groups",
    rds_instances: "rds-instances",
    cache_clusters: "cache-clusters",
    load_balancers: "load-balancers",
    s3_buckets: "s3-buckets",
    log_groups: "log-groups",
    elastic_ips: "elastic-ips",
    volumes: "volumes",
    snapshots: "snapshots",
    lambda_functions: "lambda-functions",
  }
  return queryKeyMap[resourceType]
}
