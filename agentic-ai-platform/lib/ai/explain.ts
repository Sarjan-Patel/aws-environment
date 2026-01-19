import { getOpenAIClient, isOpenAIConfigured, DEFAULT_CONFIG, AIRequestConfig } from "./client"
import {
  SYSTEM_PROMPT,
  generateRecommendationPrompt,
  generateStructuredRecommendationPrompt,
  generateDashboardInsightPrompt,
  generateBulkActionSummaryPrompt,
} from "./prompts"

/**
 * Structured explanation for a recommendation
 * Provides clear, organized information about the optimization
 */
export interface StructuredExplanation {
  // Current state of the resource
  currentState: {
    resource: string           // e.g., "EC2 instance web-server-prod"
    type: string               // e.g., "t3.xlarge"
    utilization: {
      metric: string           // e.g., "CPU", "Memory", "Connections"
      current: string          // e.g., "8%", "256 MB"
      capacity: string         // e.g., "100%", "3008 MB"
      percentage: number       // e.g., 8
    }[]
  }
  // Why this is wasteful
  problem: {
    summary: string            // One-line summary
    details: string            // Detailed explanation
  }
  // What action we recommend
  recommendation: {
    action: string             // e.g., "Rightsize", "Delete", "Stop"
    target: string             // e.g., "t3.medium", "N/A"
    reason: string             // Why this specific action
  }
  // Financial impact
  impact: {
    currentCost: string        // e.g., "$121.47/month"
    projectedCost: string      // e.g., "$60.74/month"
    savings: string            // e.g., "$60.73/month"
    savingsPercent: number     // e.g., 50
  }
  // Risk assessment
  risk: {
    level: "low" | "medium" | "high"
    considerations: string[]   // Things to check before acting
  }
}

/**
 * Result of an AI explanation request
 */
export interface ExplanationResult {
  success: boolean
  explanation: string | null
  structured?: StructuredExplanation | null
  error?: string
  cached?: boolean
  model?: string
  tokensUsed?: number
}

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
 * Input for bulk action summary
 */
export interface BulkActionSummaryInput {
  executedCount: number
  successCount: number
  failedCount: number
  totalSavings: number
  actions: { resourceName: string; action: string; success: boolean; message: string }[]
}

// Simple in-memory cache for explanations
const explanationCache = new Map<string, { explanation: string; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Generate a cache key from input
 */
function getCacheKey(type: string, input: unknown): string {
  return `${type}:${JSON.stringify(input)}`
}

/**
 * Get cached explanation if available and not expired
 */
function getCachedExplanation(key: string): string | null {
  const cached = explanationCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.explanation
  }
  explanationCache.delete(key)
  return null
}

/**
 * Cache an explanation
 */
function cacheExplanation(key: string, explanation: string): void {
  explanationCache.set(key, { explanation, timestamp: Date.now() })
}

/**
 * Call OpenAI to generate an explanation
 */
