import { describe, expect, it } from "vitest";
import {
  createNoteInput,
  deriveTitle,
  normalizeTags,
  plainText,
  TAGS_MAX,
  trashDaysLeft,
  updateNoteInput,
} from "@/lib/notes";

describe("deriveTitle", () => {
  it("берёт первую непустую строку", () => {
    expect(deriveTitle("\n\n  Позвонить юристу  \nпро договор")).toBe("Позвонить юристу");
  });

  it("убирает разметку Markdown", () => {
    expect(deriveTitle("## **Ремонт** кухни")).toBe("Ремонт кухни");
    expect(deriveTitle("- [ ] купить плитку")).toBe("купить плитку");
    expect(deriveTitle("1. первый пункт")).toBe("первый пункт");
    expect(deriveTitle("> цитата")).toBe("цитата");
  });

  it("обрезает до 60 символов с многоточием", () => {
    const title = deriveTitle("а".repeat(100));
    expect([...title]).toHaveLength(60);
    expect(title.endsWith("…")).toBe(true);
  });

  it("не режет эмодзи пополам", () => {
    const title = deriveTitle("😀".repeat(70));
    expect([...title].slice(0, -1).every((c) => c === "😀")).toBe(true);
  });

  it("для пустого текста — «Без названия»", () => {
    expect(deriveTitle("")).toBe("Без названия");
    expect(deriveTitle("  \n # \n")).toBe("Без названия");
  });
});

describe("normalizeTags", () => {
  it("чистит, приводит к нижнему регистру и убирает повторы", () => {
    expect(normalizeTags([" #Работа ", "работа", "", "дом  и   сад", "##Дом"])).toEqual([
      "работа",
      "дом и сад",
      "дом",
    ]);
  });
});

describe("валидация", () => {
  it("createNoteInput: значения по умолчанию", () => {
    expect(createNoteInput.parse({})).toEqual({ content: "", tags: [] });
  });

  it("ограничивает число тегов", () => {
    const tags = Array.from({ length: TAGS_MAX + 1 }, (_, i) => `t${i}`);
    expect(() => createNoteInput.parse({ tags })).toThrow(/тегов/);
  });

  it("updateNoteInput: нужен хотя бы один параметр", () => {
    expect(() => updateNoteInput.parse({})).toThrow(/Нет полей/);
  });

  it("updateNoteInput: пустой заголовок запрещён", () => {
    expect(() => updateNoteInput.parse({ title: "  " })).toThrow(/пустым/);
  });

  it("updateNoteInput: неизвестные поля отбрасываются", () => {
    expect(updateNoteInput.parse({ pinned: true, userId: "x" } as never)).toEqual({ pinned: true });
  });
});

describe("trashDaysLeft", () => {
  const deleted = new Date("2026-10-01T12:00:00Z");
  it("считает оставшиеся дни с округлением вверх", () => {
    expect(trashDaysLeft(deleted, deleted)).toBe(30);
    expect(trashDaysLeft(deleted, new Date("2026-10-02T13:00:00Z"))).toBe(29);
    expect(trashDaysLeft(deleted, new Date("2026-10-31T11:00:00Z"))).toBe(1);
  });
  it("не уходит в минус", () => {
    expect(trashDaysLeft(deleted, new Date("2026-12-01T00:00:00Z"))).toBe(0);
  });
});

describe("plainText", () => {
  it("убирает разметку и склеивает строки", () => {
    expect(plainText("## Ремонт\n- [x] плитка\n\n**Андрей**, `тел`")).toBe(
      "Ремонт плитка Андрей, тел",
    );
  });
});
