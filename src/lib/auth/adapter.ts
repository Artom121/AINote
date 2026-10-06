import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { Adapter, AdapterAccount } from "next-auth/adapters";
import type { Db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

// OAuth-токены входа (Яндекс ID) приложению не нужны: профиль читается один раз
// при входе. Чтобы не хранить их открытым текстом (ТЗ, раздел 10), вырезаем их
// перед записью. Токены интеграций (календари) живут отдельно и шифруются.
export function stripTokens(account: AdapterAccount): AdapterAccount {
  return {
    ...account,
    access_token: undefined,
    refresh_token: undefined,
    id_token: undefined,
    expires_at: undefined,
    session_state: undefined,
  };
}

export function createAdapter(db: Db): Adapter {
  const base = DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  });
  return {
    ...base,
    linkAccount: (account) => base.linkAccount!(stripTokens(account)),
  };
}
