"use client"

import { useQuery } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase/connection"
import type { OptimizationPolicy, ResourceType } from "@/lib/utils/policyLock"

export interface PolicyResource {
  id: string
  name: string
  type: ResourceType
  env: string | null
  region: string | null
  optimization_policy: OptimizationPolicy
  optimization_policy_locked: boolean
}

interface ResourceTypeConfig {
  table: string
  nameField: string
  type: ResourceType
}

const RESOURCE_TYPES: ResourceTypeConfig[] = [
  { table: "instances", nameField: "name", type: "instances" },
  { table: "autoscaling_groups", nameField: "asg_name", type: "autoscaling_groups" },
  { table: "rds_instances", nameField: "db_instance_id", type: "rds_instances" },
  { table: "cache_clusters", nameField: "cluster_id", type: "cache_clusters" },
  { table: "load_balancers", nameField: "name", type: "load_balancers" },
  { table: "s3_buckets", nameField: "name", type: "s3_buckets" },
  { table: "log_groups", nameField: "log_group_name", type: "log_groups" },
  { table: "elastic_ips", nameField: "public_ip", type: "elastic_ips" },
  { table: "volumes", nameField: "volume_id", type: "volumes" },
  { table: "snapshots", nameField: "snapshot_id", type: "snapshots" },
  { table: "lambda_functions", nameField: "name", type: "lambda_functions" },
]

/**
 * Fetch all resources with their optimization policies
 */
export function usePolicyResources() {
  return useQuery<PolicyResource[]>({
    queryKey: ["policy-resources"],
    queryFn: async () => {
      const startTime = performance.now()
      console.log("[usePolicyResources] Fetching all resources with policies...")

      const supabase = getSupabaseClient()
      if (!supabase) {
        throw new Error("Not connected to database")
      }

      const allResources: PolicyResource[] = []

      // Fetch resources from each table in parallel
      const fetchPromises = RESOURCE_TYPES.map(async (config) => {
        try {
          const { data, error } = await supabase
            .from(config.table)
            .select("*")
            .order("created_at", { ascending: false })

          if (error) {
            console.warn(`[usePolicyResources] Error fetching ${config.table}:`, error.message)
            return []
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (data || []).map((row: any) => ({
            id: String(row.id),
            name: String(row[config.nameField] || row.id),
            type: config.type,
            env: row.env ? String(row.env) : null,
            region: row.region ? String(row.region) : null,
            optimization_policy: (row.optimization_policy as OptimizationPolicy) || "recommend_only",
            optimization_policy_locked: Boolean(row.optimization_policy_locked),
          }))
        } catch (err) {
          console.warn(`[usePolicyResources] Exception fetching ${config.table}:`, err)
          return []
        }
      })

      const results = await Promise.all(fetchPromises)
      for (const resources of results) {
        allResources.push(...resources)
      }

      const duration = performance.now() - startTime
      console.log(`[usePolicyResources] Fetched ${allResources.length} resources in ${duration.toFixed(0)}ms`)

      return allResources
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  })
}

/**
 * Get resource type display name
 */
export function getResourceTypeLabel(type: ResourceType): string {
  const labels: Record<ResourceType, string> = {
    instances: "EC2 Instances",
    autoscaling_groups: "Auto Scaling Groups",
    rds_instances: "RDS Instances",
    cache_clusters: "ElastiCache Clusters",
    load_balancers: "Load Balancers",
    s3_buckets: "S3 Buckets",
    log_groups: "CloudWatch Log Groups",
    elastic_ips: "Elastic IPs",
    volumes: "EBS Volumes",
    snapshots: "EBS Snapshots",
    lambda_functions: "Lambda Functions",
  }
  return labels[type] || type
}

/**
 * Get shortened resource type for badges
 */
export function getResourceTypeShort(type: ResourceType): string {
  const labels: Record<ResourceType, string> = {
    instances: "EC2",
    autoscaling_groups: "ASG",
    rds_instances: "RDS",
    cache_clusters: "ElastiCache",
    load_balancers: "ELB",
    s3_buckets: "S3",
    log_groups: "Logs",
    elastic_ips: "EIP",
    volumes: "EBS",
    snapshots: "Snapshot",
    lambda_functions: "Lambda",
  }
  return labels[type] || type
}
