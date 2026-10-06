import { describe, expect, it } from "vitest";
import { stripTokens } from "@/lib/auth/adapter";
import { isDevLoginEnabled } from "@/lib/auth/sessions";

describe("isDevLoginEnabled", () => {
  it("включён только в development", () => {
    expect(isDevLoginEnabled("development")).toBe(true);
    expect(isDevLoginEnabled("production")).toBe(false);
    expect(isDevLoginEnabled("test")).toBe(false);
    expect(isDevLoginEnabled(undefined)).toBe(false);
  });
});

describe("stripTokens", () => {
  it("убирает токены, сохраняя привязку аккаунта", () => {
    const result = stripTokens({
      userId: "u1",
      type: "oauth",
      provider: "yandex",
      providerAccountId: "123",
      access_token: "a",
      refresh_token: "r",
      id_token: "i",
      expires_at: 1,
      token_type: "bearer",
      scope: "login:info",
    });
    expect(result).toMatchObject({ userId: "u1", provider: "yandex", providerAccountId: "123" });
    expect(result.access_token).toBeUndefined();
    expect(result.refresh_token).toBeUndefined();
    expect(result.id_token).toBeUndefined();
  });
});
