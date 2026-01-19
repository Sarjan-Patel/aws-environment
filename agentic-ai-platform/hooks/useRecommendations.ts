"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Recommendation,
  RecommendationStatus,
  RecommendationSummary,
  ImpactLevel,
} from "@/lib/agent/recommender"

// Filter options for the hook
interface RecommendationFilters {
  status?: RecommendationStatus | RecommendationStatus[]
  scenarioId?: string
  resourceType?: string
  impactLevel?: ImpactLevel
  limit?: number
  offset?: number
}

// Build query string from filters
function buildQueryString(filters: RecommendationFilters): string {
  const params = new URLSearchParams()

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      params.set("status", filters.status.join(","))
    } else {
      params.set("status", filters.status)
    }
  }
  if (filters.scenarioId) params.set("scenario_id", filters.scenarioId)
  if (filters.resourceType) params.set("resource_type", filters.resourceType)
  if (filters.impactLevel) params.set("impact_level", filters.impactLevel)
  if (filters.limit) params.set("limit", filters.limit.toString())
  if (filters.offset) params.set("offset", filters.offset.toString())

  return params.toString()
}

/**
 * Hook to fetch recommendations with optional filters
 */
export function useRecommendations(filters: RecommendationFilters = {}) {
  const queryString = buildQueryString(filters)
  const queryKey = ["recommendations", queryString]

  return useQuery<Recommendation[]>({
    queryKey,
    queryFn: async () => {
      const url = queryString
        ? `/api/recommendations?${queryString}`
        : "/api/recommendations"

      const response = await fetch(url)
      const json = await response.json()

      if (!json.success) {
        throw new Error(json.error || "Failed to fetch recommendations")
      }

      return json.data
    },
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Hook to fetch pending recommendations (for approval queue)
 */
export function usePendingRecommendations() {
  return useRecommendations({
    status: ["pending", "snoozed"],
  })
}

/**
 * Hook to fetch recommendation summary statistics
 */
export function useRecommendationSummary() {
  return useQuery<RecommendationSummary>({
    queryKey: ["recommendations", "summary"],
    queryFn: async () => {
      const response = await fetch("/api/recommendations?summary=true")
      const json = await response.json()

      if (!json.success) {
        throw new Error(json.error || "Failed to fetch summary")
      }

      return json.data
    },
    staleTime: 30000,
  })
}

/**
 * Hook to generate recommendations from current waste detections
 */
export function useGenerateRecommendations() {
  const queryClient = useQueryClient()

  return useMutation<
    { created: number; skipped: number; data: Recommendation[] },
    Error
  >({
    mutationFn: async () => {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generate: true }),
      })

      const json = await response.json()

      if (!json.success) {
        throw new Error(json.error || "Failed to generate recommendations")
      }

      return {
        created: json.created,
        skipped: json.skipped,
        data: json.data,
      }
    },
    onSuccess: () => {
      // Invalidate recommendations queries to refetch
      queryClient.invalidateQueries({ queryKey: ["recommendations"] })
      // Invalidate waste detection to refresh dashboard with latest state
      queryClient.invalidateQueries({ queryKey: ["waste-detection"] })
    },
  })
}

/**
 * Hook to approve a recommendation
 */
export function useApproveRecommendation() {
  const queryClient = useQueryClient()

  return useMutation<Recommendation, Error, { id: string; actionedBy?: string }>({
    mutationFn: async ({ id, actionedBy }) => {
      const response = await fetch("/api/recommendations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action: "approve",
          actionedBy,
        }),
      })

      const json = await response.json()

      if (!json.success) {
        throw new Error(json.error || "Failed to approve recommendation")
      }

      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] })
      // Invalidate waste detection to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ["waste-detection"] })
      // Invalidate audit log to refresh activity
      queryClient.invalidateQueries({ queryKey: ["audit-log"], exact: false })
    },
  })
}

/**
 * Hook to reject a recommendation
 */
export function useRejectRecommendation() {
  const queryClient = useQueryClient()

  return useMutation<
    Recommendation,
    Error,
    { id: string; reason?: string; actionedBy?: string }
  >({
    mutationFn: async ({ id, reason, actionedBy }) => {
      const response = await fetch("/api/recommendations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action: "reject",
          reason,
          actionedBy,
        }),
      })

      const json = await response.json()

      if (!json.success) {
        throw new Error(json.error || "Failed to reject recommendation")
      }

      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] })
      // Invalidate waste detection to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ["waste-detection"] })
    },
  })
}

