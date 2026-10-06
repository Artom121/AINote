import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { users, type User } from "@/db/schema";

/**
 * Текущий пользователь из сессии или редирект на /login.
 * user_id для любых запросов к данным берётся только отсюда (ТЗ, раздел 10).
 */
export async function requireUser(): Promise<User> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  const [user] = await getDb().select().from(users).where(eq(users.id, id));
  if (!user) redirect("/login");
  return user;
}
