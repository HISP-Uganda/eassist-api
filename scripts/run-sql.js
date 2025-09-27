import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] || "db/init.sql";
const sql = fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("Executed:", file);
  } catch (e) {
    console.error("ERROR running SQL file:", file);
    console.error("Message:", e.message);
    if (e.position) {
      const pos = parseInt(e.position, 10);
      const start = Math.max(0, pos - 120);
      const end = Math.min(sql.length, pos + 120);
      const context = sql.slice(start, end);
      console.error("At position:", pos);
      console.error(
        "Context around error (±120 chars):\n---\n" + context + "\n---"
      );
    }
    if (e.detail) console.error("Detail:", e.detail);
    if (e.hint) console.error("Hint:", e.hint);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
