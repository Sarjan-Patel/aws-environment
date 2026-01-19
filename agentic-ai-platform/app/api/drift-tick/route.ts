import { NextRequest, NextResponse } from "next/server"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { createDetector, DetectionResult } from "@/lib/agent/detector"
import { createExecutor, ExecuteActionParams } from "@/lib/agent/executor"
import { WASTE_SCENARIOS, AUTO_SAFE_SCENARIOS } from "@/lib/agent/scenarios"

// Server-side debug logger with timestamps
const debug = (message: string, data?: unknown) => {
  const timestamp = new Date().toISOString()
  if (data !== undefined) {
    console.log(`[${timestamp}] [API /drift-tick] ${message}`, data)
  } else {
    console.log(`[${timestamp}] [API /drift-tick] ${message}`)
  }
}

/**
 * Seed wasteful data to ensure detection always has resources to find
 * This runs before detection to guarantee test data exists
 */
async function seedWastefulData(supabase: SupabaseClient): Promise<{
  rds: number
  cache: number
  s3: number
  snapshots: number
  asg: number
  loadBalancers: number
}> {
  const counts = { rds: 0, cache: 0, s3: 0, snapshots: 0, asg: 0, loadBalancers: 0 }

  try {
    // 1. Seed idle RDS instances (CPU < 15%, connections <= 1)
    const { data: rdsInstances } = await supabase
      .from("rds_instances")
      .select("id, db_instance_id")
      .eq("state", "available")
      .limit(3)

    if (rdsInstances && rdsInstances.length > 0) {
      for (const instance of rdsInstances.slice(0, 2)) {
        const { error } = await supabase
          .from("rds_instances")
          .update({
            avg_cpu_7d: Math.random() * 10 + 2, // 2-12%
            avg_connections_7d: Math.random() < 0.5 ? 0 : 1, // 0 or 1
          })
          .eq("id", instance.id)
        if (!error) counts.rds++
      }
    }

    // 2. Seed idle ElastiCache clusters (CPU < 15%, connections <= 3)
    const { data: cacheClusters } = await supabase
      .from("cache_clusters")
      .select("id, cluster_id")
      .limit(3)

    if (cacheClusters && cacheClusters.length > 0) {
      for (const cluster of cacheClusters.slice(0, 2)) {
        const { error } = await supabase
          .from("cache_clusters")
          .update({
            avg_cpu_7d: Math.random() * 10 + 2, // 2-12%
            avg_connections_7d: Math.floor(Math.random() * 3), // 0-2
          })
          .eq("id", cluster.id)
        if (!error) counts.cache++
      }
    }

    // 3. Seed S3 buckets without lifecycle policies
    const { data: s3Buckets } = await supabase
      .from("s3_buckets")
      .select("id")
      .limit(3)

    if (s3Buckets && s3Buckets.length > 0) {
      for (const bucket of s3Buckets.slice(0, 2)) {
        const { error } = await supabase
          .from("s3_buckets")
          .update({ lifecycle_rules: null })
          .eq("id", bucket.id)
        if (!error) counts.s3++
      }
    }

    // 4. Seed old snapshots (> 90 days)
    const { data: snapshots } = await supabase
      .from("snapshots")
      .select("id")
      .limit(3)

    if (snapshots && snapshots.length > 0) {
      for (const snapshot of snapshots.slice(0, 2)) {
        const daysOld = 95 + Math.floor(Math.random() * 60) // 95-155 days
        const oldDate = new Date()
        oldDate.setDate(oldDate.getDate() - daysOld)
        const { error } = await supabase
          .from("snapshots")
          .update({ created_at: oldDate.toISOString() })
          .eq("id", snapshot.id)
        if (!error) counts.snapshots++
      }
    }

    // 5. Seed wasteful ASGs (feature/preview environments with low utilization)
    const { data: asgs } = await supabase
      .from("autoscaling_groups")
      .select("id, name")
      .limit(3)

    if (asgs && asgs.length > 0) {
      const envs = ["feature-branch", "preview", "dev-test"]
      const staleDate = new Date()
      staleDate.setDate(staleDate.getDate() - 14) // 14 days old

      for (let i = 0; i < Math.min(2, asgs.length); i++) {
        const { error } = await supabase
          .from("autoscaling_groups")
          .update({
            env: envs[i % envs.length],
            current_utilization: Math.random() * 15 + 3, // 3-18%
            desired_capacity: 2 + Math.floor(Math.random() * 2), // 2-3
            min_size: 1,
            created_at: staleDate.toISOString(),
          })
          .eq("id", asgs[i].id)
        if (!error) counts.asg++
      }
    }

    // 6. Seed idle load balancers (low request count)
    const { data: lbs } = await supabase
      .from("load_balancers")
      .select("id, name")
      .limit(3)

    if (lbs && lbs.length > 0) {
      for (const lb of lbs.slice(0, 2)) {
        const { error } = await supabase
          .from("load_balancers")
          .update({
            avg_request_count_7d: Math.floor(Math.random() * 100), // 0-100
          })
          .eq("id", lb.id)
        if (!error) counts.loadBalancers++
      }
    }

  } catch (error) {
    debug("Error seeding wasteful data:", error)
  }

  return counts
}

