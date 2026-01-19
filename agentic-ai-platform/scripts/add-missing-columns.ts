/**
 * Script to add missing columns to Supabase tables
 * Run with: npx tsx scripts/add-missing-columns.ts
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function addMissingColumns() {
  console.log("Connecting to Supabase...")
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log("\n1. Adding retention_in_days to log_groups table...")
  const { error: logGroupsError } = await supabase.rpc("exec_sql", {
    sql: "ALTER TABLE log_groups ADD COLUMN IF NOT EXISTS retention_in_days INTEGER DEFAULT NULL;"
  })

  if (logGroupsError) {
    console.log("   Note: RPC method not available, trying direct query approach...")

    // Try to update a record to check if column exists
    const { error: testError } = await supabase
      .from("log_groups")
      .update({ retention_in_days: null })
      .eq("id", "00000000-0000-0000-0000-000000000000") // Non-existent ID

    if (testError?.message?.includes("column")) {
      console.log("   ❌ Column doesn't exist. Please run this SQL in Supabase Dashboard:")
      console.log("   ALTER TABLE log_groups ADD COLUMN retention_in_days INTEGER DEFAULT NULL;")
    } else {
      console.log("   ✅ Column already exists or was added")
    }
  } else {
    console.log("   ✅ retention_in_days column added to log_groups")
  }

  console.log("\n2. Adding lifecycle_rules to s3_buckets table...")
  const { error: s3Error } = await supabase.rpc("exec_sql", {
    sql: "ALTER TABLE s3_buckets ADD COLUMN IF NOT EXISTS lifecycle_rules JSONB DEFAULT NULL;"
  })

  if (s3Error) {
    // Try to update a record to check if column exists
    const { error: testError } = await supabase
      .from("s3_buckets")
      .update({ lifecycle_rules: null })
      .eq("id", "00000000-0000-0000-0000-000000000000") // Non-existent ID

    if (testError?.message?.includes("column")) {
      console.log("   ❌ Column doesn't exist. Please run this SQL in Supabase Dashboard:")
      console.log("   ALTER TABLE s3_buckets ADD COLUMN lifecycle_rules JSONB DEFAULT NULL;")
    } else {
      console.log("   ✅ Column already exists or was added")
    }
  } else {
    console.log("   ✅ lifecycle_rules column added to s3_buckets")
  }

  console.log("\nDone! If columns need to be added manually, go to:")
  console.log("Supabase Dashboard → SQL Editor → Run the ALTER TABLE statements")
}

addMissingColumns().catch(console.error)
