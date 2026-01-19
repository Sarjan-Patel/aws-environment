const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const supabaseUrl = "https://vqcvrwkdvxzgucqcfcoq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxY3Zyd2tkdnh6Z3VjcWNmY29xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODUzOTAxNiwiZXhwIjoyMDg0MTE1MDE2fQ.rsQUVY_wiS3TRcXhNDTCRYruBNs99oifWkGbviVm-_g";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableExists(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select("*", { count: "exact", head: true });
  return !error || error.code !== "42P01";
}

async function runMigration() {
  console.log("Checking if organizations table exists...");

  // Check if organizations table already exists
  const orgsExist = await checkTableExists("organizations");

  if (orgsExist) {
    console.log("Organizations table already exists!");

    // Check if org_id column exists on cloud_accounts
    const { data: accounts, error: accError } = await supabase
      .from("cloud_accounts")
      .select("org_id")
      .limit(1);

    if (accError && accError.message.includes("org_id")) {
      console.log("org_id column doesn't exist yet, need to run migrations");
    } else {
      console.log("org_id column exists on cloud_accounts");

      // Check organizations count
      const { count } = await supabase
        .from("organizations")
        .select("*", { count: "exact", head: true });
      console.log(`Organizations count: ${count}`);

      // Check if data is backfilled
      const { data: accs } = await supabase
        .from("cloud_accounts")
        .select("id, name, org_id")
        .limit(5);
      console.log("\nSample cloud_accounts:", JSON.stringify(accs, null, 2));
      return;
    }
  } else {
    console.log("Organizations table does not exist, migrations needed");
  }

  console.log("\nPlease run migrations manually in Supabase SQL Editor:");
  console.log("1. Go to: https://supabase.com/dashboard/project/vqcvrwkdvxzgucqcfcoq/sql");
  console.log("2. Run each migration file in order:");
  console.log("   - 20260119000001_create_organizations.sql");
  console.log("   - 20260119000002_add_org_id_to_accounts.sql");
  console.log("   - 20260119000003_add_org_id_to_resources.sql");
  console.log("   - 20260119000004_backfill_org_id.sql");
}

runMigration().catch(console.error);
