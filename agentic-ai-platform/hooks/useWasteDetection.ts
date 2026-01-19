"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getConnection } from "@/lib/supabase/connection"

export interface WasteDetection {
  id: string
  scenarioId: string
  scenarioName: string
  resourceType: string
  resourceId: string
  resourceName: string
  region: string
  env: string | null
  monthlyCost: number
  potentialSavings: number
  confidence: number
  mode: number
  action: string
  details: Record<string, unknown>
}

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

export interface DetectionResult {
  detections: WasteDetection[]
  summary: {
    totalDetections: number
    totalPotentialSavings: number
    autoOptimizableSavings: number
    byScenario: Record<string, number>
    byMode: Record<number, number>
  }
  resourceCounts: ResourceCounts
}

export interface ScenarioInfo {
  totalScenarios: number
  autoSafeCount: number
  approvalRequiredCount: number
  scenarios: Record<string, unknown>
}

// Hook to get waste detection scenarios
export function useWasteScenarios() {
  return useQuery<ScenarioInfo>({
    queryKey: ["waste-scenarios"],
    queryFn: async () => {
      // const startTime = performance.now()
      // console.log("[useWasteScenarios] Query started")

      const response = await fetch("/api/detect-waste")
      const json = await response.json()

      if (!json.success) {
        // console.error(`[useWasteScenarios] ERROR after ${(performance.now() - startTime).toFixed(2)}ms:`, json.error)
        throw new Error(json.error || "Failed to fetch scenarios")
      }

      // const duration = performance.now() - startTime
      // console.log(`[useWasteScenarios] Query completed in ${duration.toFixed(2)}ms`)
      return json.data
    },
  })
}

// Hook to run waste detection
export function useWasteDetection() {
  return useQuery<DetectionResult>({
    queryKey: ["waste-detection"],
    queryFn: async () => {
      const startTime = performance.now()
      console.log("[useWasteDetection] Query started - Calling /api/detect-waste POST")

      const connection = getConnection()
      console.log(`[useWasteDetection] Connection available: ${!!connection}`)

      const fetchStartTime = performance.now()
      const response = await fetch("/api/detect-waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseUrl: connection?.url,
          supabaseKey: connection?.key,
        }),
      })
      const fetchDuration = performance.now() - fetchStartTime
      console.log(`[useWasteDetection] API response in ${fetchDuration.toFixed(0)}ms - Status: ${response.status}`)

      const parseStartTime = performance.now()
      const json = await response.json()
      const parseDuration = performance.now() - parseStartTime
      console.log(`[useWasteDetection] JSON parsed in ${parseDuration.toFixed(0)}ms`)

      if (!json.success) {
        console.error(`[useWasteDetection] ERROR after ${(performance.now() - startTime).toFixed(0)}ms:`, json.error)
        throw new Error(json.error || "Detection failed")
      }

      const totalDuration = performance.now() - startTime
      console.log(`[useWasteDetection] ✅ Total: ${totalDuration.toFixed(0)}ms | ${json.data.detections?.length ?? 0} detections | Cache: ${json.cache?.cached ? 'HIT' : 'MISS'}`)

      return json.data
    },
    refetchInterval: 60000, // Re-run detection every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  })
}

// Hook to manually trigger waste detection
export function useDetectWaste() {
  const queryClient = useQueryClient()

  return useMutation<DetectionResult, Error>({
    mutationFn: async () => {
      // const startTime = performance.now()
      // console.log("[useDetectWaste] Mutation started")

      const connection = getConnection()
      // console.log(`[useDetectWaste] Connection available: ${!!connection}`)

      const response = await fetch("/api/detect-waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseUrl: connection?.url,
          supabaseKey: connection?.key,
        }),
      })

      const json = await response.json()

      if (!json.success) {
        // console.error(`[useDetectWaste] ERROR after ${(performance.now() - startTime).toFixed(2)}ms:`, json.error)
        throw new Error(json.error || "Detection failed")
      }

      // const duration = performance.now() - startTime
      // console.log(`[useDetectWaste] Mutation completed in ${duration.toFixed(2)}ms - ${json.data.detections?.length ?? 0} detections`)
      return json.data
    },
    onSuccess: (data) => {
      // console.log("[useDetectWaste] Updating query cache with new detection results")
      // Update the cache with new detection results
      queryClient.setQueryData(["waste-detection"], data)
    },
  })
}

// Hook to refresh waste detection (bypasses server cache)
export function useRefreshDetection() {
  const queryClient = useQueryClient()

  return useMutation<DetectionResult, Error>({
    mutationFn: async () => {
      const startTime = performance.now()
      console.log("[useRefreshDetection] Refreshing detection (bypassing server cache)")

      const connection = getConnection()

      const response = await fetch("/api/detect-waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseUrl: connection?.url,
          supabaseKey: connection?.key,
          refresh: true, // Bypass server-side cache
        }),
      })

      const json = await response.json()

      if (!json.success) {
        console.error(`[useRefreshDetection] ERROR:`, json.error)
        throw new Error(json.error || "Detection refresh failed")
      }

      const duration = performance.now() - startTime
      console.log(`[useRefreshDetection] ✅ Refreshed in ${duration.toFixed(0)}ms | ${json.data.detections?.length ?? 0} detections`)
      return json.data
    },
    onSuccess: (data) => {
      console.log("[useRefreshDetection] Updating query cache with fresh detection results")
      queryClient.setQueryData(["waste-detection"], data)
    },
  })
}

