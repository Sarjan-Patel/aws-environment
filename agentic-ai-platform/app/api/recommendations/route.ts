import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  createRecommender,
  RecommendationFilters,
  RecommendationStatus,
} from "@/lib/agent/recommender"
import { createDetector } from "@/lib/agent/detector"

/**
 * Helper to get Supabase credentials
 */
async function getCredentials(): Promise<{ url: string; key: string } | null> {
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    const cookieStore = await cookies()
    supabaseUrl = cookieStore.get("aws_env_url")?.value
    supabaseKey = cookieStore.get("aws_env_key")?.value
  }

  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  return { url: supabaseUrl, key: supabaseKey }
}

/**
 * GET /api/recommendations
 *
 * List recommendations with optional filters
 *
 * Query params:
 * - status: Filter by status (pending, approved, rejected, snoozed, scheduled, executed)
 * - scenario_id: Filter by scenario ID
 * - resource_type: Filter by resource type
 * - impact_level: Filter by impact level (low, medium, high, critical)
 * - limit: Maximum number of results (default 50)
 * - offset: Number of results to skip for pagination
 * - summary: If "true", return summary statistics instead of list
 */
export async function GET(request: NextRequest) {
  const startTime = performance.now()

  try {
    const credentials = await getCredentials()
    if (!credentials) {
      return NextResponse.json(
        { success: false, error: "Not connected to database" },
        { status: 401 }
      )
    }

    const recommender = createRecommender(credentials.url, credentials.key)
    const { searchParams } = new URL(request.url)

    // Check if summary is requested
    if (searchParams.get("summary") === "true") {
      const summary = await recommender.getSummary()
      const duration = performance.now() - startTime
      console.log(`[API /recommendations GET] Summary fetched in ${duration.toFixed(0)}ms`)

      return NextResponse.json({
        success: true,
        data: summary,
      })
    }

    // Build filters from query params
    const filters: RecommendationFilters = {}

    const status = searchParams.get("status")
    if (status) {
      // Support comma-separated statuses
      if (status.includes(",")) {
        filters.status = status.split(",") as RecommendationStatus[]
      } else {
        filters.status = status as RecommendationStatus
      }
    }

    const scenarioId = searchParams.get("scenario_id")
    if (scenarioId) filters.scenario_id = scenarioId

    const resourceType = searchParams.get("resource_type")
    if (resourceType) filters.resource_type = resourceType

    const impactLevel = searchParams.get("impact_level")
    if (impactLevel) filters.impact_level = impactLevel as RecommendationFilters["impact_level"]

    const limit = searchParams.get("limit")
    if (limit) filters.limit = parseInt(limit, 10)

    const offset = searchParams.get("offset")
    if (offset) filters.offset = parseInt(offset, 10)

    const recommendations = await recommender.list(filters)
    const duration = performance.now() - startTime

    console.log(`[API /recommendations GET] Listed ${recommendations.length} recommendations in ${duration.toFixed(0)}ms`)

    return NextResponse.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
    })
  } catch (error) {
    const duration = performance.now() - startTime
    console.error(`[API /recommendations GET] Error after ${duration.toFixed(0)}ms:`, error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch recommendations",
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/recommendations
 *
 * Create recommendations from waste detections or generate new ones
 *
 * Body params:
 * - generate: If true, run detection and create recommendations for Mode 3 detections
 * - detection: Single WasteDetection object to create recommendation from
 * - detections: Array of WasteDetection objects to create recommendations from
 */
export async function POST(request: NextRequest) {
  const startTime = performance.now()

  try {
    const credentials = await getCredentials()
    if (!credentials) {
      return NextResponse.json(
        { success: false, error: "Not connected to database" },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const recommender = createRecommender(credentials.url, credentials.key)

    // Option 1: Generate recommendations from current waste detections
    if (body.generate === true) {
      const detector = createDetector(credentials.url, credentials.key)
      const detectionResult = await detector.detectAll()

      // Filter for Mode 3 detections and create recommendations
      const mode3Detections = detectionResult.detections.filter((d) => d.mode === 3)
      const recommendations = await recommender.createFromDetections(mode3Detections)

      const duration = performance.now() - startTime
      console.log(`[API /recommendations POST] Generated ${recommendations.length} recommendations in ${duration.toFixed(0)}ms`)

      return NextResponse.json({
        success: true,
        data: recommendations,
        created: recommendations.length,
        skipped: mode3Detections.length - recommendations.length,
      })
    }

    // Option 2: Create recommendation from single detection
    if (body.detection) {
      const recommendation = await recommender.createFromDetection({
        detection: body.detection,
        title: body.title,
        description: body.description,
        aiExplanation: body.aiExplanation,
      })

      const duration = performance.now() - startTime
      console.log(`[API /recommendations POST] Created recommendation in ${duration.toFixed(0)}ms`)

      return NextResponse.json({
        success: true,
        data: recommendation,
      })
    }

    // Option 3: Create recommendations from multiple detections
    if (body.detections && Array.isArray(body.detections)) {
      const recommendations = await recommender.createFromDetections(body.detections)

      const duration = performance.now() - startTime
      console.log(`[API /recommendations POST] Created ${recommendations.length} recommendations in ${duration.toFixed(0)}ms`)

      return NextResponse.json({
        success: true,
        data: recommendations,
        created: recommendations.length,
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid request. Provide 'generate: true', 'detection', or 'detections' array.",
      },
      { status: 400 }
    )
  } catch (error) {
    const duration = performance.now() - startTime
    console.error(`[API /recommendations POST] Error after ${duration.toFixed(0)}ms:`, error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create recommendations",
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/recommendations
 *
 * Update a recommendation (approve, reject, snooze, schedule)
 *
 * Body params:
 * - id: Recommendation ID (required)
 * - action: 'approve' | 'reject' | 'snooze' | 'schedule' | 'execute' | 'update'
 * - reason: Rejection reason (for reject action)
 * - days: Number of days to snooze (for snooze action)
 * - scheduledFor: ISO date string (for schedule action)
 * - userNotes: Optional user notes
 */
export async function PATCH(request: NextRequest) {
  const startTime = performance.now()

  try {
    const credentials = await getCredentials()
    if (!credentials) {
      return NextResponse.json(
        { success: false, error: "Not connected to database" },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: "Missing recommendation ID" },
        { status: 400 }
      )
    }

    const recommender = createRecommender(credentials.url, credentials.key)

    let result

    switch (body.action) {
      case "approve":
        result = await recommender.approve(body.id, body.actionedBy)
        break

      case "reject":
        result = await recommender.reject(body.id, body.reason, body.actionedBy)
        break

      case "snooze":
        if (!body.days || typeof body.days !== "number" || body.days < 1) {
          return NextResponse.json(
            { success: false, error: "Invalid snooze duration. Provide days (1-30)." },
            { status: 400 }
          )
        }
        result = await recommender.snooze(body.id, body.days, body.actionedBy)
        break

      case "schedule":
        if (!body.scheduledFor) {
          return NextResponse.json(
            { success: false, error: "Missing scheduledFor date" },
            { status: 400 }
          )
        }
        const scheduledDate = new Date(body.scheduledFor)
        if (isNaN(scheduledDate.getTime())) {
          return NextResponse.json(
            { success: false, error: "Invalid scheduledFor date" },
            { status: 400 }
          )
        }
        result = await recommender.schedule(body.id, scheduledDate, body.actionedBy)
        break

      case "execute":
        const execResult = await recommender.execute(body.id)
        const duration = performance.now() - startTime
        console.log(`[API /recommendations PATCH] Executed recommendation in ${duration.toFixed(0)}ms`)

        return NextResponse.json({
          success: execResult.result.success,
          data: execResult.recommendation,
          executionResult: execResult.result,
        })

      case "update":
        result = await recommender.update(body.id, {
          user_notes: body.userNotes,
          status: body.status,
        })
        break

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action. Use: approve, reject, snooze, schedule, execute, or update",
          },
          { status: 400 }
        )
    }

    const duration = performance.now() - startTime
    console.log(`[API /recommendations PATCH] ${body.action} completed in ${duration.toFixed(0)}ms`)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    const duration = performance.now() - startTime
    console.error(`[API /recommendations PATCH] Error after ${duration.toFixed(0)}ms:`, error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update recommendation",
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/recommendations
 *
 * Delete a recommendation
 *
 * Query params:
 * - id: Recommendation ID to delete
 */
export async function DELETE(request: NextRequest) {
  const startTime = performance.now()

  try {
    const credentials = await getCredentials()
    if (!credentials) {
      return NextResponse.json(
        { success: false, error: "Not connected to database" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing recommendation ID" },
        { status: 400 }
      )
    }

    const recommender = createRecommender(credentials.url, credentials.key)
    await recommender.delete(id)

    const duration = performance.now() - startTime
    console.log(`[API /recommendations DELETE] Deleted recommendation in ${duration.toFixed(0)}ms`)

    return NextResponse.json({
      success: true,
      deleted: id,
    })
  } catch (error) {
    const duration = performance.now() - startTime
    console.error(`[API /recommendations DELETE] Error after ${duration.toFixed(0)}ms:`, error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete recommendation",
      },
      { status: 500 }
    )
  }
}
