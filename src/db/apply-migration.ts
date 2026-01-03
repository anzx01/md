import postgres from "postgres";
import fs from "fs";
import path from "path";

// Use direct URL for migrations (as defined in .env)
const sql = postgres("postgresql://postgres:liuzx5112liuzx551@db.cwwbwksrebyaydjadstt.supabase.co:5432/postgres");

async function applyMigration() {
  try {
    console.log("Applying migration 0006_convert_to_debate_system.sql...");

    const migrationPath = path.join(process.cwd(), "drizzle", "0006_convert_to_debate_system.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    await sql.unsafe(migrationSQL);

    console.log("✅ Migration applied successfully!");
    console.log("   - Dropped old tables: planner_session, discussion_messages, email_capture");
    console.log("   - Created new tables: debate_session, debate_messages");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

applyMigration();
