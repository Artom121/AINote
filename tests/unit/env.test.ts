import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const base = {
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  AUTH_SECRET: "x".repeat(32),
};

describe("parseEnv", () => {
  it("принимает минимальный набор для разработки", () => {
    const env = parseEnv({ ...base, NODE_ENV: "development" });
    expect(env.NODE_ENV).toBe("development");
  });

  it("требует DATABASE_URL", () => {
    expect(() => parseEnv({ AUTH_SECRET: base.AUTH_SECRET })).toThrow(/DATABASE_URL/);
  });

  it("требует достаточно длинный AUTH_SECRET", () => {
    expect(() => parseEnv({ ...base, AUTH_SECRET: "short" })).toThrow(/AUTH_SECRET/);
  });

  it("в production требует ключи Яндекс ID", () => {
    expect(() => parseEnv({ ...base, NODE_ENV: "production" })).toThrow(/AUTH_YANDEX_ID/);
    expect(
      parseEnv({ ...base, NODE_ENV: "production", AUTH_YANDEX_ID: "id", AUTH_YANDEX_SECRET: "s" })
        .NODE_ENV,
    ).toBe("production");
  });
});
