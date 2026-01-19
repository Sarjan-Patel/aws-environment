import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * GET /api/debug
 *
 * Debug endpoint to inspect database contents
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    let supabaseUrl = body.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL
    // Use service role key to bypass RLS for debugging
    let supabaseKey = body.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Missing credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local" }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Query all tables to see what data exists
    const [
      instances,
      elasticIps,
      volumes,
      snapshots,
      rdsInstances,
      cacheClusters,
      loadBalancers,
      lambdaFunctions,
      s3Buckets,
      logGroups,
      autoscalingGroups,
    ] = await Promise.all([
      supabase.from("instances").select("*").limit(10),
      supabase.from("elastic_ips").select("*").limit(10),
      supabase.from("volumes").select("*").limit(10),
      supabase.from("snapshots").select("*").limit(10),
      supabase.from("rds_instances").select("*").limit(10),
      supabase.from("cache_clusters").select("*").limit(10),
      supabase.from("load_balancers").select("*").limit(10),
      supabase.from("lambda_functions").select("*").limit(10),
      supabase.from("s3_buckets").select("*").limit(10),
      supabase.from("log_groups").select("*").limit(10),
      supabase.from("autoscaling_groups").select("*").limit(10),
    ])

    return NextResponse.json({
      instances: { count: instances.data?.length, data: instances.data, error: instances.error },
      elasticIps: { count: elasticIps.data?.length, data: elasticIps.data, error: elasticIps.error },
      volumes: { count: volumes.data?.length, data: volumes.data, error: volumes.error },
      snapshots: { count: snapshots.data?.length, data: snapshots.data, error: snapshots.error },
      rdsInstances: { count: rdsInstances.data?.length, data: rdsInstances.data, error: rdsInstances.error },
      cacheClusters: { count: cacheClusters.data?.length, data: cacheClusters.data, error: cacheClusters.error },
      loadBalancers: { count: loadBalancers.data?.length, data: loadBalancers.data, error: loadBalancers.error },
      lambdaFunctions: { count: lambdaFunctions.data?.length, data: lambdaFunctions.data, error: lambdaFunctions.error },
      s3Buckets: { count: s3Buckets.data?.length, data: s3Buckets.data, error: s3Buckets.error },
      logGroups: { count: logGroups.data?.length, data: logGroups.data, error: logGroups.error },
      autoscalingGroups: { count: autoscalingGroups.data?.length, data: autoscalingGroups.data, error: autoscalingGroups.error },
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
