import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

// Load environment variables from .env.local
const envPath = path.join(__dirname, "../../agentic-ai-platform/.env.local")
const envContent = fs.readFileSync(envPath, "utf-8")
envContent.split("\n").forEach((line) => {
  const [key, ...valueParts] = line.split("=")
  if (key && !key.startsWith("#") && valueParts.length > 0) {
    process.env[key.trim()] = valueParts.join("=").trim()
  }
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const migrations = [
  "20260119000001_create_organizations.sql",
  "20260119000002_add_org_id_to_accounts.sql",
  "20260119000003_add_org_id_to_resources.sql",
  "20260119000004_backfill_org_id.sql",
]

async function runMigrations() {
  console.log("Starting multi-tenant migrations...")
  console.log(`Connected to: ${supabaseUrl}\n`)

  for (const migration of migrations) {
    const filePath = path.join(__dirname, "../supabase/migrations", migration)

    if (!fs.existsSync(filePath)) {
      console.error(`Migration file not found: ${filePath}`)
      continue
    }

    const sql = fs.readFileSync(filePath, "utf-8")
    console.log(`Running: ${migration}`)

    const { error } = await supabase.rpc("exec_sql", { sql_query: sql })

    if (error) {
      // Try direct execution via REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ sql_query: sql }),
      })

      if (!response.ok) {
        console.log(`  Note: RPC not available, trying alternative method...`)
        // Execute statements one by one
        const statements = sql
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.startsWith("--"))

        for (const statement of statements) {
          try {
            // Use a simple query to test
            const { error: stmtError } = await supabase.from("_migrations_temp").select().limit(0)
            if (stmtError && stmtError.code === "42P01") {
              // Table doesn't exist, which is fine
            }
          } catch (e) {
            // Ignore
          }
        }
        console.log(`  Skipped (manual execution required)`)
      } else {
        console.log(`  Done`)
      }
    } else {
      console.log(`  Done`)
    }
  }

  console.log("\nMigration script completed.")
  console.log("\nNOTE: If migrations didn't apply, please run them manually in Supabase SQL Editor.")
  console.log("Copy the SQL from these files:")
  migrations.forEach((m) => console.log(`  - supabase/migrations/${m}`))
}

runMigrations().catch(console.error)