// Drift-tick response type
export interface DriftTickResult {
  detection: {
    totalDetections: number
    autoSafeDetections: number
    totalSavings: number
    autoSafeSavings: number
  }
  execution: {
    mode: "automated" | "manual"
    executed: number
    success: number
    failed: number
    results: {
      resourceId: string
      resourceName: string
      action: string
      success: boolean
      message: string
      durationMs: number
    }[]
  }
  timing: {
    detectionMs: number
    totalMs: number
  }
}

// Debug logger for drift-tick
const driftTickDebug = (message: string, data?: unknown) => {
  const timestamp = new Date().toISOString().split("T")[1].slice(0, 12)
  if (data !== undefined) {
    console.log(`[${timestamp}] [useDriftTick] ${message}`, data)
  } else {
    console.log(`[${timestamp}] [useDriftTick] ${message}`)
  }
}

/**
 * Hook to trigger drift-tick which runs detection AND auto-execution if in automated mode.
 * Use this instead of refreshDetection when you want to trigger automatic execution.
 *
 * @param params.autoExecute - Force auto-execution regardless of mode setting
 */
export function useDriftTick() {
  const queryClient = useQueryClient()

  return useMutation<DriftTickResult, Error, { autoExecute?: boolean } | void>({
    mutationFn: async (params) => {
      const startTime = performance.now()
      driftTickDebug("========== DRIFT-TICK STARTED ==========")
      driftTickDebug("Params:", params)

      driftTickDebug("Calling POST /api/drift-tick...")
      const response = await fetch("/api/drift-tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params || {}),
      })

      driftTickDebug(`Response status: ${response.status}`)
      const json = await response.json()

      if (!json.success) {
        driftTickDebug("ERROR from API:", json.error)
        throw new Error(json.error || "Drift-tick failed")
      }

      const duration = performance.now() - startTime
      const result = json.data as DriftTickResult

      driftTickDebug("========== DRIFT-TICK RESULTS ==========")
      driftTickDebug(`Duration: ${duration.toFixed(0)}ms`)
      driftTickDebug(`Execution Mode: ${result.execution.mode}`)
      driftTickDebug(`Total Detections: ${result.detection.totalDetections}`)
      driftTickDebug(`Auto-Safe Detections: ${result.detection.autoSafeDetections}`)
      driftTickDebug(`Auto-Safe Savings: $${result.detection.autoSafeSavings.toFixed(2)}`)

      if (result.execution.executed > 0) {
        driftTickDebug("========== EXECUTION RESULTS ==========")
        driftTickDebug(`Executed: ${result.execution.executed}`)
        driftTickDebug(`Success: ${result.execution.success}`)
        driftTickDebug(`Failed: ${result.execution.failed}`)
        result.execution.results.forEach((r, i) => {
          driftTickDebug(`  ${i + 1}. ${r.resourceName}: ${r.success ? "✅" : "❌"} ${r.message} (${r.durationMs}ms)`)
        })
      } else {
        driftTickDebug(`No actions executed (mode: ${result.execution.mode}, auto-safe count: ${result.detection.autoSafeDetections})`)
      }
      driftTickDebug("========== DRIFT-TICK COMPLETE ==========")

      return result
    },
    onSuccess: async (result) => {
      driftTickDebug("Mutation onSuccess - invalidating caches")
      driftTickDebug(`Final result: ${result.execution.success} executed, ${result.detection.autoSafeDetections - result.execution.executed} remaining`)

      // If actions were executed, force a fresh detection with cache bypass
      // This is necessary because in-memory cache may not be shared across serverless instances
      if (result.execution.executed > 0) {
        driftTickDebug("Actions were executed - forcing cache bypass for fresh detection")
        // Set query data directly to trigger immediate update
        // The next detection call will use refresh: true via the mutation
      }

      // Invalidate all related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["waste-detection"] })
      // Invalidate audit log to refresh Recent Activity and execution stats
      queryClient.invalidateQueries({ queryKey: ["audit-log"], exact: false })
      // Also invalidate execution mode in case it changed
      queryClient.invalidateQueries({ queryKey: ["execution-mode"] })
    },
  })
}

