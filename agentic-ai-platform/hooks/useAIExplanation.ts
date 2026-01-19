"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

/**
 * Input for recommendation explanation
 */
export interface RecommendationExplanationInput {
  resourceName: string
  resourceType: string
  scenarioId: string
  scenarioName: string
  action: string
  potentialSavings: number
  currentCost: number
  details: Record<string, unknown>
  region?: string
  env?: string
}

/**
 * Input for dashboard insight
 */
export interface DashboardInsightInput {
  totalResources: number
  totalDetections: number
  totalSavings: number
  topScenarios: { name: string; count: number; savings: number }[]
  autoSafeCount: number
  approvalCount: number
}

/**
 * Structured explanation for a recommendation
 */
/**
 * Alternative action option for a recommendation
 */
export interface AlternativeAction {
  action: string
  target: string
  reason: string
  projectedCost: string
  savings: string
  savingsPercent: number
  risk: "low" | "medium" | "high"
}

export interface StructuredExplanation {
  currentState: {
    resource: string
    type: string
    utilization: {
      metric: string
      current: string
      capacity: string
      percentage: number
    }[]
  }
  problem: {
    summary: string
    details: string
  }
  recommendation: {
    action: string
    target: string
    reason: string
  }
  alternatives?: AlternativeAction[]
  impact: {
    currentCost: string
    projectedCost: string
    savings: string
    savingsPercent: number
  }
  risk: {
    level: "low" | "medium" | "high"
    considerations: string[]
  }
}

/**
 * Explanation result from API
 */
export interface ExplanationResult {
  explanation: string
  structured?: StructuredExplanation | null
  cached: boolean
  model?: string
  tokensUsed?: number
}

/**
 * AI service status
 */
export interface AIStatus {
  configured: boolean
  message: string
}

/**
 * Hook to check if AI service is configured
 */
export function useAIStatus() {
  return useQuery<AIStatus>({
    queryKey: ["ai-status"],
    queryFn: async () => {
      const response = await fetch("/api/ai/explain")
      const json = await response.json()
      if (!json.success) {
        throw new Error(json.error)
      }
      return json.data
    },
    staleTime: 60000, // Check every minute
    retry: false,
  })
}

/**
 * Hook to generate a recommendation explanation
 */
export function useRecommendationExplanation(input: RecommendationExplanationInput | null) {
  return useQuery<ExplanationResult>({
    queryKey: ["ai-explanation", "recommendation", input],
    queryFn: async () => {
      if (!input) throw new Error("No input provided")

      const response = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "recommendation", data: input }),
      })

      const json = await response.json()
      if (!json.success) {
        throw new Error(json.error)
      }
      return json.data
    },
    enabled: !!input,
    staleTime: 300000, // 5 minutes
    retry: 1,
  })
}

/**
 * Hook to generate a dashboard insight
 */
export function useDashboardInsight(input: DashboardInsightInput | null) {
  return useQuery<ExplanationResult>({
    queryKey: ["ai-explanation", "dashboard", input],
    queryFn: async () => {
      if (!input) throw new Error("No input provided")

      const response = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "dashboard", data: input }),
      })

      const json = await response.json()
      if (!json.success) {
        throw new Error(json.error)
      }
      return json.data
    },
    enabled: !!input && input.totalResources > 0,
    staleTime: 300000, // 5 minutes
    retry: 1,
  })
}

/**
 * Hook to generate explanation on demand (mutation)
 */
export function useGenerateExplanation() {
  const queryClient = useQueryClient()

  return useMutation<ExplanationResult, Error, { type: string; data: unknown }>({
    mutationFn: async ({ type, data }) => {
      const response = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      })

      const json = await response.json()
      if (!json.success) {
        throw new Error(json.error)
      }
      return json.data
    },
    onSuccess: (data, variables) => {
      // Cache the result
      queryClient.setQueryData(
        ["ai-explanation", variables.type, variables.data],
        data
      )
    },
  })
}

/**
 * Hook to generate structured explanation on demand (mutation)
 * Returns detailed breakdown with utilization metrics, problem analysis,
 * recommendation details, financial impact, and risk assessment
 */
export function useGenerateStructuredExplanation() {
  const queryClient = useQueryClient()

  return useMutation<ExplanationResult, Error, RecommendationExplanationInput>({
    mutationFn: async (data) => {
      const response = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "recommendation-structured", data }),
      })

      const json = await response.json()
      if (!json.success) {
        throw new Error(json.error)
      }
      return json.data
    },
    onSuccess: (data, variables) => {
      // Cache the result
      queryClient.setQueryData(
        ["ai-explanation", "recommendation-structured", variables],
        data
      )
    },
  })
}

/**
 * Hook to generate batch explanations for multiple recommendations
 */
export function useGenerateBatchExplanations() {
  return useMutation<ExplanationResult[], Error, RecommendationExplanationInput[]>({
    mutationFn: async (inputs) => {
      const response = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "batch", data: inputs }),
      })

      const json = await response.json()
      if (!json.success) {
        throw new Error(json.error)
      }
      return json.data
    },
  })
}
