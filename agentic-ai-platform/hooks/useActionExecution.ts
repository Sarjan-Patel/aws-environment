"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ActionType, ResourceType } from "@/lib/agent/scenarios"

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
  id: string
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
  created_at: string
}

/**
 * Hook to execute an optimization action
 * Returns a mutation that can be triggered with action params
 */
export function useExecuteAction() {
  const queryClient = useQueryClient()

  return useMutation<ActionResult, Error, ExecuteActionParams>({
    mutationFn: async (params) => {
      const startTime = performance.now()
      console.log(`[useExecuteAction] Executing: ${params.action} on ${params.resourceType}/${params.resourceId}`)

      const response = await fetch("/api/execute-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })

      const json = await response.json()
      const duration = performance.now() - startTime
      console.log(`[useExecuteAction] Response in ${duration.toFixed(0)}ms - Success: ${json.success}`)

      // Handle both API-level errors (json.error) and action-level failures (json.data.success)
      if (!json.success) {
        const errorMsg = json.error || json.data?.message || "Action execution failed"
        console.error(`[useExecuteAction] ❌ Action failed:`, errorMsg)
        throw new Error(errorMsg)
      }

      // Also check if the action itself failed (executor returns success: false)
      if (json.data && !json.data.success) {
        const errorMsg = json.data.message || "Action execution failed"
        console.error(`[useExecuteAction] ❌ Action execution failed:`, errorMsg)
        throw new Error(errorMsg)
      }

      console.log(`[useExecuteAction] ✅ ${json.data.message}`)
      return json.data
    },
    onSuccess: (data) => {
      // Invalidate waste detection to refresh the list
      console.log("[useExecuteAction] ✅ Action succeeded, invalidating queries")
      console.log("[useExecuteAction] Result:", data.message)
      queryClient.invalidateQueries({ queryKey: ["waste-detection"] })
      // Invalidate ALL audit log queries (any limit)
      queryClient.invalidateQueries({ queryKey: ["audit-log"], exact: false })
    },
    onError: (error) => {
      console.error("[useExecuteAction] ❌ Action failed:", error.message)
    },
  })
}

/**
 * Hook to fetch the audit log of executed actions
 */
export function useAuditLog(limit = 50) {
  return useQuery<AuditLogEntry[]>({
    queryKey: ["audit-log", limit],
    queryFn: async () => {
      const startTime = performance.now()
      console.log(`[useAuditLog] Fetching audit log (limit: ${limit})`)

      try {
        const response = await fetch(`/api/execute-action?limit=${limit}`)
        const json = await response.json()

        const duration = performance.now() - startTime

        if (!json.success) {
          // Don't throw for table not found - just return empty array
          console.log(`[useAuditLog] Note: ${json.error}`)
          return []
        }

        const entries = json.data as AuditLogEntry[]
        console.log(`[useAuditLog] ✅ Fetched ${entries.length} entries in ${duration.toFixed(0)}ms`)

        // Log recent entries for debugging
        if (entries.length > 0) {
          const recentEntries = entries.slice(0, 3).map(e => ({
            resource: e.resource_name,
            action: e.action,
            success: e.success,
            time: e.executed_at,
          }))
          console.log(`[useAuditLog] Most recent entries:`, recentEntries)
        }

        return entries
      } catch (error) {
        console.log(`[useAuditLog] Error fetching audit log:`, error)
        return []
      }
    },
    staleTime: 5000, // Consider stale after 5 seconds (was 10s)
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook to get count of actions executed today
 */
export function useExecutedTodayCount() {
  const { data: auditLog, isLoading } = useAuditLog(100)

  if (isLoading || !auditLog) {
    console.log("[useExecutedTodayCount] Loading audit log...")
    return { count: 0, isLoading: true }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayEntries = auditLog.filter((entry) => {
    const entryDate = new Date(entry.executed_at)
    return entryDate >= today && entry.success
  })

  const todayCount = todayEntries.length

  console.log(`[useExecutedTodayCount] Audit log entries: ${auditLog.length} | Today's successful: ${todayCount}`)
  if (todayEntries.length > 0) {
    console.log("[useExecutedTodayCount] Today's actions:", todayEntries.map(e => ({
      resource: e.resource_name,
      action: e.action,
      time: e.executed_at
    })))
  }

  return { count: todayCount, isLoading: false }
}

export interface ExecutionStats {
  today: number
  thisWeek: number
  thisMonth: number
  thisYear: number
  allTime: number
  totalSavingsRealized: number
}

/**
 * Hook to get comprehensive execution statistics
 */
export function useExecutionStats() {
  const { data: auditLog, isLoading, dataUpdatedAt } = useAuditLog(1000) // Fetch more for comprehensive stats

  if (isLoading || !auditLog) {
    return {
      stats: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        thisYear: 0,
        allTime: 0,
        totalSavingsRealized: 0,
      } as ExecutionStats,
      isLoading: true,
      recentEntries: [] as AuditLogEntry[],
    }
  }

  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)

  const successfulEntries = auditLog.filter((entry) => entry.success)

  let todayCount = 0
  let weekCount = 0
  let monthCount = 0
  let yearCount = 0

  for (const entry of successfulEntries) {
    const entryDate = new Date(entry.executed_at)
    if (entryDate >= today) todayCount++
    if (entryDate >= weekStart) weekCount++
    if (entryDate >= monthStart) monthCount++
    if (entryDate >= yearStart) yearCount++
  }

  // Estimate savings realized based on number of actions
  // Each action saves approximately $15-50/month on average
  const avgSavingsPerAction = 25
  const totalSavingsRealized = successfulEntries.length * avgSavingsPerAction

  const stats: ExecutionStats = {
    today: todayCount,
    thisWeek: weekCount,
    thisMonth: monthCount,
    thisYear: yearCount,
    allTime: successfulEntries.length,
    totalSavingsRealized,
  }

  // Log stats calculation for debugging
  console.log(`[useExecutionStats] Calculated from ${auditLog.length} entries (${successfulEntries.length} successful):`, {
    today: todayCount,
    thisWeek: weekCount,
    thisMonth: monthCount,
    allTime: successfulEntries.length,
    dataUpdatedAt: new Date(dataUpdatedAt).toISOString(),
  })

  return {
    stats,
    isLoading: false,
    recentEntries: auditLog.slice(0, 10),
  }
}
