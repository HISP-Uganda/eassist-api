import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import dotenv from "dotenv";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from the project root (scripts/ is one level down)
const envPath = path.resolve(__dirname, '..', '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });
const dir = path.resolve(__dirname, "migrations");

function migrationSort(a, b){
  // Force base messages schema before its dependents if same date prefix
  const weight = (f) => {
    if (/messages_schema/i.test(f)) return 10; // highest priority (run earliest)
    if (/message_providers/i.test(f)) return 5; // after schema
    if (/message_attachments/i.test(f)) return 4; // after schema (attachments need messages)
    if (/otp_settings/i.test(f)) return 3; // after providers (may validate providers)
    return 0;
  };
  const wa = weight(a);
  const wb = weight(b);
  if (wa !== wb) return wb - wa < 0 ? -1 : 1; // higher weight first
  // Fallback to lexical
  return a.localeCompare(b);
}

async function main() {
  // Diagnostic: log DATABASE_URL and its type to debug connection issues
  console.log("DATABASE_URL (raw):", process.env.DATABASE_URL);
  console.log("DATABASE_URL type:", typeof process.env.DATABASE_URL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations(version text primary key, applied_at timestamptz default now())`
    );
    const { rows } = await client.query(
      "SELECT version FROM schema_migrations"
    );
    const applied = new Set(rows.map((r) => r.version));
    const files = fs.existsSync(dir)
      ? fs
          .readdirSync(dir)
          .filter((f) => f.endsWith(".sql"))
          .sort(migrationSort)
      : [];
    console.log('Planned migration order:', files.join(', '));
    for (const f of files) {
      const version = f;
      if (applied.has(version)) {
        console.log("Skipping already applied:", version);
        continue;
      }
      const sql = fs.readFileSync(path.join(dir, f), "utf8");
      console.log("Applying migration:", version);
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(version) VALUES($1)", [
        version,
      ]);
      console.log("Applied:", version);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}
main();
