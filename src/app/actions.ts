"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth/current-user";
import { revokeAllSessions } from "@/lib/auth/sessions";
import { isValidTimezone } from "@/lib/timezone";

export async function signInWithYandex() {
  await signIn("yandex", { redirectTo: "/" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function signOutEverywhere() {
  const user = await requireUser();
  await revokeAllSessions(getDb(), user.id);
  redirect("/login");
}

/** Часовой пояс из браузера — только если у пользователя он ещё не задан. */
export async function initTimezone(tz: string) {
  const user = await requireUser();
  if (user.timezone || !isValidTimezone(tz)) return;
  await getDb().update(users).set({ timezone: tz }).where(eq(users.id, user.id));
}