/**
 * POST /api/drift-tick
 *
 * Main drift detection and auto-execution endpoint.
 * This is the "heartbeat" of the optimization agent:
 * 1. Runs waste detection across all resources
 * 2. Checks if automated mode is enabled
 * 3. If automated, executes all auto-safe actions automatically
 *
 * This endpoint can be called:
 * - Manually via the UI refresh button
 * - On a schedule (cron job)
 * - Via webhook from external systems
 *
 * Body params:
 * - autoExecute: (optional) Override the execution mode (true = auto-execute, false = detect only)
 */
export async function POST(request: NextRequest) {
  const requestStartTime = performance.now()
  debug("╔══════════════════════════════════════════════════════════════╗")
  debug("║                    DRIFT TICK STARTED                        ║")
  debug("╚══════════════════════════════════════════════════════════════╝")

  try {
    // Parse request body
    const body = await request.json().catch(() => ({}))
    debug("Request body:", body)

    // Get Supabase credentials from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      debug("❌ ERROR: No database credentials found")
      debug("  NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "SET" : "NOT SET")
      debug("  SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "NOT SET")
      debug("  NEXT_PUBLIC_SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "NOT SET")
      return NextResponse.json(
        {
          success: false,
          error: "Not connected to database. Please configure connection.",
        },
        { status: 401 }
      )
    }

    debug("Database credentials: OK")

    // Create Supabase client for seeding
    const supabase = createClient(supabaseUrl, supabaseKey)

    // ═══════════════════════════════════════════════════════════════════
    // STEP 0: Seed wasteful data (ensures detections always exist)
    // ═══════════════════════════════════════════════════════════════════
    debug("─── STEP 0: SEEDING WASTEFUL DATA ───")
    const seedStartTime = performance.now()
    const seedCounts = await seedWastefulData(supabase)
    const seedDuration = performance.now() - seedStartTime
    debug(`Seeding completed in ${seedDuration.toFixed(0)}ms`)
    debug(`Seeded: RDS=${seedCounts.rds}, Cache=${seedCounts.cache}, S3=${seedCounts.s3}, Snapshots=${seedCounts.snapshots}, ASG=${seedCounts.asg}, LB=${seedCounts.loadBalancers}`)

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: Run waste detection
    // ═══════════════════════════════════════════════════════════════════
    debug("─── STEP 1: WASTE DETECTION ───")
    const detectionStartTime = performance.now()
    const detector = createDetector(supabaseUrl, supabaseKey)
    const result: DetectionResult = await detector.detectAll()
    const detectionDuration = performance.now() - detectionStartTime
    debug(`Detection completed in ${detectionDuration.toFixed(0)}ms`)
    debug(`Total detections: ${result.detections.length}`)
    debug(`Total potential savings: $${result.summary.totalPotentialSavings.toFixed(2)}/mo`)

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: Check execution mode setting
    // ═══════════════════════════════════════════════════════════════════
    debug("─── STEP 2: EXECUTION MODE CHECK ───")

    // Check if auto-execute is explicitly set in body, otherwise check settings
    let shouldAutoExecute = body.autoExecute
    let modeSource = "request body"

    if (typeof shouldAutoExecute !== "boolean") {
      debug("autoExecute not in request body, checking database settings...")
      const { data: settings, error: settingsError } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "execution_settings")
        .single()

      if (settingsError) {
        debug("Settings query error:", settingsError.message)
        debug("Error code:", settingsError.code)
        if (settingsError.code === "PGRST116") {
          debug("Settings row not found - defaulting to manual mode")
        } else if (settingsError.code === "42P01") {
          debug("Settings table does not exist - defaulting to manual mode")
        }
        shouldAutoExecute = false
        modeSource = "default (settings not found)"
      } else {
        debug("Settings from database:", settings?.value)
        shouldAutoExecute = settings?.value?.mode === "automated"
        modeSource = "database settings"
      }
    } else {
      debug(`autoExecute explicitly set in request body: ${shouldAutoExecute}`)
    }

    debug(`═══════════════════════════════════════════════════════════════`)
    debug(`EXECUTION MODE: ${shouldAutoExecute ? "🟢 AUTOMATED" : "🔴 MANUAL"}`)
    debug(`Mode source: ${modeSource}`)
    debug(`═══════════════════════════════════════════════════════════════`)

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: Filter for auto-safe detections
    // ═══════════════════════════════════════════════════════════════════
    debug("─── STEP 3: FILTER AUTO-SAFE DETECTIONS ───")
    const autoSafeIds = AUTO_SAFE_SCENARIOS.map((s) => s.id)
    debug("Auto-safe scenario IDs:", autoSafeIds)

    const autoSafeDetections = result.detections.filter((d) =>
      autoSafeIds.includes(d.scenarioId as typeof autoSafeIds[number])
    )

    debug(`Auto-safe detections: ${autoSafeDetections.length} of ${result.detections.length} total`)
    if (autoSafeDetections.length > 0) {
      debug("Auto-safe detection details:")
      autoSafeDetections.forEach((d, i) => {
        debug(`  ${i + 1}. ${d.resourceName} (${d.scenarioId}) - $${d.potentialSavings.toFixed(2)}/mo`)
      })
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 4: Execute actions if automated mode
    // ═══════════════════════════════════════════════════════════════════
    debug("─── STEP 4: EXECUTION ───")
    let executionResults: {
      resourceId: string
      resourceName: string
      action: string
      success: boolean
      message: string
      durationMs: number
    }[] = []

    if (!shouldAutoExecute) {
      debug("⏸️  SKIPPING EXECUTION - Mode is MANUAL")
      debug("   To auto-execute, either:")
      debug("   1. Toggle to 'Automated' mode in the UI")
      debug("   2. Pass { autoExecute: true } in the request body")
    } else if (autoSafeDetections.length === 0) {
      debug("⏸️  SKIPPING EXECUTION - No auto-safe detections found")
    } else {
      debug(`🚀 EXECUTING ${autoSafeDetections.length} AUTO-SAFE ACTIONS...`)
      const executor = createExecutor(supabaseUrl, supabaseKey)

      for (let i = 0; i < autoSafeDetections.length; i++) {
        const detection = autoSafeDetections[i]
        const actionStartTime = performance.now()
        const scenario = WASTE_SCENARIOS[detection.scenarioId as keyof typeof WASTE_SCENARIOS]

        debug(`─── Action ${i + 1}/${autoSafeDetections.length} ───`)
        debug(`Resource: ${detection.resourceName}`)
        debug(`Resource ID: ${detection.resourceId}`)
        debug(`Scenario: ${detection.scenarioId}`)

        if (!scenario) {
          debug(`⚠️  Unknown scenario: ${detection.scenarioId} - SKIPPING`)
          continue
        }

        debug(`Action: ${scenario.action}`)

        try {
          const params: ExecuteActionParams = {
            action: scenario.action,
            resourceType: scenario.resourceType,
            resourceId: detection.resourceId,
            resourceName: detection.resourceName,
            detectionId: detection.id,
            scenarioId: detection.scenarioId,
            details: detection.details,
          }

          debug("Executing with params:", params)
          const execResult = await executor.executeAction(params)
          const actionDuration = performance.now() - actionStartTime

          executionResults.push({
            resourceId: detection.resourceId,
            resourceName: detection.resourceName,
            action: scenario.action,
            success: execResult.success,
            message: execResult.message,
            durationMs: Math.round(actionDuration),
          })

          if (execResult.success) {
            debug(`✅ SUCCESS: ${execResult.message} (${actionDuration.toFixed(0)}ms)`)
          } else {
            debug(`❌ FAILED: ${execResult.message} (${actionDuration.toFixed(0)}ms)`)
          }
        } catch (error) {
          const actionDuration = performance.now() - actionStartTime
          const message = error instanceof Error ? error.message : "Unknown error"

          executionResults.push({
            resourceId: detection.resourceId,
            resourceName: detection.resourceName,
            action: scenario.action,
            success: false,
            message,
            durationMs: Math.round(actionDuration),
          })

          debug(`❌ EXCEPTION: ${message} (${actionDuration.toFixed(0)}ms)`)
          console.error("Full error:", error)
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════
    const totalDuration = performance.now() - requestStartTime
    const successCount = executionResults.filter((r) => r.success).length
    const failCount = executionResults.filter((r) => !r.success).length

    debug("╔══════════════════════════════════════════════════════════════╗")
    debug("║                    DRIFT TICK COMPLETE                       ║")
    debug("╠══════════════════════════════════════════════════════════════╣")
    debug(`║  Total Duration: ${totalDuration.toFixed(0)}ms`)
    debug(`║  Seeding Duration: ${seedDuration.toFixed(0)}ms`)
    debug(`║  Detection Duration: ${detectionDuration.toFixed(0)}ms`)
    debug(`║  `)
    debug(`║  🌱 SEEDING:`)
    debug(`║     RDS: ${seedCounts.rds}, Cache: ${seedCounts.cache}, S3: ${seedCounts.s3}`)
    debug(`║     Snapshots: ${seedCounts.snapshots}, ASG: ${seedCounts.asg}, LB: ${seedCounts.loadBalancers}`)
    debug(`║  `)
    debug(`║  📊 DETECTIONS:`)
    debug(`║     Total: ${result.detections.length}`)
    debug(`║     Auto-Safe: ${autoSafeDetections.length}`)
    debug(`║     Total Savings: $${result.summary.totalPotentialSavings.toFixed(2)}/mo`)
    debug(`║  `)
    debug(`║  ⚡ EXECUTION:`)
    debug(`║     Mode: ${shouldAutoExecute ? "AUTOMATED" : "MANUAL"}`)
    debug(`║     Executed: ${executionResults.length}`)
    debug(`║     Success: ${successCount}`)
    debug(`║     Failed: ${failCount}`)
    debug("╚══════════════════════════════════════════════════════════════╝")

    return NextResponse.json({
      success: true,
      data: {
        seeding: {
          rds: seedCounts.rds,
          cache: seedCounts.cache,
          s3: seedCounts.s3,
          snapshots: seedCounts.snapshots,
          asg: seedCounts.asg,
          loadBalancers: seedCounts.loadBalancers,
        },
        detection: {
          totalDetections: result.detections.length,
          autoSafeDetections: autoSafeDetections.length,
          totalSavings: result.summary.totalPotentialSavings,
          autoSafeSavings: autoSafeDetections.reduce((sum, d) => sum + d.potentialSavings, 0),
          byScenario: result.summary.byScenario,
        },
        execution: {
          mode: shouldAutoExecute ? "automated" : "manual",
          executed: executionResults.length,
          success: successCount,
          failed: failCount,
          results: executionResults,
        },
        timing: {
          seedingMs: Math.round(seedDuration),
          detectionMs: Math.round(detectionDuration),
          totalMs: Math.round(totalDuration),
        },
      },
    })
  } catch (error) {
    const totalDuration = performance.now() - requestStartTime
    debug(`❌ FATAL ERROR after ${totalDuration.toFixed(0)}ms:`)
    console.error(error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Drift tick failed",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/drift-tick
 *
 * Get the status of the drift-tick system.
 */
export async function GET() {
  debug("GET /api/drift-tick - Status check")

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      debug("No database credentials")
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
          mode: "unknown",
          message: "Database not configured",
        },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: settings, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "execution_settings")
      .single()

    if (error) {
      debug("Settings query error:", error.message)
    }

    const mode = settings?.value?.mode || "manual"
    debug(`Current mode: ${mode}`)

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        mode,
        lastUpdated: settings?.value?.updated_at || null,
        autoSafeScenarios: AUTO_SAFE_SCENARIOS.length,
      },
    })
  } catch (error) {
    debug("GET error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get status",
      },
      { status: 500 }
    )
  }
}