// Get waste detections grouped by scenario
export function useWasteByScenario() {
  const { data: detectionResult } = useWasteDetection()

  if (!detectionResult) {
    return { data: null, isLoading: true }
  }

  const grouped = detectionResult.detections.reduce((acc, detection) => {
    const key = detection.scenarioId
    if (!acc[key]) {
      acc[key] = {
        scenarioId: detection.scenarioId,
        scenarioName: detection.scenarioName,
        mode: detection.mode,
        count: 0,
        totalSavings: 0,
        detections: [],
      }
    }
    acc[key].count++
    acc[key].totalSavings += detection.potentialSavings
    acc[key].detections.push(detection)
    return acc
  }, {} as Record<string, {
    scenarioId: string
    scenarioName: string
    mode: number
    count: number
    totalSavings: number
    detections: WasteDetection[]
  }>)

  return {
    data: Object.values(grouped).sort((a, b) => b.totalSavings - a.totalSavings),
    isLoading: false,
  }
}

// Get auto-safe detections (Mode 2)
export function useAutoSafeDetections() {
  const { data: detectionResult, isLoading, error } = useWasteDetection()

  return {
    data: detectionResult?.detections.filter(d => d.mode === 2) ?? [],
    totalSavings: detectionResult?.detections
      .filter(d => d.mode === 2)
      .reduce((sum, d) => sum + d.potentialSavings, 0) ?? 0,
    isLoading,
    error,
  }
}

// Get approval-required detections (Mode 3)
export function useApprovalRequiredDetections() {
  const { data: detectionResult, isLoading, error } = useWasteDetection()

  return {
    data: detectionResult?.detections.filter(d => d.mode === 3) ?? [],
    totalSavings: detectionResult?.detections
      .filter(d => d.mode === 3)
      .reduce((sum, d) => sum + d.potentialSavings, 0) ?? 0,
    isLoading,
    error,
  }
}

// Recommendation summary type (matching the one in recommender.ts)
export interface RecommendationSummaryData {
  total: number
  pending: number
  approved: number
  rejected: number
  snoozed: number
  scheduled: number
  executed: number
  totalPotentialSavings: number
  pendingSavings: number
  byResourceType: { resourceType: string; count: number; savings: number }[]
  byScenario: { scenarioId: string; scenarioName: string; count: number; savings: number }[]
}

/**
 * Hook to fetch recommendation summary from the database
 * Used to display consistent data across Dashboard and Approvals
 */
export function useRecommendationSummaryForDashboard() {
  return useQuery<RecommendationSummaryData>({
    queryKey: ["recommendations", "summary"],
    queryFn: async () => {
      const response = await fetch("/api/recommendations?summary=true")
      const json = await response.json()

      if (!json.success) {
        throw new Error(json.error || "Failed to fetch recommendation summary")
      }

      return json.data
    },
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Unified dashboard data hook
 * Returns all data needed for the dashboard from a single API call
 * Uses recommendation summary for consistent data with Approvals page
 */
export function useDashboardData() {
  const { data: detectionResult, isLoading: detectionLoading, error: detectionError, refetch } = useWasteDetection()
  const { data: recommendationSummary, isLoading: summaryLoading } = useRecommendationSummaryForDashboard()

  // Derive all dashboard data from the single detection result
  const counts = detectionResult?.resourceCounts ?? null

  const autoSafeDetections = detectionResult?.detections.filter(d => d.mode === 2) ?? []
  const autoSafeSavings = autoSafeDetections.reduce((sum, d) => sum + d.potentialSavings, 0)

  const approvalDetections = detectionResult?.detections.filter(d => d.mode === 3) ?? []
  const approvalSavings = approvalDetections.reduce((sum, d) => sum + d.potentialSavings, 0)

  // Use recommendation summary byScenario for consistent display with Approvals
  // This ensures Dashboard and Approvals show the same counts
  const wasteByScenario = recommendationSummary?.byScenario.map(s => ({
    scenarioId: s.scenarioId,
    scenarioName: s.scenarioName,
    mode: 3, // All recommendations are Mode 3 (approval required)
    count: s.count,
    totalSavings: s.savings,
  })) ?? []

  return {
    // Resource counts (from detector's pre-fetched data)
    counts,

    // Waste detection summary
    wasteDetection: detectionResult ? {
      detections: detectionResult.detections,
      summary: detectionResult.summary,
      totalDetections: detectionResult.summary.totalDetections,
      totalPotentialSavings: detectionResult.summary.totalPotentialSavings,
    } : null,

    // Auto-safe (Mode 2)
    autoSafe: {
      detections: autoSafeDetections,
      count: autoSafeDetections.length,
      totalSavings: autoSafeSavings,
    },

    // Approval required (Mode 3) - now uses recommendation summary for consistency
    approvals: {
      detections: approvalDetections,
      count: recommendationSummary?.pending ?? approvalDetections.length,
      totalSavings: recommendationSummary?.pendingSavings ?? approvalSavings,
    },

    // Recommendation summary for unified breakdown (from recommendations table)
    recommendationSummary,

    // Waste by scenario (from recommendations table for consistency with Approvals)
    wasteByScenario,

    // Loading and error states
    isLoading: detectionLoading || summaryLoading,
    error: detectionError,
    refetch,
  }
}
