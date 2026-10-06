import { describe, expect, it } from "vitest";
import { isValidTimezone } from "@/lib/timezone";

describe("isValidTimezone", () => {
  it.each(["Europe/Moscow", "Asia/Yekaterinburg", "UTC"])("принимает %s", (tz) => {
    expect(isValidTimezone(tz)).toBe(true);
  });

  it.each(["", "Mars/Olympus", "Europe/Moscow; DROP TABLE", 42, null, "a".repeat(100)])(
    "отклоняет %s",
    (tz) => {
      expect(isValidTimezone(tz)).toBe(false);
    },
  );
});
