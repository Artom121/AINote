import NextAuth from "next-auth";
import Yandex from "next-auth/providers/yandex";
import { getDb } from "@/db";
import { createAdapter } from "@/lib/auth/adapter";
import { SESSION_MAX_AGE_SEC, SESSION_UPDATE_AGE_SEC } from "@/lib/auth/sessions";
import { env } from "@/lib/env";

// Ленивая конфигурация: переменные окружения и БД читаются при первом запросе,
// а не во время сборки.
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const e = env();
  return {
    adapter: createAdapter(getDb()),
    // Сессии хранятся в БД — так их можно отозвать («выйти на всех устройствах»).
    session: {
      strategy: "database",
      maxAge: SESSION_MAX_AGE_SEC,
      updateAge: SESSION_UPDATE_AGE_SEC,
    },
    providers: [Yandex({ clientId: e.AUTH_YANDEX_ID, clientSecret: e.AUTH_YANDEX_SECRET })],
    pages: { signIn: "/login" },
    callbacks: {
      session({ session, user }) {
        session.user.id = user.id;
        return session;
      },
    },
  };
});
