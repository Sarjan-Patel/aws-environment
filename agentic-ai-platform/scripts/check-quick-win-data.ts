/**
 * Script to check existing data for quick-win optimization scenarios
 * Run with: npx tsx scripts/check-quick-win-data.ts
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { resolve } from "path"

// Load .env.local manually
const envPath = resolve(process.cwd(), ".env.local")
const envContent = readFileSync(envPath, "utf-8")
envContent.split("\n").forEach(line => {
  const [key, ...valueParts] = line.split("=")
  if (key && !key.startsWith("#")) {
    process.env[key.trim()] = valueParts.join("=").trim()
  }
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkData() {
  console.log("Checking existing data for quick-win scenarios...\n")

  // Check volumes for gp2
  const { data: volumes, error: volErr } = await supabase
    .from("volumes")
    .select("volume_id, volume_type, state, size_gib")
    .limit(20)
  console.log("=== VOLUMES ===")
  if (volErr) {
    console.log("Error:", volErr.message)
  } else {
    const allVols = volumes || []
    console.log(`Found ${allVols.length} volumes`)
    const gp2 = allVols.filter((v: { volume_type: string }) => v.volume_type === "gp2")
    console.log(`GP2 volumes (candidates for upgrade): ${gp2.length}`)
    gp2.slice(0, 3).forEach((v: { volume_id: string; volume_type: string; size_gib: number }) =>
      console.log(`  - ${v.volume_id}: ${v.volume_type} (${v.size_gib}GB)`)
    )
  }

  // Check Lambda functions for unused
  const { data: lambdas, error: lamErr } = await supabase
    .from("lambda_functions")
    .select("name, invocations_7d, memory_mb, timeout_seconds, avg_duration_ms_7d")
    .limit(20)
  console.log("\n=== LAMBDA FUNCTIONS ===")
  if (lamErr) {
    console.log("Error:", lamErr.message)
  } else {
    const allLambdas = lambdas || []
    console.log(`Found ${allLambdas.length} Lambda functions`)
    const unused = allLambdas.filter((l: { invocations_7d: number | null }) =>
      !l.invocations_7d || l.invocations_7d === 0
    )
    console.log(`Unused (0 invocations): ${unused.length}`)
    unused.slice(0, 3).forEach((l: { name: string; invocations_7d: number | null }) =>
      console.log(`  - ${l.name}: ${l.invocations_7d || 0} invocations`)
    )
    const overTimeout = allLambdas.filter((l: { avg_duration_ms_7d: number | null; timeout_seconds: number | null }) => {
      if (!l.avg_duration_ms_7d || l.avg_duration_ms_7d === 0) return false
      const timeout = l.timeout_seconds || 30
      return timeout > (l.avg_duration_ms_7d / 1000) * 3 && timeout >= 10
    })
    console.log(`Over-configured timeout: ${overTimeout.length}`)
    overTimeout.slice(0, 3).forEach((l: { name: string; timeout_seconds: number | null; avg_duration_ms_7d: number | null }) =>
      console.log(`  - ${l.name}: timeout=${l.timeout_seconds}s, avg=${((l.avg_duration_ms_7d || 0) / 1000).toFixed(1)}s`)
    )
  }

  // Check snapshots for orphaned
  const { data: snapshots, error: snapErr } = await supabase
    .from("snapshots")
    .select("snapshot_id, source_volume_id, size_gib")
    .limit(20)
  const { data: volIds } = await supabase.from("volumes").select("volume_id").neq("state", "deleted")
  const existingVolIds = new Set((volIds || []).map((v: { volume_id: string }) => v.volume_id))
  console.log("\n=== SNAPSHOTS ===")
  if (snapErr) {
    console.log("Error:", snapErr.message)
  } else {
    const allSnapshots = snapshots || []
    console.log(`Found ${allSnapshots.length} snapshots`)
    const orphaned = allSnapshots.filter((s: { source_volume_id: string | null }) =>
      s.source_volume_id && !existingVolIds.has(s.source_volume_id)
    )
    console.log(`Orphaned (source volume deleted): ${orphaned.length}`)
    orphaned.slice(0, 3).forEach((s: { snapshot_id: string; source_volume_id: string | null }) =>
      console.log(`  - ${s.snapshot_id}: source=${s.source_volume_id}`)
    )
  }

  // Check ASGs for static
  const { data: asgs, error: asgErr } = await supabase
    .from("autoscaling_groups")
    .select("name, min_size, max_size, desired_capacity")
    .limit(20)
  console.log("\n=== AUTO SCALING GROUPS ===")
  if (asgErr) {
    console.log("Error:", asgErr.message)
  } else {
    const allAsgs = asgs || []
    console.log(`Found ${allAsgs.length} ASGs`)
    const staticAsgs = allAsgs.filter((a: { min_size: number; max_size: number; desired_capacity: number }) =>
      a.min_size === a.max_size && a.max_size === a.desired_capacity && a.desired_capacity > 1
    )
    console.log(`Static (min=max=desired>1): ${staticAsgs.length}`)
    staticAsgs.slice(0, 3).forEach((a: { name: string; min_size: number; max_size: number; desired_capacity: number }) =>
      console.log(`  - ${a.name}: min=${a.min_size} max=${a.max_size} desired=${a.desired_capacity}`)
    )
  }

  // Check RDS for multi_az column existence
  console.log("\n=== RDS INSTANCES (Phase 2 column check) ===")
  const { data: rds, error: rdsErr } = await supabase
    .from("rds_instances")
    .select("db_instance_id, instance_class, env, multi_az")
    .limit(5)
  if (rdsErr) {
    console.log("Error:", rdsErr.message)
    if (rdsErr.message.includes("multi_az")) {
      console.log("⚠️  Column 'multi_az' does not exist - MIGRATION NEEDED!")
    }
  } else {
    const allRds = rds || []
    console.log(`Found ${allRds.length} RDS instances`)
    if (allRds.length > 0) {
      console.log("✓ multi_az column exists")
      const nonProdMultiAz = allRds.filter((r: { multi_az: boolean; env: string | null }) =>
        r.multi_az === true && ["dev", "staging", "test", "preview"].some(e => (r.env || "").toLowerCase().includes(e))
      )
      console.log(`Non-prod with Multi-AZ: ${nonProdMultiAz.length}`)
    }
  }

  // Check Load Balancers for target_count column
  console.log("\n=== LOAD BALANCERS (Phase 2 column check) ===")
  const { data: lbs, error: lbErr } = await supabase
    .from("load_balancers")
    .select("name, type, target_count, healthy_target_count")
    .limit(5)
  if (lbErr) {
    console.log("Error:", lbErr.message)
    if (lbErr.message.includes("target_count")) {
      console.log("⚠️  Column 'target_count' does not exist - MIGRATION NEEDED!")
    }
  } else {
    const allLbs = lbs || []
    console.log(`Found ${allLbs.length} Load Balancers`)
    if (allLbs.length > 0) {
      console.log("✓ target_count column exists")
      const empty = allLbs.filter((lb: { target_count: number | null }) => lb.target_count === 0)
      console.log(`Empty (0 targets): ${empty.length}`)
    }
  }

  // Check S3 for versioning_enabled column
  console.log("\n=== S3 BUCKETS (Phase 2 column check) ===")
  const { data: s3, error: s3Err } = await supabase
    .from("s3_buckets")
    .select("name, versioning_enabled, lifecycle_rules")
    .limit(5)
  if (s3Err) {
    console.log("Error:", s3Err.message)
    if (s3Err.message.includes("versioning_enabled")) {
      console.log("⚠️  Column 'versioning_enabled' does not exist - MIGRATION NEEDED!")
    }
  } else {
    const allS3 = s3 || []
    console.log(`Found ${allS3.length} S3 buckets`)
    if (allS3.length > 0) {
      console.log("✓ versioning_enabled column exists")
      const versionedNoExpiration = allS3.filter((b: { versioning_enabled: boolean; lifecycle_rules: unknown[] | null }) => {
        if (!b.versioning_enabled) return false
        const rules = b.lifecycle_rules || []
        return !rules.some((r: unknown) => {
          const rule = r as Record<string, unknown>
          return rule.noncurrent_version_expiration || rule.NoncurrentVersionExpiration
        })
      })
      console.log(`Versioned without expiration: ${versionedNoExpiration.length}`)
    }
  }

  console.log("\n" + "=".repeat(50))
  console.log("SUMMARY: Phase 1 scenarios work with existing columns.")
  console.log("Phase 2 scenarios require migration if columns are missing.")
  console.log("=".repeat(50))
}

checkData().catch(console.error)
