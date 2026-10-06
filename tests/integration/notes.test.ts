import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  createNote,
  deleteNote,
  getNote,
  listNotes,
  listTags,
  listTrash,
  listVersions,
  purgeTrash,
  restoreNote,
  restoreVersion,
  updateNote,
} from "@/db/queries/notes";
import { notes, noteVersions } from "@/db/schema";
import { runPurgeTrash } from "@/jobs/purge-trash";
import { NotFoundError } from "@/lib/errors";
import { makeUser, testDb, truncateAll } from "./helpers";

const { db, close } = testDb();
let alice: string;
let bob: string;

beforeEach(async () => {
  await truncateAll(db);
  alice = await makeUser(db, "alice@example.test");
  bob = await makeUser(db, "bob@example.test");
});
afterAll(() => close());

describe("создание", () => {
  it("без заголовка берёт его из первой строки и пишет первую версию", async () => {
    const note = await createNote(db, alice, { content: "Позвонить юристу\nнасчёт аренды" });
    expect(note.title).toBe("Позвонить юристу");
    const versions = await listVersions(db, alice, note.id);
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({ title: "Позвонить юристу", changedBy: "user" });
  });

  it("сохраняет переданный заголовок и нормализует теги", async () => {
    const note = await createNote(db, alice, {
      title: "Ремонт",
      content: "",
      tags: ["#Дом", "дом"],
    });
    expect(note).toMatchObject({ title: "Ремонт", tags: ["дом"], pinned: false });
  });

  it("записывает автора версии", async () => {
    const note = await createNote(db, alice, { content: "x" }, "assistant");
    expect((await listVersions(db, alice, note.id))[0].changedBy).toBe("assistant");
  });
});

describe("полнотекстовый поиск", () => {
  it("находит «договор» по запросу «договоры» (русская морфология)", async () => {
    const note = await createNote(db, alice, { content: "Подписать договор аренды" });
    await createNote(db, alice, { content: "Купить молоко" });
    const found = await listNotes(db, alice, { q: "договоры" });
    expect(found.map((n) => n.id)).toEqual([note.id]);
  });

  it("ищет и по заголовку, совпадение в заголовке выше", async () => {
    const inContent = await createNote(db, alice, {
      title: "Разное",
      content: "поставщики плитки",
    });
    const inTitle = await createNote(db, alice, { title: "Поставщики", content: "список" });
    const found = await listNotes(db, alice, { q: "поставщик" });
    expect(found.map((n) => n.id)).toEqual([inTitle.id, inContent.id]);
  });

  it("не находит чужие и удалённые заметки", async () => {
    await createNote(db, bob, { content: "договор Боба" });
    const deleted = await createNote(db, alice, { content: "старый договор" });
    await deleteNote(db, alice, deleted.id);
    expect(await listNotes(db, alice, { q: "договор" })).toEqual([]);
  });

  it("укладывается в 1 секунду на 10 000 заметок", async () => {
    await db.execute(sql`
      INSERT INTO notes (user_id, title, content)
      SELECT ${alice}, 'Заметка ' || i, 'обычный текст номер ' || i || ' про разное'
      FROM generate_series(1, 10000) AS i`);
    await createNote(db, alice, { content: "Договор с поставщиком" });
    await db.execute(sql`ANALYZE notes`);

    const started = performance.now();
    const found = await listNotes(db, alice, { q: "договоры" });
    expect(performance.now() - started).toBeLessThan(1000);
    expect(found).toHaveLength(1);
  });
});

describe("список", () => {
  it("закреплённые сверху, затем по дате изменения", async () => {
    const a = await createNote(db, alice, { content: "a" });
    const b = await createNote(db, alice, { content: "b" });
    const c = await createNote(db, alice, { content: "c" });
    await updateNote(db, alice, a.id, { pinned: true });
    await updateNote(db, alice, b.id, { content: "b2" });
    expect((await listNotes(db, alice)).map((n) => n.id)).toEqual([a.id, b.id, c.id]);
  });

  it("фильтрует по тегу и считает теги", async () => {
    const work = await createNote(db, alice, { content: "w", tags: ["работа", "срочно"] });
    await createNote(db, alice, { content: "h", tags: ["дом"] });
    await createNote(db, alice, { content: "w2", tags: ["работа"] });
    await createNote(db, bob, { content: "чужое", tags: ["работа"] });

    const found = await listNotes(db, alice, { tag: "Срочно" });
    expect(found.map((n) => n.id)).toEqual([work.id]);
    expect(await listTags(db, alice)).toEqual([
      { tag: "работа", count: 2 },
      { tag: "дом", count: 1 },
      { tag: "срочно", count: 1 },
    ]);
  });
});

