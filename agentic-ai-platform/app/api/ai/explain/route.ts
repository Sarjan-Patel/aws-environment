import { NextRequest, NextResponse } from "next/server"
import {
  explainRecommendation,
  explainRecommendationStructured,
  generateDashboardInsight,
  summarizeBulkActions,
  explainRecommendationsBatch,
  RecommendationExplanationInput,
  DashboardInsightInput,
  BulkActionSummaryInput,
} from "@/lib/ai/explain"
import { isOpenAIConfigured } from "@/lib/ai/client"

/**
 * POST /api/ai/explain
 *
 * Generate AI explanations for various contexts:
 * - recommendation: Explain a single recommendation (text)
 * - recommendation-structured: Explain with structured JSON breakdown
 * - dashboard: Generate dashboard-level insights
 * - bulk: Summarize bulk action results
 * - batch: Generate explanations for multiple recommendations
 */
export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local",
        },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { type, data } = body

    if (!type || !data) {
      return NextResponse.json(
        { success: false, error: "Missing type or data in request body" },
        { status: 400 }
      )
    }

    let result

    switch (type) {
      case "recommendation": {
        const input = data as RecommendationExplanationInput
        if (!input.resourceName || !input.scenarioId) {
          return NextResponse.json(
            { success: false, error: "Missing required fields for recommendation explanation" },
            { status: 400 }
          )
        }
        result = await explainRecommendation(input)
        break
      }

      case "recommendation-structured": {
        const input = data as RecommendationExplanationInput
        if (!input.resourceName || !input.scenarioId) {
          return NextResponse.json(
            { success: false, error: "Missing required fields for structured recommendation explanation" },
            { status: 400 }
          )
        }
        result = await explainRecommendationStructured(input)
        // Return structured data if available
        if (result.success && result.structured) {
          return NextResponse.json({
            success: true,
            data: {
              explanation: result.explanation,
              structured: result.structured,
              cached: result.cached || false,
              model: result.model,
              tokensUsed: result.tokensUsed,
            },
          })
        }
        break
      }

      case "dashboard": {
        const input = data as DashboardInsightInput
        if (input.totalResources === undefined || input.totalDetections === undefined) {
          return NextResponse.json(
            { success: false, error: "Missing required fields for dashboard insight" },
            { status: 400 }
          )
        }
        result = await generateDashboardInsight(input)
        break
      }

      case "bulk": {
        const input = data as BulkActionSummaryInput
        if (input.executedCount === undefined || !input.actions) {
          return NextResponse.json(
            { success: false, error: "Missing required fields for bulk action summary" },
            { status: 400 }
          )
        }
        result = await summarizeBulkActions(input)
        break
      }

      case "batch": {
        const inputs = data as RecommendationExplanationInput[]
        if (!Array.isArray(inputs) || inputs.length === 0) {
          return NextResponse.json(
            { success: false, error: "Data must be a non-empty array for batch explanations" },
            { status: 400 }
          )
        }
        if (inputs.length > 10) {
          return NextResponse.json(
            { success: false, error: "Maximum 10 recommendations per batch request" },
            { status: 400 }
          )
        }
        const results = await explainRecommendationsBatch(inputs)
        return NextResponse.json({
          success: true,
          data: results,
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown type: ${type}. Valid types: recommendation, recommendation-structured, dashboard, bulk, batch` },
          { status: 400 }
        )
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        explanation: result.explanation,
        cached: result.cached || false,
        model: result.model,
        tokensUsed: result.tokensUsed,
      },
    })
  } catch (error) {
    console.error("[API] /api/ai/explain error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/explain
 *
 * Check AI service status
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      configured: isOpenAIConfigured(),
      message: isOpenAIConfigured()
        ? "OpenAI API is configured and ready"
        : "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local",
    },
  })
}
