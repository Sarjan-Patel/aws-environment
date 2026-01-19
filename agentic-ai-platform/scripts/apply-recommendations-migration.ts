/**
 * Script to apply the recommendations table migration
 * Run with: npx tsx scripts/apply-recommendations-migration.ts
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

const migrationSQL = `
-- Create recommendations table for Mode 3 (Approval-Based) workflow
-- Stores optimization recommendations that require human approval

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Detection reference
  detection_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  scenario_name TEXT NOT NULL,

  -- Resource information
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  account_id TEXT,
  region TEXT,
  env TEXT,

  -- Recommendation details
  action TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  ai_explanation TEXT,

  -- Impact assessment
  impact_level TEXT CHECK (impact_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100) DEFAULT 80,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')) DEFAULT 'medium',

  -- Cost data
  current_monthly_cost NUMERIC(12,2),
  potential_savings NUMERIC(12,2),

  -- Additional context
  details JSONB DEFAULT '{}',

  -- Status workflow
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'snoozed', 'scheduled', 'executed', 'expired')) DEFAULT 'pending',

  -- Snooze/Schedule fields
  snoozed_until TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,

  -- User feedback
  rejection_reason TEXT,
  user_notes TEXT,

  -- Execution tracking
  executed_at TIMESTAMPTZ,
  execution_result JSONB,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'system',
  actioned_by TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_resource ON recommendations(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_scenario ON recommendations(scenario_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_created ON recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_snoozed ON recommendations(snoozed_until) WHERE status = 'snoozed';
CREATE INDEX IF NOT EXISTS idx_recommendations_scheduled ON recommendations(scheduled_for) WHERE status = 'scheduled';
`

async function applyMigration() {
  console.log("Applying recommendations table migration...")
  console.log(`Supabase URL: ${supabaseUrl}`)

  try {
    // Check if table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from("recommendations")
      .select("id")
      .limit(1)

    if (!checkError) {
      console.log("✅ Recommendations table already exists!")
      return
    }

    if (checkError.code !== "42P01") {
      // 42P01 = table doesn't exist
      console.log("Table check result:", checkError.message)
    }

    // Table doesn't exist, need to create it
    // Since we can't run raw SQL through the JS client, we'll use the REST API
    console.log("\n⚠️  The recommendations table doesn't exist yet.")
    console.log("\nPlease run the following SQL in the Supabase SQL Editor:")
    console.log("https://supabase.com/dashboard/project/_/sql\n")
    console.log("--- COPY FROM HERE ---\n")
    console.log(migrationSQL)
    console.log("\n--- END COPY ---\n")
    console.log("After running the SQL, the approvals feature will work.")

  } catch (error) {
    console.error("Error:", error)
  }
}

applyMigration()
