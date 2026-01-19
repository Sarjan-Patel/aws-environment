import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import {
  validatePolicyUpdate,
  type OptimizationPolicy,
  type ResourceType,
} from "@/lib/utils/policyLock"

// Map URL resource types to database table names
const TABLE_MAP: Record<string, string> = {
  instances: "instances",
  "autoscaling-groups": "autoscaling_groups",
  "rds-instances": "rds_instances",
  "cache-clusters": "cache_clusters",
  "load-balancers": "load_balancers",
  "s3-buckets": "s3_buckets",
  "log-groups": "log_groups",
  "elastic-ips": "elastic_ips",
  volumes: "volumes",
  snapshots: "snapshots",
  "lambda-functions": "lambda_functions",
}

// Map URL types to ResourceType
const RESOURCE_TYPE_MAP: Record<string, ResourceType> = {
  instances: "instances",
  "autoscaling-groups": "autoscaling_groups",
  "rds-instances": "rds_instances",
  "cache-clusters": "cache_clusters",
  "load-balancers": "load_balancers",
  "s3-buckets": "s3_buckets",
  "log-groups": "log_groups",
  "elastic-ips": "elastic_ips",
  volumes: "volumes",
  snapshots: "snapshots",
  "lambda-functions": "lambda_functions",
}

/**
 * PATCH /api/resources/[type]/[id]/policy
 *
 * Update a resource's optimization policy.
 *
 * Body:
 * - policy: 'auto_safe' | 'recommend_only' | 'ignore'
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const requestStartTime = performance.now()

  try {
    const { type, id } = await params
    console.log(`[API /resources/${type}/${id}/policy] PATCH request started`)

    // Validate resource type
    const tableName = TABLE_MAP[type]
    const resourceType = RESOURCE_TYPE_MAP[type]

    if (!tableName || !resourceType) {
      return NextResponse.json(
        { success: false, error: `Invalid resource type: ${type}` },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const newPolicy = body.policy as OptimizationPolicy

    if (!newPolicy || !["auto_safe", "recommend_only", "ignore"].includes(newPolicy)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid policy. Must be: auto_safe, recommend_only, or ignore",
        },
        { status: 400 }
      )
    }

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
        { success: false, error: "Not connected to database" },
        { status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch the current resource to check lock status
    const { data: resource, error: fetchError } = await supabase
      .from(tableName)
      .select("id, env, optimization_policy, optimization_policy_locked")
      .eq("id", id)
      .single()

    if (fetchError || !resource) {
      console.error(`[API /resources/${type}/${id}/policy] Resource not found:`, fetchError)
      return NextResponse.json(
        { success: false, error: "Resource not found" },
        { status: 404 }
      )
    }

    // Validate the policy update
    const validation = validatePolicyUpdate(
      {
        type: resourceType,
        env: resource.env,
        optimization_policy_locked: resource.optimization_policy_locked,
      },
      newPolicy
    )

    if (!validation.valid) {
      console.log(`[API /resources/${type}/${id}/policy] Policy update blocked:`, validation.error)
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 403 }
      )
    }

    // Update the policy
    const previousPolicy = resource.optimization_policy
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ optimization_policy: newPolicy })
      .eq("id", id)

    if (updateError) {
      console.error(`[API /resources/${type}/${id}/policy] Update failed:`, updateError)
      return NextResponse.json(
        { success: false, error: `Update failed: ${updateError.message}` },
        { status: 500 }
      )
    }

    const duration = performance.now() - requestStartTime
    console.log(
      `[API /resources/${type}/${id}/policy] Updated in ${duration.toFixed(0)}ms: ${previousPolicy} -> ${newPolicy}`
    )

    return NextResponse.json({
      success: true,
      data: {
        resourceId: id,
        resourceType: type,
        previousPolicy,
        newPolicy,
      },
    })
  } catch (error) {
    const duration = performance.now() - requestStartTime
    console.error(`[API /resources] Error after ${duration.toFixed(0)}ms:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update policy",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/resources/[type]/[id]/policy
 *
 * Get a resource's current optimization policy and lock status.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const requestStartTime = performance.now()

  try {
    const { type, id } = await params
    console.log(`[API /resources/${type}/${id}/policy] GET request started`)

    const tableName = TABLE_MAP[type]
    if (!tableName) {
      return NextResponse.json(
        { success: false, error: `Invalid resource type: ${type}` },
        { status: 400 }
      )
    }

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
        { success: false, error: "Not connected to database" },
        { status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: resource, error } = await supabase
      .from(tableName)
      .select("id, env, optimization_policy, optimization_policy_locked")
      .eq("id", id)
      .single()

    if (error || !resource) {
      return NextResponse.json(
        { success: false, error: "Resource not found" },
        { status: 404 }
      )
    }

    const duration = performance.now() - requestStartTime
    console.log(`[API /resources/${type}/${id}/policy] Fetched in ${duration.toFixed(0)}ms`)

    return NextResponse.json({
      success: true,
      data: {
        resourceId: id,
        resourceType: type,
        policy: resource.optimization_policy || "recommend_only",
        locked: resource.optimization_policy_locked || false,
        env: resource.env,
      },
    })
  } catch (error) {
    console.error("[API /resources] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch policy",
      },
      { status: 500 }
    )
  }
}