describe("изменение и версии", () => {
  it("новая версия — только при изменении заголовка или текста", async () => {
    const note = await createNote(db, alice, { content: "v1" });
    await updateNote(db, alice, note.id, { tags: ["x"], pinned: true });
    expect(await listVersions(db, alice, note.id)).toHaveLength(1);

    await updateNote(db, alice, note.id, { content: "v2" }, "assistant");
    await updateNote(db, alice, note.id, { title: "Новый" });
    const versions = await listVersions(db, alice, note.id);
    expect(versions.map((v) => [v.title, v.content, v.changedBy])).toEqual([
      ["Новый", "v2", "user"],
      ["v1", "v2", "assistant"],
      ["v1", "v1", "user"],
    ]);
  });

  it("откат к версии возвращает текст и сам становится версией", async () => {
    const note = await createNote(db, alice, { title: "T", content: "исходный" });
    await updateNote(db, alice, note.id, { content: "испорчено ассистентом" }, "assistant");
    const [, first] = await listVersions(db, alice, note.id);

    const restored = await restoreVersion(db, alice, note.id, first.id);
    expect(restored.content).toBe("исходный");
    expect(await listVersions(db, alice, note.id)).toHaveLength(3);
  });

  it("версия другой заметки не подходит для отката", async () => {
    const a = await createNote(db, alice, { content: "a" });
    const b = await createNote(db, alice, { content: "b" });
    const [vb] = await listVersions(db, alice, b.id);
    await expect(restoreVersion(db, alice, a.id, vb.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("корзина", () => {
  it("удаление прячет заметку, восстановление возвращает", async () => {
    const note = await createNote(db, alice, { content: "x" });
    await deleteNote(db, alice, note.id);

    await expect(getNote(db, alice, note.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await listNotes(db, alice)).toEqual([]);
    expect((await listTrash(db, alice)).map((n) => n.id)).toEqual([note.id]);

    await restoreNote(db, alice, note.id);
    expect((await getNote(db, alice, note.id)).deletedAt).toBeNull();
    expect(await listTrash(db, alice)).toEqual([]);
  });

  it("в корзине нельзя менять, повторно удалять и смотреть историю", async () => {
    const note = await createNote(db, alice, { content: "x" });
    await deleteNote(db, alice, note.id);
    await expect(updateNote(db, alice, note.id, { content: "y" })).rejects.toThrow(NotFoundError);
    await expect(deleteNote(db, alice, note.id)).rejects.toThrow(NotFoundError);
    await expect(listVersions(db, alice, note.id)).rejects.toThrow(NotFoundError);
  });

  it("восстановить можно только заметку из корзины", async () => {
    const note = await createNote(db, alice, { content: "x" });
    await expect(restoreNote(db, alice, note.id)).rejects.toThrow(NotFoundError);
  });

  it("очистка удаляет только пролежавшие больше 30 дней, вместе с версиями", async () => {
    const now = new Date("2026-10-06T12:00:00Z");
    const old = await createNote(db, alice, { content: "old" });
    const fresh = await createNote(db, bob, { content: "fresh" });
    const active = await createNote(db, alice, { content: "active" });
    await db
      .update(notes)
      .set({ deletedAt: new Date("2026-09-05T11:00:00Z") })
      .where(eq(notes.id, old.id));
    await db
      .update(notes)
      .set({ deletedAt: new Date("2026-09-07T12:00:00Z") })
      .where(eq(notes.id, fresh.id));

    expect(await runPurgeTrash(db, now)).toBe(1);

    const left = await db.select({ id: notes.id }).from(notes);
    expect(left.map((n) => n.id).sort()).toEqual([fresh.id, active.id].sort());
    expect(await db.select().from(noteVersions).where(eq(noteVersions.noteId, old.id))).toEqual([]);
    // Повторный запуск ничего не удаляет.
    expect(await runPurgeTrash(db, now)).toBe(0);
    // purgeTrash удаляет всё, что попало в корзину раньше порога.
    expect(await purgeTrash(db, now)).toBe(1);
  });
});

describe("изоляция пользователей", () => {
  it("Боб не может прочитать, изменить, удалить или откатить заметку Алисы", async () => {
    const note = await createNote(db, alice, { content: "секрет Алисы" });
    const [version] = await listVersions(db, alice, note.id);

    await expect(getNote(db, bob, note.id)).rejects.toThrow(NotFoundError);
    await expect(updateNote(db, bob, note.id, { content: "взлом" })).rejects.toThrow(NotFoundError);
    await expect(deleteNote(db, bob, note.id)).rejects.toThrow(NotFoundError);
    await expect(listVersions(db, bob, note.id)).rejects.toThrow(NotFoundError);
    await expect(restoreVersion(db, bob, note.id, version.id)).rejects.toThrow(NotFoundError);
    expect(await listNotes(db, bob)).toEqual([]);

    const still = await getNote(db, alice, note.id);
    expect(still.content).toBe("секрет Алисы");
  });

  it("Боб не может восстановить заметку Алисы из корзины и не видит её корзину", async () => {
    const note = await createNote(db, alice, { content: "x" });
    await deleteNote(db, alice, note.id);
    await expect(restoreNote(db, bob, note.id)).rejects.toThrow(NotFoundError);
    expect(await listTrash(db, bob)).toEqual([]);
  });
});