/**
 * Hook to snooze a recommendation
 */
export function useSnoozeRecommendation() {
  const queryClient = useQueryClient()

  return useMutation<
    Recommendation,
    Error,
    { id: string; days: number; actionedBy?: string }
  >({
    mutationFn: async ({ id, days, actionedBy }) => {
      const response = await fetch("/api/recommendations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action: "snooze",
          days,
          actionedBy,
        }),
      })

      const json = await response.json()

      if (!json.success) {
        throw new Error(json.error || "Failed to snooze recommendation")
      }

      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] })
      // Invalidate waste detection to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ["waste-detection"] })
    },
  })
}

/**
 * Hook to schedule a recommendation for future execution
 */
export function useScheduleRecommendation() {
  const queryClient = useQueryClient()

  return useMutation<
    Recommendation,
    Error,
    { id: string; scheduledFor: Date; actionedBy?: string }
  >({
    mutationFn: async ({ id, scheduledFor, actionedBy }) => {
      const response = await fetch("/api/recommendations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action: "schedule",
          scheduledFor: scheduledFor.toISOString(),
          actionedBy,
        }),
      })

      const json = await response.json()

      if (!json.success) {
        throw new Error(json.error || "Failed to schedule recommendation")
      }

      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] })
      // Invalidate waste detection to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ["waste-detection"] })
    },
  })
}

/**
 * Hook to execute an approved recommendation
 */
export function useExecuteRecommendation() {
  const queryClient = useQueryClient()

  return useMutation<
    { recommendation: Recommendation; executionResult: unknown },
    Error,
    { id: string }
  >({
    mutationFn: async ({ id }) => {
      const response = await fetch("/api/recommendations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action: "execute",
        }),
      })

      const json = await response.json()

      if (!json.success) {
        throw new Error(json.error || "Failed to execute recommendation")
      }

      return {
        recommendation: json.data,
        executionResult: json.executionResult,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] })
      // Invalidate waste detection to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ["waste-detection"] })
      // Invalidate audit log to refresh activity and stats
      queryClient.invalidateQueries({ queryKey: ["audit-log"], exact: false })
    },
  })
}

/**
 * Hook to delete a recommendation
 */
export function useDeleteRecommendation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const response = await fetch(`/api/recommendations?id=${id}`, {
        method: "DELETE",
      })

      const json = await response.json()

      if (!json.success) {
        throw new Error(json.error || "Failed to delete recommendation")
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] })
    },
  })
}

/**
 * Combined hook for the approvals page
 * Provides pending recommendations, summary, and action mutations
 */
export function useApprovalsData() {
  const recommendations = usePendingRecommendations()
  const summary = useRecommendationSummary()
  const generateMutation = useGenerateRecommendations()
  const approveMutation = useApproveRecommendation()
  const rejectMutation = useRejectRecommendation()
  const snoozeMutation = useSnoozeRecommendation()
  const scheduleMutation = useScheduleRecommendation()
  const executeMutation = useExecuteRecommendation()

  // Sort recommendations by impact level (critical > high > medium > low)
  const impactOrder: Record<ImpactLevel, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  }

  const sortedRecommendations = recommendations.data
    ? [...recommendations.data].sort(
        (a, b) =>
          (impactOrder[b.impact_level] || 0) - (impactOrder[a.impact_level] || 0)
      )
    : []

  return {
    // Data
    recommendations: sortedRecommendations,
    summary: summary.data,

    // Loading states
    isLoading: recommendations.isLoading || summary.isLoading,
    isGenerating: generateMutation.isPending,

    // Errors
    error: recommendations.error || summary.error,

    // Actions
    generateRecommendations: generateMutation.mutateAsync,
    approve: approveMutation.mutateAsync,
    reject: rejectMutation.mutateAsync,
    snooze: snoozeMutation.mutateAsync,
    schedule: scheduleMutation.mutateAsync,
    execute: executeMutation.mutateAsync,

    // Mutation states
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isSnoozing: snoozeMutation.isPending,
    isScheduling: scheduleMutation.isPending,
    isExecuting: executeMutation.isPending,

    // Refetch
    refetch: () => {
      recommendations.refetch()
      summary.refetch()
    },
  }
}
