import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { accounts, sessions, users } from "@/db/schema";
import { runMigrations } from "@/db/migrate";
import { createAdapter } from "@/lib/auth/adapter";
import { createDevSession, revokeAllSessions } from "@/lib/auth/sessions";
import { testDb, truncateAll } from "./helpers";

const { db, close } = testDb();

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("БД", () => {
  it("расширение pgvector установлено", async () => {
    const rows = await db.execute(sql`SELECT extname FROM pg_extension WHERE extname = 'vector'`);
    expect(rows).toHaveLength(1);
  });
});

describe("createDevSession", () => {
  it("создаёт пользователя и сессию", async () => {
    const s = await createDevSession(db, "Dev@Example.test");
    const [user] = await db.select().from(users).where(eq(users.id, s.userId));
    expect(user.email).toBe("dev@example.test");
    const rows = await db.select().from(sessions).where(eq(sessions.userId, s.userId));
    expect(rows).toHaveLength(1);
    expect(s.sessionToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it("повторный вход с тем же email использует того же пользователя", async () => {
    const a = await createDevSession(db, "dev@example.test");
    const b = await createDevSession(db, "dev@example.test");
    expect(b.userId).toBe(a.userId);
    expect(b.sessionToken).not.toBe(a.sessionToken);
  });

  it("сессия читается адаптером Auth.js", async () => {
    const s = await createDevSession(db, "dev@example.test");
    const result = await createAdapter(db).getSessionAndUser!(s.sessionToken);
    expect(result?.user.id).toBe(s.userId);
  });
});

describe("revokeAllSessions", () => {
  it("удаляет все сессии пользователя и не трогает чужие", async () => {
    const a1 = await createDevSession(db, "a@example.test");
    await createDevSession(db, "a@example.test");
    const b = await createDevSession(db, "b@example.test");

    expect(await revokeAllSessions(db, a1.userId)).toBe(2);

    expect(await db.select().from(sessions).where(eq(sessions.userId, a1.userId))).toHaveLength(0);
    expect(await db.select().from(sessions).where(eq(sessions.userId, b.userId))).toHaveLength(1);
  });
});

describe("адаптер Auth.js", () => {
  it("не сохраняет OAuth-токены провайдера", async () => {
    const adapter = createAdapter(db);
    const user = await adapter.createUser!({
      id: crypto.randomUUID(),
      email: "y@example.test",
      emailVerified: null,
    });
    await adapter.linkAccount!({
      userId: user.id,
      type: "oauth",
      provider: "yandex",
      providerAccountId: "123",
      access_token: "secret-access",
      refresh_token: "secret-refresh",
      token_type: "bearer",
    });

    const [row] = await db.select().from(accounts).where(eq(accounts.userId, user.id));
    expect(row.provider).toBe("yandex");
    expect(row.access_token).toBeNull();
    expect(row.refresh_token).toBeNull();
  });

  it("удаление пользователя каскадно удаляет его сессии и аккаунты", async () => {
    const s = await createDevSession(db, "c@example.test");
    await db.delete(users).where(eq(users.id, s.userId));
    expect(await db.select().from(sessions)).toHaveLength(0);
  });
});

describe("runMigrations", () => {
  it("повторный запуск на актуальной схеме ничего не ломает", async () => {
    await runMigrations(process.env.TEST_DATABASE_URL!);
    const rows = await db.execute(sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`);
    expect(rows[0].n).toBeGreaterThanOrEqual(2);
  });
});
