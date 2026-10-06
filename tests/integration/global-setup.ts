import "dotenv/config";
import postgres from "postgres";
import { runMigrations } from "../../src/db/migrate";

export async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL не задан (см. .env.example)");

  // Чистая схема на каждый прогон.
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await sql.unsafe(
    "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;",
  );
  await sql.end();

  await runMigrations(url);
}
