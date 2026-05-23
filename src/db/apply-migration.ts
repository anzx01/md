import postgres from "postgres";
import fs from "fs";
import path from "path";

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) {
      continue;
    }

    process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
}

loadLocalEnv();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Set DIRECT_URL or DATABASE_URL before running the migration.");
}

const sql = postgres(connectionString, { max: 1 });

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
