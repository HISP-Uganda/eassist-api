import { Client } from "pg";
import dotenv from "dotenv";
import url from "url";

dotenv.config();

function parseDbUrl(dburl) {
  const u = new url.URL(dburl);
  const user = decodeURIComponent(u.username || "postgres");
  const password = decodeURIComponent(u.password || "");
  const host = u.hostname || "localhost";
  const port = parseInt(u.port || "5432", 10);
  const database = u.pathname.replace(/^\//, "") || "eassist";
  return { user, password, host, port, database };
}

async function ensureDatabase() {
  const dburl =
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/eassist";
  const cfg = parseDbUrl(dburl);

  // Connect to maintenance DB 'postgres' (or template1) to create target DB if missing
  const adminClient = new Client({
    user: cfg.user,
    password: cfg.password,
    host: cfg.host,
    port: cfg.port,
    database: "postgres",
  });
  await adminClient.connect();
  try {
    const exists = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname=$1",
      [cfg.database]
    );
    if (exists.rowCount === 0) {
      console.log(`Creating database ${cfg.database} ...`);
      // Use identifier quoting safely
      await adminClient.query(`CREATE DATABASE "${cfg.database}"`);
      console.log("Database created.");
    } else {
      console.log(`Database ${cfg.database} already exists.`);
    }
  } finally {
    await adminClient.end();
  }
}

ensureDatabase().catch((err) => {
  console.error("db:create failed:", err.message);
  process.exit(1);
});
