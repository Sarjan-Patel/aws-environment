/**
 * Script to apply the quick-win optimization columns migration
 * Run with: npx tsx scripts/apply-quick-win-migration.ts
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log("Applying quick-win optimization columns migration...")

  // Check if columns already exist by querying the tables
  const migrations = [
    {
      name: "rds_instances.multi_az",
      sql: `ALTER TABLE rds_instances ADD COLUMN IF NOT EXISTS multi_az BOOLEAN DEFAULT FALSE;`,
    },
    {
      name: "load_balancers.target_count",
      sql: `ALTER TABLE load_balancers ADD COLUMN IF NOT EXISTS target_count INTEGER DEFAULT 0;`,
    },
    {
      name: "load_balancers.healthy_target_count",
      sql: `ALTER TABLE load_balancers ADD COLUMN IF NOT EXISTS healthy_target_count INTEGER DEFAULT 0;`,
    },
    {
      name: "s3_buckets.versioning_enabled",
      sql: `ALTER TABLE s3_buckets ADD COLUMN IF NOT EXISTS versioning_enabled BOOLEAN DEFAULT FALSE;`,
    },
  ]

  for (const migration of migrations) {
    console.log(`  Adding ${migration.name}...`)
    const { error } = await supabase.rpc("exec_sql", { sql: migration.sql })
    if (error) {
      // Check if it's a "column already exists" error which is OK
      if (error.message?.includes("already exists")) {
        console.log(`    ✓ Column already exists`)
      } else {
        console.error(`    ✗ Error: ${error.message}`)
      }
    } else {
      console.log(`    ✓ Added successfully`)
    }
  }

  console.log("\nMigration complete!")
}

applyMigration().catch(console.error)
