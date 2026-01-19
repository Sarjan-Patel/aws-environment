import { NextRequest, NextResponse } from "next/server"
import { createDetector, DetectionResult, clearDetectionCache, getCacheStatus } from "@/lib/agent/detector"
import { cookies } from "next/headers"

/**
 * POST /api/detect-waste
 *
 * Run waste detection against the connected Supabase database.
 * Requires connection credentials from cookies or request body.
 *
 * Body params:
 * - supabaseUrl: (optional) Override Supabase URL
 * - supabaseKey: (optional) Override Supabase key
 * - refresh: (optional) Set to true to force a fresh detection (bypass cache)
 */
export async function POST(request: NextRequest) {
  const requestStartTime = performance.now()
  console.log("[API /detect-waste] Request started")

  try {
    // Get credentials from request body or cookies
    const parseStartTime = performance.now()
    const body = await request.json().catch(() => ({}))
    console.log(`[API /detect-waste] Body parsed in ${(performance.now() - parseStartTime).toFixed(0)}ms`)

    // If refresh is requested, clear the cache first
    if (body.refresh === true) {
      clearDetectionCache()
    }

    let supabaseUrl = body.supabaseUrl
    let supabaseKey = body.supabaseKey

    // Fall back to environment variables (use service role key to bypass RLS)
    if (!supabaseUrl || !supabaseKey) {
      supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }

    // Fall back to cookies if not provided in body or env
    if (!supabaseUrl || !supabaseKey) {
      const cookieStore = await cookies()
      supabaseUrl = cookieStore.get("aws_env_url")?.value
      supabaseKey = cookieStore.get("aws_env_key")?.value
    }

    if (!supabaseUrl || !supabaseKey) {
      // console.log(`[API /api/detect-waste POST] No credentials found, returning 401 after ${(performance.now() - requestStartTime).toFixed(2)}ms`)
      return NextResponse.json(
        {
          success: false,
          error: "Not connected to database. Please configure connection in .env.local or via UI.",
        },
        { status: 401 }
      )
    }

    // Create detector and run detection
    console.log("[API /detect-waste] Starting detection...")
    const detectionStartTime = performance.now()
    const detector = createDetector(supabaseUrl, supabaseKey)
    const result: DetectionResult = await detector.detectAll()
    const detectionDuration = performance.now() - detectionStartTime
    console.log(`[API /detect-waste] Detection completed in ${detectionDuration.toFixed(0)}ms`)

    // Get cache status for debugging
    const cacheStatus = getCacheStatus()

    const totalDuration = performance.now() - requestStartTime
    console.log(`[API /detect-waste] ✅ Total: ${totalDuration.toFixed(0)}ms | ${result.detections.length} detections | Cache: ${cacheStatus.cached ? 'HIT' : 'MISS'}`)

    return NextResponse.json({
      success: true,
      data: result,
      cache: cacheStatus,
    })
  } catch (error) {
    const totalDuration = performance.now() - requestStartTime
    console.error(`[API /detect-waste] ❌ Error after ${totalDuration.toFixed(0)}ms:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Detection failed",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/detect-waste
 *
 * Get information about available detection scenarios.
 */
export async function GET() {
  const { WASTE_SCENARIOS, AUTO_SAFE_SCENARIOS, APPROVAL_REQUIRED_SCENARIOS } = await import(
    "@/lib/agent/scenarios"
  )

  return NextResponse.json({
    success: true,
    data: {
      totalScenarios: Object.keys(WASTE_SCENARIOS).length,
      autoSafeCount: AUTO_SAFE_SCENARIOS.length,
      approvalRequiredCount: APPROVAL_REQUIRED_SCENARIOS.length,
      scenarios: WASTE_SCENARIOS,
    },
  })
}
