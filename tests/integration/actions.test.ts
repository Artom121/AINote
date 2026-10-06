import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sessions, users } from "@/db/schema";
import { createDevSession } from "@/lib/auth/sessions";
import { testDb, truncateAll } from "./helpers";

const authMock = vi.hoisted(() => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/auth", () => authMock);
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.stubEnv("DATABASE_URL", process.env.TEST_DATABASE_URL!);
vi.stubEnv("AUTH_SECRET", "x".repeat(32));

const { initTimezone, signInWithYandex, signOutAction, signOutEverywhere } =
  await import("@/app/actions");
const { requireUser } = await import("@/lib/auth/current-user");

const { db, close } = testDb();

function loginAs(userId: string | null) {
  authMock.auth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

beforeEach(async () => {
  await truncateAll(db);
  vi.clearAllMocks();
});
afterAll(() => close());

describe("requireUser", () => {
  it("без сессии редиректит на /login", async () => {
    loginAs(null);
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("если пользователь удалён — редиректит на /login", async () => {
    loginAs(crypto.randomUUID());
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("возвращает пользователя из сессии", async () => {
    const { userId } = await createDevSession(db, "me@example.test");
    loginAs(userId);
    expect((await requireUser()).email).toBe("me@example.test");
  });
});

describe("signOutEverywhere", () => {
  it("удаляет все сессии текущего пользователя и только их", async () => {
    const me = await createDevSession(db, "me@example.test");
    await createDevSession(db, "me@example.test");
    const other = await createDevSession(db, "other@example.test");
    loginAs(me.userId);

    await expect(signOutEverywhere()).rejects.toThrow("REDIRECT:/login");

    expect(await db.select().from(sessions).where(eq(sessions.userId, me.userId))).toHaveLength(0);
    expect(await db.select().from(sessions).where(eq(sessions.userId, other.userId))).toHaveLength(
      1,
    );
  });
});

describe("initTimezone", () => {
  async function timezoneOf(userId: string) {
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    return u.timezone;
  }

  it("сохраняет корректный пояс, если он ещё не задан", async () => {
    const { userId } = await createDevSession(db, "me@example.test");
    loginAs(userId);
    await initTimezone("Asia/Novosibirsk");
    expect(await timezoneOf(userId)).toBe("Asia/Novosibirsk");
  });

  it("не перезаписывает уже заданный пояс", async () => {
    const { userId } = await createDevSession(db, "me@example.test");
    await db.update(users).set({ timezone: "Europe/Moscow" }).where(eq(users.id, userId));
    loginAs(userId);
    await initTimezone("Asia/Novosibirsk");
    expect(await timezoneOf(userId)).toBe("Europe/Moscow");
  });

  it("игнорирует некорректный пояс", async () => {
    const { userId } = await createDevSession(db, "me@example.test");
    loginAs(userId);
    await initTimezone("Mars/Olympus");
    expect(await timezoneOf(userId)).toBeNull();
  });
});

describe("вход и выход", () => {
  it("вход через Яндекс ID", async () => {
    await signInWithYandex();
    expect(authMock.signIn).toHaveBeenCalledWith("yandex", { redirectTo: "/" });
  });

  it("выход с текущего устройства", async () => {
    await signOutAction();
    expect(authMock.signOut).toHaveBeenCalledWith({ redirectTo: "/login" });
  });
});
