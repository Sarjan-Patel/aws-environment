"use client"

import { useEffect, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase/connection"
import { RealtimeChannel } from "@supabase/supabase-js"

type TableName =
  | "instances"
  | "rds_instances"
  | "s3_buckets"
  | "lambda_functions"
  | "load_balancers"
  | "elastic_ips"
  | "volumes"
  | "snapshots"
  | "log_groups"
  | "cache_clusters"
  | "autoscaling_groups"
  | "metrics_daily"

// Map table names to query keys
const tableToQueryKey: Record<TableName, string> = {
  instances: "instances",
  rds_instances: "rds-instances",
  s3_buckets: "s3-buckets",
  lambda_functions: "lambda-functions",
  load_balancers: "load-balancers",
  elastic_ips: "elastic-ips",
  volumes: "volumes",
  snapshots: "snapshots",
  log_groups: "log-groups",
  cache_clusters: "cache-clusters",
  autoscaling_groups: "autoscaling-groups",
  metrics_daily: "metrics-summary",
}

/**
 * Hook to subscribe to real-time updates for a specific table
 */
export function useRealtimeTable(tableName: TableName, enabled: boolean = true) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return

    const supabase = getSupabaseClient()
    if (!supabase) return

    const channel: RealtimeChannel = supabase
      .channel(`${tableName}-changes`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: tableName,
        },
        (payload) => {
          console.log(`[Realtime] ${tableName} change:`, payload.eventType)

          // Invalidate the relevant query to refetch data
          const queryKey = tableToQueryKey[tableName]
          queryClient.invalidateQueries({ queryKey: [queryKey] })

          // Also invalidate resource counts
          queryClient.invalidateQueries({ queryKey: ["resource-counts"] })

          // If this could affect waste detection, invalidate that too
          if (["instances", "rds_instances", "lambda_functions", "load_balancers",
               "elastic_ips", "volumes", "snapshots", "s3_buckets", "log_groups"].includes(tableName)) {
            queryClient.invalidateQueries({ queryKey: ["waste-detection"] })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tableName, enabled, queryClient])
}

/**
 * Hook to subscribe to real-time updates for all resource tables
 */
export function useRealtimeResources(enabled: boolean = true) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return

    const supabase = getSupabaseClient()
    if (!supabase) return

    const tables: TableName[] = [
      "instances",
      "rds_instances",
      "lambda_functions",
      "load_balancers",
      "elastic_ips",
      "volumes",
      "snapshots",
      "s3_buckets",
      "log_groups",
      "cache_clusters",
      "autoscaling_groups",
    ]

    const channels: RealtimeChannel[] = []

    tables.forEach((tableName) => {
      const channel = supabase
        .channel(`${tableName}-changes`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: tableName,
          },
          (payload) => {
            console.log(`[Realtime] ${tableName} change:`, payload.eventType)

            // Invalidate relevant queries
            const queryKey = tableToQueryKey[tableName]
            queryClient.invalidateQueries({ queryKey: [queryKey] })
            queryClient.invalidateQueries({ queryKey: ["resource-counts"] })
            queryClient.invalidateQueries({ queryKey: ["waste-detection"] })
          }
        )
        .subscribe()

      channels.push(channel)
    })

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel)
      })
    }
  }, [enabled, queryClient])
}

/**
 * Hook to get real-time connection status
 */
export function useRealtimeStatus() {
  const supabase = getSupabaseClient()

  const checkStatus = useCallback(() => {
    if (!supabase) return "disconnected"

    // Get all channels
    const channels = supabase.getChannels()
    if (channels.length === 0) return "disconnected"

    // Check if any channel is subscribed
    const subscribedChannels = channels.filter(
      (c) => c.state === "joined" || c.state === "joining"
    )

    if (subscribedChannels.length > 0) return "connected"
    return "disconnected"
  }, [supabase])

  return { checkStatus }
}
