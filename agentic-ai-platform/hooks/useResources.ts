"use client"

import { useQuery } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase/connection"

export interface Instance {
  id: string
  instance_id: string
  name: string
  instance_type: string
  state: string
  env: string
  current_cpu: number | null
  current_memory: number | null
  avg_cpu_7d: number | null
  created_at: string
  account_id: string
}

export interface RDSInstance {
  id: string
  db_instance_id: string
  instance_class: string
  engine: string
  state: string
  env: string
  current_cpu: number | null
  avg_cpu_7d: number | null
  avg_connections_7d: number | null
  created_at: string
}

export interface S3Bucket {
  id: string
  bucket_name: string
  region: string
  lifecycle_policy: string | null
  storage_class: string
  created_at: string
}

export interface LambdaFunction {
  id: string
  function_name: string
  runtime: string
  memory_mb: number
  avg_memory_used_mb_7d: number | null
  invocations_7d: number
  env: string
  created_at: string
}

export interface LoadBalancer {
  id: string
  lb_name: string
  type: string
  state: string
  env: string
  avg_request_count_7d: number | null
  created_at: string
}

export interface ElasticIP {
  id: string
  public_ip: string
  state: string
  associated_instance_id: string | null
  created_at: string
}

export interface Volume {
  id: string
  volume_id: string
  volume_type: string
  size_gb: number
  state: string
  attached_instance_id: string | null
  created_at: string
}

export interface Snapshot {
  id: string
  snapshot_id: string
  volume_id: string | null
  size_gb: number
  created_at: string
}

export interface LogGroup {
  id: string
  log_group_name: string
  retention_days: number | null
  stored_bytes: number | null
  created_at: string
}

export interface CacheCluster {
  id: string
  cluster_id: string
  node_type: string
  engine: string
  status: string
  env: string
  avg_cpu_7d: number | null
  avg_connections_7d: number | null
  created_at: string
}

export interface AutoscalingGroup {
  id: string
  asg_name: string
  min_size: number
  max_size: number
  desired_capacity: number
  instance_type: string
  env: string
  current_utilization: number | null
  created_at: string
}

export interface ResourceCounts {
  instances: number
  rdsInstances: number
  s3Buckets: number
  lambdaFunctions: number
  loadBalancers: number
  elasticIps: number
  volumes: number
  snapshots: number
  logGroups: number
  cacheClusters: number
  autoscalingGroups: number
  total: number
}

