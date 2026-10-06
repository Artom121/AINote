import { sql } from "drizzle-orm";
import { createDb } from "@/db";
import { users } from "@/db/schema";

export function testDb() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL не задан");
  return createDb(url);
}

export async function truncateAll(db: ReturnType<typeof testDb>["db"]) {
  await db.execute(
    sql`TRUNCATE users, accounts, sessions, verification_tokens, notes, note_versions RESTART IDENTITY CASCADE`,
  );
}

/** Пользователь для тестов; возвращает его id. */
export async function makeUser(db: ReturnType<typeof testDb>["db"], email: string) {
  const [u] = await db.insert(users).values({ email }).returning({ id: users.id });
  return u.id;
}
