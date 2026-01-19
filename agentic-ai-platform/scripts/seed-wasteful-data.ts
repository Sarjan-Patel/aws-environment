/**
 * Script to seed wasteful resource data for testing all detection scenarios
 * This updates existing resources to have metrics that match detection criteria.
 *
 * Run with: npx tsx scripts/seed-wasteful-data.ts
 *
 * Detection criteria reference:
 * - RDS Idle: avg_cpu_7d < 5% AND avg_connections_7d < 2
 * - ElastiCache Idle: avg_cpu_7d < 5% AND avg_connections_7d < 5
 * - S3 No Lifecycle: lifecycle_rules IS NULL OR empty
 * - Snapshots Old: created_at < 90 days ago
 * - ASG Over-provisioned: desired_capacity > 1, utilization < 30%
 * - ASG Stale Feature: env or name contains 'feature', > 7 days old, utilization < 20%
 * - Load Balancer Idle: avg_request_count_7d < 1000
 */

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local")
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8")
    for (const line of envContent.split("\n")) {
      const [key, ...valueParts] = line.split("=")
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join("=").trim()
      }
    }
  }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedWastefulData() {
  console.log("╔══════════════════════════════════════════════════════════════╗")
  console.log("║         SEEDING WASTEFUL RESOURCE DATA                       ║")
  console.log("╚══════════════════════════════════════════════════════════════╝")
  console.log(`\nSupabase URL: ${supabaseUrl}\n`)

  let updatedCounts = {
    rds: 0,
    elasticache: 0,
    s3: 0,
    snapshots: 0,
    asg: 0,
    loadBalancers: 0,
  }

  // ═══════════════════════════════════════════════════════════════════
  // 1. IDLE RDS INSTANCES (CPU < 5%, connections < 2)
  // Column names: db_instance_id, state, avg_cpu_7d, current_cpu, avg_connections_7d, current_connections
  // ═══════════════════════════════════════════════════════════════════
  console.log("─── 1. IDLE RDS INSTANCES ───")
  try {
    // Get all RDS instances using select("*")
    const { data: rdsInstances, error: rdsError } = await supabase
      .from("rds_instances")
      .select("*")
      .limit(10)

    if (rdsError) {
      console.log(`   ⚠️  Error fetching RDS: ${rdsError.message}`)
    } else if (rdsInstances && rdsInstances.length > 0) {
      // Update 2-3 instances to be idle
      const toUpdate = rdsInstances.slice(0, Math.min(3, rdsInstances.length))

      for (const instance of toUpdate) {
        const { error: updateError } = await supabase
          .from("rds_instances")
          .update({
            avg_cpu_7d: Math.random() * 3 + 0.5, // 0.5% - 3.5%
            avg_connections_7d: Math.random() < 0.5 ? 0 : 1, // 0 or 1
            current_cpu: Math.random() * 2 + 0.5, // 0.5% - 2.5%
            current_connections: 0,
            state: "available", // Ensure state is available
          })
          .eq("id", instance.id)

        if (!updateError) {
          updatedCounts.rds++
          console.log(`   ✅ Updated ${instance.db_instance_id || instance.id} to idle state`)
        } else {
          console.log(`   ❌ Failed to update ${instance.db_instance_id || instance.id}: ${updateError.message}`)
        }
      }
    } else {
      console.log("   ℹ️  No RDS instances found")
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e}`)
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2. IDLE ELASTICACHE CLUSTERS (CPU < 5%, connections < 5)
  // Column names: cluster_id, avg_cpu_7d, current_cpu, avg_connections_7d, current_connections
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 2. IDLE ELASTICACHE CLUSTERS ───")
  try {
    const { data: cacheClusters, error: cacheError } = await supabase
      .from("cache_clusters")
      .select("*")
      .limit(10)

    if (cacheError) {
      console.log(`   ⚠️  Error fetching ElastiCache: ${cacheError.message}`)
    } else if (cacheClusters && cacheClusters.length > 0) {
      const toUpdate = cacheClusters.slice(0, Math.min(3, cacheClusters.length))

      for (const cluster of toUpdate) {
        const { error: updateError } = await supabase
          .from("cache_clusters")
          .update({
            avg_cpu_7d: Math.random() * 3 + 0.5, // 0.5% - 3.5%
            avg_connections_7d: Math.floor(Math.random() * 3), // 0-2
            current_cpu: Math.random() * 2 + 0.5,
            current_connections: Math.floor(Math.random() * 2),
          })
          .eq("id", cluster.id)

        if (!updateError) {
          updatedCounts.elasticache++
          console.log(`   ✅ Updated ${cluster.cluster_id || cluster.id} to idle state`)
        } else {
          console.log(`   ❌ Failed to update ${cluster.cluster_id || cluster.id}: ${updateError.message}`)
        }
      }
    } else {
      console.log("   ℹ️  No ElastiCache clusters found")
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e}`)
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3. S3 BUCKETS WITHOUT LIFECYCLE POLICIES
  // Column names: lifecycle_rules (JSONB)
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 3. S3 BUCKETS WITHOUT LIFECYCLE ───")
  try {
    const { data: s3Buckets, error: s3Error } = await supabase
      .from("s3_buckets")
      .select("*")
      .limit(10)

    if (s3Error) {
      console.log(`   ⚠️  Error fetching S3: ${s3Error.message}`)
    } else if (s3Buckets && s3Buckets.length > 0) {
      const toUpdate = s3Buckets.slice(0, Math.min(3, s3Buckets.length))

      for (const bucket of toUpdate) {
        const { error: updateError } = await supabase
          .from("s3_buckets")
          .update({
            lifecycle_rules: null,
          })
          .eq("id", bucket.id)

        if (!updateError) {
          updatedCounts.s3++
          console.log(`   ✅ Updated ${bucket.name || bucket.bucket_name || bucket.id} - removed lifecycle policy`)
        } else {
          console.log(`   ❌ Failed to update ${bucket.name || bucket.id}: ${updateError.message}`)
        }
      }
    } else {
      console.log("   ℹ️  No S3 buckets found")
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e}`)
  }

  // ═══════════════════════════════════════════════════════════════════
  // 4. OLD SNAPSHOTS (> 90 days)
  // Column names: snapshot_id, created_at, size_gib
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 4. OLD SNAPSHOTS (> 90 days) ───")
  try {
    const { data: snapshots, error: snapError } = await supabase
      .from("snapshots")
      .select("*")
      .limit(10)

    if (snapError) {
      console.log(`   ⚠️  Error fetching snapshots: ${snapError.message}`)
    } else if (snapshots && snapshots.length > 0) {
      const toUpdate = snapshots.slice(0, Math.min(3, snapshots.length))

      for (const snapshot of toUpdate) {
        // Calculate date 90-150 days ago
        const randomDaysOld = 90 + Math.floor(Math.random() * 60) // 90-150 days old
        const snapshotDate = new Date()
        snapshotDate.setDate(snapshotDate.getDate() - randomDaysOld)

        const { error: updateError } = await supabase
          .from("snapshots")
          .update({
            created_at: snapshotDate.toISOString(),
          })
          .eq("id", snapshot.id)

        if (!updateError) {
          updatedCounts.snapshots++
          console.log(`   ✅ Updated ${snapshot.snapshot_id || snapshot.id} to ${randomDaysOld} days old`)
        } else {
          console.log(`   ❌ Failed to update ${snapshot.snapshot_id || snapshot.id}: ${updateError.message}`)
        }
      }
    } else {
      console.log("   ℹ️  No snapshots found")
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e}`)
  }

  // ═══════════════════════════════════════════════════════════════════
  // 5. WASTEFUL ASGs (over-provisioned or stale feature envs)
  // Column names: name, desired_capacity, current_utilization, min_size, max_size, env, created_at
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 5. WASTEFUL AUTOSCALING GROUPS ───")
  try {
    const { data: asgs, error: asgError } = await supabase
      .from("autoscaling_groups")
      .select("*")
      .limit(10)

    if (asgError) {
      console.log(`   ⚠️  Error fetching ASGs: ${asgError.message}`)
    } else if (asgs && asgs.length > 0) {
      const toUpdate = asgs.slice(0, Math.min(3, asgs.length))

      const envPatterns = ["feature-branch-1", "feature-auth", "feat-checkout"]

      // Calculate date 10+ days ago for stale feature detection
      const staleDate = new Date()
      staleDate.setDate(staleDate.getDate() - 14) // 14 days old

      for (let i = 0; i < toUpdate.length; i++) {
        const asg = toUpdate[i]
        const { error: updateError } = await supabase
          .from("autoscaling_groups")
          .update({
            env: envPatterns[i % envPatterns.length],
            current_utilization: Math.random() * 15 + 3, // 3% - 18%
            desired_capacity: 2 + Math.floor(Math.random() * 3), // 2-4 instances
            min_size: 1, // Set min_size to 1 so desired > min
            created_at: staleDate.toISOString(), // Make it older than 7 days
          })
          .eq("id", asg.id)

        if (!updateError) {
          updatedCounts.asg++
          console.log(`   ✅ Updated ${asg.name || asg.id} to ${envPatterns[i % envPatterns.length]} env with low utilization`)
        } else {
          console.log(`   ❌ Failed to update ${asg.name || asg.id}: ${updateError.message}`)
        }
      }
    } else {
      console.log("   ℹ️  No ASGs found")
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e}`)
  }

  // ═══════════════════════════════════════════════════════════════════
  // 6. IDLE LOAD BALANCERS (low request count)
  // Column names: name, avg_request_count_7d, type, env
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 6. IDLE LOAD BALANCERS ───")
  try {
    const { data: lbs, error: lbError } = await supabase
      .from("load_balancers")
      .select("*")
      .limit(10)

    if (lbError) {
      console.log(`   ⚠️  Error fetching Load Balancers: ${lbError.message}`)
    } else if (lbs && lbs.length > 0) {
      const toUpdate = lbs.slice(0, Math.min(3, lbs.length))

      for (const lb of toUpdate) {
        const { error: updateError } = await supabase
          .from("load_balancers")
          .update({
            avg_request_count_7d: Math.floor(Math.random() * 50), // 0-50 requests (well below 1000 threshold)
          })
          .eq("id", lb.id)

        if (!updateError) {
          updatedCounts.loadBalancers++
          console.log(`   ✅ Updated ${lb.name || lb.id} to low request count`)
        } else {
          console.log(`   ❌ Failed to update ${lb.name || lb.id}: ${updateError.message}`)
        }
      }
    } else {
      console.log("   ℹ️  No Load Balancers found")
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e}`)
  }

  // ═══════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n╔══════════════════════════════════════════════════════════════╗")
  console.log("║                    SEEDING COMPLETE                          ║")
  console.log("╠══════════════════════════════════════════════════════════════╣")
  console.log(`║  RDS Instances:      ${updatedCounts.rds} updated to idle`)
  console.log(`║  ElastiCache:        ${updatedCounts.elasticache} updated to idle`)
  console.log(`║  S3 Buckets:         ${updatedCounts.s3} updated (no lifecycle)`)
  console.log(`║  Snapshots:          ${updatedCounts.snapshots} updated (> 90 days)`)
  console.log(`║  ASGs:               ${updatedCounts.asg} updated (stale feature envs)`)
  console.log(`║  Load Balancers:     ${updatedCounts.loadBalancers} updated to idle`)
  console.log("╚══════════════════════════════════════════════════════════════╝")
  console.log("\nRun 'POST /api/detect-waste' or visit the Approvals page to verify detections!")
}

seedWastefulData().catch(console.error)
