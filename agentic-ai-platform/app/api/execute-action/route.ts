import { NextRequest, NextResponse } from "next/server"
import { createExecutor, ExecuteActionParams } from "@/lib/agent/executor"
import { cookies } from "next/headers"

/**
 * POST /api/execute-action
 *
 * Execute an optimization action on a cloud resource.
 * Used by Auto-Safe mode to perform automatic optimizations.
 *
 * Body params:
 * - action: The action type to execute (e.g., "stop_instance", "release_eip")
 * - resourceType: The type of resource (e.g., "instances", "elastic_ips")
 * - resourceId: The ID of the resource to act on
 * - resourceName: Human-readable name of the resource
 * - detectionId: ID of the waste detection that triggered this action
 * - scenarioId: ID of the scenario (e.g., "orphaned_eip")
 * - details: Optional additional details
 */
export async function POST(request: NextRequest) {
  const requestStartTime = performance.now()
  console.log("[API /execute-action] Request started")

  try {
    // Parse request body
    const parseStartTime = performance.now()
    const body = await request.json().catch(() => ({}))
    console.log(`[API /execute-action] Body parsed in ${(performance.now() - parseStartTime).toFixed(0)}ms`)

    // Validate required fields
    const requiredFields = ["action", "resourceType", "resourceId", "resourceName", "detectionId", "scenarioId"]
    const missingFields = requiredFields.filter((field) => !body[field])

    if (missingFields.length > 0) {
      console.log(`[API /execute-action] ❌ Missing required fields: ${missingFields.join(", ")}`)
      return NextResponse.json(
        {
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
        },
        { status: 400 }
      )
    }

    // Get Supabase credentials
    let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Fall back to cookies if not in env
    if (!supabaseUrl || !supabaseKey) {
      const cookieStore = await cookies()
      supabaseUrl = cookieStore.get("aws_env_url")?.value
      supabaseKey = cookieStore.get("aws_env_key")?.value
    }

    if (!supabaseUrl || !supabaseKey) {
      console.log(`[API /execute-action] ❌ No credentials found`)
      return NextResponse.json(
        {
          success: false,
          error: "Not connected to database. Please configure connection.",
        },
        { status: 401 }
      )
    }

    // Create executor and execute action
    console.log(`[API /execute-action] ========== SERVER EXECUTION ==========`)
    console.log(`[API /execute-action] Action: ${body.action}`)
    console.log(`[API /execute-action] Resource Type: ${body.resourceType}`)
    console.log(`[API /execute-action] Resource ID: ${body.resourceId}`)
    console.log(`[API /execute-action] Resource Name: ${body.resourceName}`)
    console.log(`[API /execute-action] Scenario: ${body.scenarioId}`)
    console.log(`[API /execute-action] Detection ID: ${body.detectionId}`)

    const executionStartTime = performance.now()

    const executor = createExecutor(supabaseUrl, supabaseKey)
    const params: ExecuteActionParams = {
      action: body.action,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      resourceName: body.resourceName,
      detectionId: body.detectionId,
      scenarioId: body.scenarioId,
      details: body.details,
    }

    const result = await executor.executeAction(params)
    const executionDuration = performance.now() - executionStartTime
    console.log(`[API /execute-action] Executor completed in ${executionDuration.toFixed(0)}ms`)
    console.log(`[API /execute-action] Success: ${result.success}`)
    console.log(`[API /execute-action] Message: ${result.message}`)
    if (result.previousState) {
      console.log(`[API /execute-action] Previous State:`, result.previousState)
    }
    if (result.newState) {
      console.log(`[API /execute-action] New State:`, result.newState)
    }

    const totalDuration = performance.now() - requestStartTime
    if (result.success) {
      console.log(`[API /execute-action] ✅ Total: ${totalDuration.toFixed(0)}ms`)
    } else {
      console.log(`[API /execute-action] ⚠️ Total: ${totalDuration.toFixed(0)}ms | FAILED`)
    }
    console.log(`[API /execute-action] =====================================`)

    return NextResponse.json({
      success: result.success,
      data: result,
    })
  } catch (error) {
    const totalDuration = performance.now() - requestStartTime
    console.error(`[API /execute-action] ❌ Error after ${totalDuration.toFixed(0)}ms:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Action execution failed",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/execute-action
 *
 * Get the audit log of executed actions.
 *
 * Query params:
 * - limit: Maximum number of entries to return (default 50)
 */
export async function GET(request: NextRequest) {
  const requestStartTime = performance.now()
  console.log("[API /execute-action GET] ========== FETCH AUDIT LOG ==========")

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50", 10)

    // Get Supabase credentials
    let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      const cookieStore = await cookies()
      supabaseUrl = cookieStore.get("aws_env_url")?.value
      supabaseKey = cookieStore.get("aws_env_key")?.value
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Not connected to database.",
        },
        { status: 401 }
      )
    }

    const executor = createExecutor(supabaseUrl, supabaseKey)
    const auditLog = await executor.getAuditLog(limit)

    const totalDuration = performance.now() - requestStartTime
    console.log(`[API /execute-action GET] ✅ Fetched ${auditLog.length} entries in ${totalDuration.toFixed(0)}ms`)

    return NextResponse.json({
      success: true,
      data: auditLog,
    })
  } catch (error) {
    const totalDuration = performance.now() - requestStartTime
    console.error(`[API /execute-action GET] ❌ Error after ${totalDuration.toFixed(0)}ms:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch audit log",
      },
      { status: 500 }
    )
  }
}
