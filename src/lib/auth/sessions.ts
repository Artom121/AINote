import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { sessions, users } from "@/db/schema";

// Срок жизни сессии и порог продления — те же, что в конфиге Auth.js.
export const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;
export const SESSION_UPDATE_AGE_SEC = 24 * 60 * 60;

// Имя куки сессии Auth.js при работе по http (только dev).
// По https Auth.js добавляет префикс __Secure-.
export const DEV_SESSION_COOKIE = "authjs.session-token";

/** «Выйти на всех устройствах»: удаляет все сессии пользователя. */
export async function revokeAllSessions(db: Db, userId: string): Promise<number> {
  const deleted = await db
    .delete(sessions)
    .where(eq(sessions.userId, userId))
    .returning({ token: sessions.sessionToken });
  return deleted.length;
}

export function isDevLoginEnabled(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv === "development";
}

/**
 * Dev-вход без OAuth: находит или создаёт пользователя по email и выпускает
 * сессию в той же таблице, что и Auth.js. Вызывать только если isDevLoginEnabled().
 */
export async function createDevSession(
  db: Db,
  email: string,
  now: Date = new Date(),
): Promise<{ userId: string; sessionToken: string; expires: Date }> {
  const normalized = email.trim().toLowerCase();
  const [user] = await db
    .insert(users)
    .values({ email: normalized, name: normalized.split("@")[0] })
    .onConflictDoUpdate({ target: users.email, set: { email: normalized } })
    .returning({ id: users.id });

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(now.getTime() + SESSION_MAX_AGE_SEC * 1000);
  await db.insert(sessions).values({ sessionToken, userId: user.id, expires });
  return { userId: user.id, sessionToken, expires };
}
