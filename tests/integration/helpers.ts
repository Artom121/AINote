import { sql } from "drizzle-orm";
import { createDb } from "@/db";

export function testDb() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL не задан");
  return createDb(url);
}

export async function truncateAll(db: ReturnType<typeof testDb>["db"]) {
  await db.execute(
    sql`TRUNCATE users, accounts, sessions, verification_tokens RESTART IDENTITY CASCADE`,
  );
}
