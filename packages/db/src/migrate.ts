import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";

const dbUrl =
  process.env.DATABASE_URL ||
  "file:/home/aftababu/Documents/projects/my_next/NimStudio/packages/db/database.sqlite";
const client = createClient({ url: dbUrl });

async function runMigrations() {
  console.log("Running migrations...");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at INTEGER
    )
  `);

  const migrationsDir = path.join(process.cwd(), "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const rs = await client.execute({
      sql: `SELECT id FROM __drizzle_migrations WHERE hash = ?`,
      args: [file],
    });

    if (rs.rows.length === 0) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      await client.executeMultiple(sql);
      await client.execute({
        sql: `INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, unixepoch())`,
        args: [file],
      });
      console.log(`Applied ${file}`);
    } else {
      console.log(`Skipped ${file}`);
    }
  }

  console.log("Migrations complete.");
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error("Migration failed", err);
  process.exit(1);
});