// Hook to get all resource counts
export function useResourceCounts() {
  return useQuery<ResourceCounts>({
    queryKey: ["resource-counts"],
    queryFn: async () => {
      // const startTime = performance.now()
      // console.log("[useResourceCounts] Query started")

      const supabase = getSupabaseClient()
      if (!supabase) {
        // console.error("[useResourceCounts] ERROR - Not connected to database")
        throw new Error("Not connected to database")
      }

      // console.log("[useResourceCounts] Fetching counts from 11 tables in parallel...")
      // const fetchStartTime = performance.now()

      const [
        instances,
        rds,
        s3,
        lambdas,
        loadBalancers,
        eips,
        volumes,
        snapshots,
        logs,
        cache,
        asgs,
      ] = await Promise.all([
        supabase.from("instances").select("id", { count: "exact", head: true }),
        supabase.from("rds_instances").select("id", { count: "exact", head: true }),
        supabase.from("s3_buckets").select("id", { count: "exact", head: true }),
        supabase.from("lambda_functions").select("id", { count: "exact", head: true }),
        supabase.from("load_balancers").select("id", { count: "exact", head: true }),
        supabase.from("elastic_ips").select("id", { count: "exact", head: true }),
        supabase.from("volumes").select("id", { count: "exact", head: true }),
        supabase.from("snapshots").select("id", { count: "exact", head: true }),
        supabase.from("log_groups").select("id", { count: "exact", head: true }),
        supabase.from("cache_clusters").select("id", { count: "exact", head: true }),
        supabase.from("autoscaling_groups").select("id", { count: "exact", head: true }),
      ])

      // const fetchDuration = performance.now() - fetchStartTime
      // console.log(`[useResourceCounts] Parallel fetch completed in ${fetchDuration.toFixed(2)}ms`)

      const counts = {
        instances: instances.count ?? 0,
        rdsInstances: rds.count ?? 0,
        s3Buckets: s3.count ?? 0,
        lambdaFunctions: lambdas.count ?? 0,
        loadBalancers: loadBalancers.count ?? 0,
        elasticIps: eips.count ?? 0,
        volumes: volumes.count ?? 0,
        snapshots: snapshots.count ?? 0,
        logGroups: logs.count ?? 0,
        cacheClusters: cache.count ?? 0,
        autoscalingGroups: asgs.count ?? 0,
        total: 0,
      }

      counts.total = Object.values(counts).reduce((sum, val) => sum + val, 0) - counts.total

      // const totalDuration = performance.now() - startTime
      // console.log(`[useResourceCounts] Query completed in ${totalDuration.toFixed(2)}ms - Total resources: ${counts.total}`)

      return counts
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

// Hook to get all instances
export function useInstances() {
  return useQuery<Instance[]>({
    queryKey: ["instances"],
    queryFn: async () => {
      // const startTime = performance.now()
      // console.log("[useInstances] Query started")

      const supabase = getSupabaseClient()
      if (!supabase) {
        // console.error("[useInstances] ERROR - Not connected to database")
        throw new Error("Not connected to database")
      }

      const { data, error } = await supabase
        .from("instances")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        // console.error(`[useInstances] ERROR after ${(performance.now() - startTime).toFixed(2)}ms:`, error)
        throw error
      }

      // const duration = performance.now() - startTime
      // console.log(`[useInstances] Query completed in ${duration.toFixed(2)}ms - ${data?.length ?? 0} instances`)
      return data ?? []
    },
    refetchInterval: 30000,
  })
}

// Hook to get all RDS instances
export function useRDSInstances() {
  return useQuery<RDSInstance[]>({
    queryKey: ["rds-instances"],
    queryFn: async () => {
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error("Not connected to database")

      const { data, error } = await supabase
        .from("rds_instances")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      return data ?? []
    },
    refetchInterval: 30000,
  })
}

// Hook to get all Lambda functions
export function useLambdaFunctions() {
  return useQuery<LambdaFunction[]>({
    queryKey: ["lambda-functions"],
    queryFn: async () => {
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error("Not connected to database")

      const { data, error } = await supabase
        .from("lambda_functions")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      
      // Map database fields to interface fields
      return (data ?? []).map((item: any) => ({
        ...item,
        function_name: item.name || item.function_name || "",
        runtime: item.runtime || "unknown", // Default if runtime column doesn't exist
      }))
    },
    refetchInterval: 30000,
  })
}

// Hook to get all Load Balancers
export function useLoadBalancers() {
  return useQuery<LoadBalancer[]>({
    queryKey: ["load-balancers"],
    queryFn: async () => {
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error("Not connected to database")

      const { data, error } = await supabase
        .from("load_balancers")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      
      // Map database fields to interface fields
      return (data ?? []).map((item: any) => ({
        ...item,
        lb_name: item.name || item.lb_name || "",
        state: item.state || "active", // Default if state column doesn't exist
      }))
    },
    refetchInterval: 30000,
  })
}

// Hook to get all volumes
export function useVolumes() {
  return useQuery<Volume[]>({
    queryKey: ["volumes"],
    queryFn: async () => {
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error("Not connected to database")

      const { data, error } = await supabase
        .from("volumes")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      return data ?? []
    },
    refetchInterval: 30000,
  })
}

// Hook to get all S3 buckets
export function useS3Buckets() {
  return useQuery<S3Bucket[]>({
    queryKey: ["s3-buckets"],
    queryFn: async () => {
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error("Not connected to database")

      const { data, error } = await supabase
        .from("s3_buckets")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      
      // Map database fields to interface fields
      return (data ?? []).map((item: any) => ({
        ...item,
        bucket_name: item.name || item.bucket_name || "",
        storage_class: item.storage_class || "STANDARD", // Default if storage_class column doesn't exist
      }))
    },
    refetchInterval: 30000,
  })
}

// Hook to get S3 bucket usage costs (aggregated from s3_bucket_usage_daily)
export function useS3UsageCosts() {
  return useQuery({
    queryKey: ["s3-usage-costs"],
    queryFn: async () => {
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error("Not connected to database")

      // Get last 30 days of S3 usage
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const dateFilter = thirtyDaysAgo.toISOString().split("T")[0]

      const { data, error } = await supabase
        .from("s3_bucket_usage_daily")
        .select("date, estimated_storage_cost, estimated_request_cost")
        .gte("date", dateFilter)
        .order("date", { ascending: true })

      if (error) throw error

      // Aggregate costs by date
      const costByDate = new Map<string, number>()
      data?.forEach((usage: any) => {
        const date = usage.date
        const totalCost = Number(usage.estimated_storage_cost || 0) + Number(usage.estimated_request_cost || 0)
        const current = costByDate.get(date) || 0
        costByDate.set(date, current + totalCost)
      })

      // Calculate metrics
      const uniqueDates = Array.from(costByDate.keys())
      const totalCost = Array.from(costByDate.values()).reduce((sum, cost) => sum + cost, 0)
      const avgDailyCost = uniqueDates.length > 0 ? totalCost / uniqueDates.length : 0
      const estimatedMonthlyCost = avgDailyCost * 30

      return {
        totalCost,
        avgDailyCost,
        estimatedMonthlyCost,
        daysOfData: uniqueDates.length,
        dailyMetrics: Array.from(costByDate.entries()).map(([date, cost]) => ({
          date,
          estimated_daily_cost: cost,
        })),
      }
    },
    refetchInterval: 60000,
  })
}

// Hook to get all Elastic IPs
export function useElasticIPs() {
  return useQuery<ElasticIP[]>({
    queryKey: ["elastic-ips"],
    queryFn: async () => {
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error("Not connected to database")

      const { data, error } = await supabase
        .from("elastic_ips")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      return data ?? []
    },
    refetchInterval: 30000,
  })
}

// Hook to get all Cache Clusters
export function useCacheClusters() {
  return useQuery<CacheCluster[]>({
    queryKey: ["cache-clusters"],
    queryFn: async () => {
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error("Not connected to database")

      const { data, error } = await supabase
        .from("cache_clusters")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      return data ?? []
    },
    refetchInterval: 30000,
  })
}

// Hook to get daily metrics for a specific resource type from metrics_daily
export function useResourceMetrics(resourceType: string) {
  return useQuery({
    queryKey: ["resource-metrics", resourceType],
    queryFn: async () => {
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error("Not connected to database")

      // Get last 30 days of metrics
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const dateFilter = thirtyDaysAgo.toISOString().split("T")[0]

      // Map resourceType to metrics_daily resource_type values
      const resourceTypeMap: Record<string, string> = {
        instances: "instances",
        rds: "rds_instance",
        lambda: "lambda_function",
        volumes: "volume",
        "load-balancers": "load_balancer",
        "cache-clusters": "cache_cluster",
        "elastic-ips": "elastic_ip",
      }

      const metricsResourceType = resourceTypeMap[resourceType]
      if (!metricsResourceType) {
        return { dailyMetrics: [], totalCost: 0, avgDailyCost: 0, estimatedMonthlyCost: 0, daysOfData: 0 }
      }

      const { data, error } = await supabase
        .from("metrics_daily")
        .select("date, estimated_daily_cost, metric_payload")
        .eq("resource_type", metricsResourceType)
        .gte("date", dateFilter)
        .order("date", { ascending: true })

      if (error) throw error

      // Aggregate by date
      const costByDate = new Map<string, number>()
      data?.forEach((m) => {
        const date = m.date
        const cost = Number(m.estimated_daily_cost || 0)
        const current = costByDate.get(date) || 0
        costByDate.set(date, current + cost)
      })

      const uniqueDates = Array.from(costByDate.keys())
      const totalCost = Array.from(costByDate.values()).reduce((sum, cost) => sum + cost, 0)
      const avgDailyCost = uniqueDates.length > 0 ? totalCost / uniqueDates.length : 0
      const estimatedMonthlyCost = avgDailyCost * 30

      const dailyMetrics = uniqueDates.map((date) => ({
        date,
        estimated_daily_cost: costByDate.get(date) || 0,
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      return {
        totalCost,
        avgDailyCost,
        estimatedMonthlyCost,
        daysOfData: uniqueDates.length,
        dailyMetrics,
      }
    },
    refetchInterval: 60000,
  })
}

// Hook to get daily metrics for cost estimation (EC2 instances only, for backward compatibility)
export function useMetricsSummary() {
  return useQuery({
    queryKey: ["metrics-summary"],
    queryFn: async () => {
      const startTime = performance.now()
      console.log("[useMetricsSummary] Query started")

      const supabase = getSupabaseClient()
      if (!supabase) {
        console.error("[useMetricsSummary] ERROR - Not connected to database")
        throw new Error("Not connected to database")
      }

      // Get last 30 days of metrics
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const dateFilter = thirtyDaysAgo.toISOString().split("T")[0]

      console.log("[useMetricsSummary] Fetching metrics from metrics_daily table", { dateFilter })

      const { data, error } = await supabase
        .from("metrics_daily")
        .select("date, estimated_daily_cost, metric_payload")
        .eq("resource_type", "instances")
        .gte("date", dateFilter)
        .order("date", { ascending: true })

      const queryDuration = performance.now() - startTime

      if (error) {
        console.error(`[useMetricsSummary] ERROR after ${queryDuration.toFixed(2)}ms:`, error)
        throw error
      }

      console.log(`[useMetricsSummary] Query completed in ${queryDuration.toFixed(2)}ms`, {
        recordsCount: data?.length ?? 0,
        sampleData: data?.slice(0, 3),
      })

      // Aggregate by date (in case multiple resources per day)
      const costByDate = new Map<string, number>()
      data?.forEach((m) => {
        const date = m.date
        const cost = Number(m.estimated_daily_cost || 0)
        const current = costByDate.get(date) || 0
        costByDate.set(date, current + cost)
      })

      // Calculate metrics from aggregated data
      const uniqueDates = Array.from(costByDate.keys())
      const totalCost = Array.from(costByDate.values()).reduce((sum, cost) => sum + cost, 0)
      const avgDailyCost = uniqueDates.length > 0 ? totalCost / uniqueDates.length : 0
      const estimatedMonthlyCost = avgDailyCost * 30

      console.log("[useMetricsSummary] Metrics calculated", {
        uniqueDates: uniqueDates.length,
        totalCost: totalCost.toFixed(2),
        avgDailyCost: avgDailyCost.toFixed(2),
        estimatedMonthlyCost: estimatedMonthlyCost.toFixed(2),
      })

      // Reconstruct dailyMetrics with aggregated costs
      const aggregatedDailyMetrics = uniqueDates.map((date) => {
        const cost = costByDate.get(date) || 0
        // Find first entry for this date to get metric_payload
        const sampleEntry = data?.find((m) => m.date === date)
        return {
          date,
          estimated_daily_cost: cost,
          metric_payload: sampleEntry?.metric_payload || null,
        }
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      const result = {
        totalCost,
        avgDailyCost,
        estimatedMonthlyCost,
        daysOfData: uniqueDates.length,
        dailyMetrics: aggregatedDailyMetrics,
      }

      const totalDuration = performance.now() - startTime
      console.log(`[useMetricsSummary] ✅ Complete: ${totalDuration.toFixed(2)}ms | ${uniqueDates.length} days | $${totalCost.toFixed(2)} total`)

      return result
    },
    refetchInterval: 60000, // Refetch every minute
  })
}
