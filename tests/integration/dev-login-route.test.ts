import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { testDb, truncateAll } from "./helpers";

const { db, close } = testDb();

function loginRequest(email: string, origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/dev/login", {
    method: "POST",
    headers: { origin, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email }),
  });
}

async function loadRoute() {
  vi.resetModules();
  return import("@/app/api/dev/login/route");
}

beforeEach(async () => {
  await truncateAll(db);
  vi.stubEnv("DATABASE_URL", process.env.TEST_DATABASE_URL!);
  vi.stubEnv("AUTH_SECRET", "x".repeat(32));
});
afterEach(() => vi.unstubAllEnvs());
afterAll(() => close());

describe("POST /api/dev/login", () => {
  it("в development создаёт сессию и ставит httpOnly-куку", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { POST } = await loadRoute();
    const res = await POST(loginRequest("dev@example.test"));

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^authjs\.session-token=[0-9a-f]{64};/);
    expect(cookie.toLowerCase()).toContain("httponly");
  });

  it("в production отвечает 404", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { POST } = await loadRoute();
    const res = await POST(loginRequest("dev@example.test"));
    expect(res.status).toBe(404);
  });

  it("в test отвечает 404", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { POST } = await loadRoute();
    expect((await POST(loginRequest("dev@example.test"))).status).toBe(404);
  });

  it("отклоняет запрос с чужого origin", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { POST } = await loadRoute();
    const res = await POST(loginRequest("dev@example.test", "https://evil.example"));
    expect(res.status).toBe(403);
  });

  it("отклоняет некорректный email", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { POST } = await loadRoute();
    expect((await POST(loginRequest("not-an-email"))).status).toBe(400);
  });
});