async function callOpenAI(
  prompt: string,
  config: AIRequestConfig = DEFAULT_CONFIG
): Promise<ExplanationResult> {
  if (!isOpenAIConfigured()) {
    return {
      success: false,
      explanation: null,
      error: "OpenAI API key not configured",
    }
  }

  try {
    const client = getOpenAIClient()
    const response = await client.chat.completions.create({
      model: config.model || DEFAULT_CONFIG.model!,
      max_tokens: config.maxTokens || DEFAULT_CONFIG.maxTokens,
      temperature: config.temperature || DEFAULT_CONFIG.temperature,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    })

    const explanation = response.choices[0]?.message?.content?.trim() || null

    if (!explanation) {
      return {
        success: false,
        explanation: null,
        error: "No response from OpenAI",
      }
    }

    return {
      success: true,
      explanation,
      model: response.model,
      tokensUsed: response.usage?.total_tokens,
    }
  } catch (error) {
    console.error("[AI] OpenAI API error:", error)
    return {
      success: false,
      explanation: null,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Generate an explanation for a recommendation
 */
export async function explainRecommendation(
  input: RecommendationExplanationInput,
  config?: AIRequestConfig
): Promise<ExplanationResult> {
  // Check cache first
  const cacheKey = getCacheKey("recommendation", input)
  const cached = getCachedExplanation(cacheKey)
  if (cached) {
    return {
      success: true,
      explanation: cached,
      cached: true,
    }
  }

  // Generate prompt and call API
  const prompt = generateRecommendationPrompt(input)
  const result = await callOpenAI(prompt, config)

  // Cache successful results
  if (result.success && result.explanation) {
    cacheExplanation(cacheKey, result.explanation)
  }

  return result
}

/**
 * Generate a structured explanation for a recommendation
 * Returns both human-readable text and structured JSON data
 */
export async function explainRecommendationStructured(
  input: RecommendationExplanationInput,
  config?: AIRequestConfig
): Promise<ExplanationResult> {
  // Check cache first
  const cacheKey = getCacheKey("recommendation-structured", input)
  const cached = getCachedExplanation(cacheKey)
  if (cached) {
    try {
      const structured = JSON.parse(cached) as StructuredExplanation
      return {
        success: true,
        explanation: structured.problem.summary,
        structured,
        cached: true,
      }
    } catch {
      // If cache is corrupted, continue to regenerate
    }
  }

  // Generate structured prompt and call API
  const prompt = generateStructuredRecommendationPrompt(input)
  const result = await callOpenAI(prompt, config)

  if (!result.success || !result.explanation) {
    return result
  }

  // Parse the JSON response
  try {
    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = result.explanation
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    const structured = JSON.parse(jsonStr) as StructuredExplanation

    // Cache the structured result
    cacheExplanation(cacheKey, JSON.stringify(structured))

    return {
      success: true,
      explanation: structured.problem.summary,
      structured,
      model: result.model,
      tokensUsed: result.tokensUsed,
    }
  } catch (parseError) {
    console.error("[AI] Failed to parse structured response:", parseError)
    // Fall back to the raw response as explanation
    return {
      success: true,
      explanation: result.explanation,
      structured: null,
      model: result.model,
      tokensUsed: result.tokensUsed,
    }
  }
}

/**
 * Generate a dashboard insight
 */
export async function generateDashboardInsight(
  input: DashboardInsightInput,
  config?: AIRequestConfig
): Promise<ExplanationResult> {
  // Check cache first
  const cacheKey = getCacheKey("dashboard", input)
  const cached = getCachedExplanation(cacheKey)
  if (cached) {
    return {
      success: true,
      explanation: cached,
      cached: true,
    }
  }

  // Generate prompt and call API
  const prompt = generateDashboardInsightPrompt(input)
  const result = await callOpenAI(prompt, config)

  // Cache successful results
  if (result.success && result.explanation) {
    cacheExplanation(cacheKey, result.explanation)
  }

  return result
}

/**
 * Generate a summary for bulk actions
 */
export async function summarizeBulkActions(
  input: BulkActionSummaryInput,
  config?: AIRequestConfig
): Promise<ExplanationResult> {
  // Check cache first
  const cacheKey = getCacheKey("bulk", input)
  const cached = getCachedExplanation(cacheKey)
  if (cached) {
    return {
      success: true,
      explanation: cached,
      cached: true,
    }
  }

  // Generate prompt and call API
  const prompt = generateBulkActionSummaryPrompt(input)
  const result = await callOpenAI(prompt, config)

  // Cache successful results
  if (result.success && result.explanation) {
    cacheExplanation(cacheKey, result.explanation)
  }

  return result
}

/**
 * Batch generate explanations for multiple recommendations
 * Limits concurrency to avoid rate limits
 */
export async function explainRecommendationsBatch(
  inputs: RecommendationExplanationInput[],
  config?: AIRequestConfig,
  maxConcurrency: number = 3
): Promise<ExplanationResult[]> {
  const results: ExplanationResult[] = []

  // Process in batches to respect rate limits
  for (let i = 0; i < inputs.length; i += maxConcurrency) {
    const batch = inputs.slice(i, i + maxConcurrency)
    const batchResults = await Promise.all(
      batch.map((input) => explainRecommendation(input, config))
    )
    results.push(...batchResults)

    // Small delay between batches to avoid rate limits
    if (i + maxConcurrency < inputs.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  return results
}

/**
 * Clear the explanation cache
 */
export function clearExplanationCache(): void {
  explanationCache.clear()
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; oldestEntry: number | null } {
  let oldest: number | null = null
  explanationCache.forEach((value) => {
    if (oldest === null || value.timestamp < oldest) {
      oldest = value.timestamp
    }
  })

  return {
    size: explanationCache.size,
    oldestEntry: oldest,
  }
}
