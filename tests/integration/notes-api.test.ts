import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createNote, deleteNote, listVersions } from "@/db/queries/notes";
import { makeUser, testDb, truncateAll } from "./helpers";

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => authMock);

vi.stubEnv("DATABASE_URL", process.env.TEST_DATABASE_URL!);
vi.stubEnv("AUTH_SECRET", "x".repeat(32));

const notesRoute = await import("@/app/api/notes/route");
const noteRoute = await import("@/app/api/notes/[id]/route");
const restoreRoute = await import("@/app/api/notes/[id]/restore/route");
const versionsRoute = await import("@/app/api/notes/[id]/versions/route");
const versionRestoreRoute = await import("@/app/api/notes/[id]/versions/[versionId]/restore/route");
const trashRoute = await import("@/app/api/notes/trash/route");
const tagsRoute = await import("@/app/api/tags/route");

const { db, close } = testDb();
const BASE = "http://localhost:3000";
let alice: string;
let bob: string;

function as(userId: string | null) {
  authMock.auth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

function req(method: string, path: string, body?: unknown, origin: string | null = BASE) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (origin) headers.origin = origin;
  return new NextRequest(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

const params = <T extends object>(p: T) => ({ params: Promise.resolve(p) });

beforeEach(async () => {
  await truncateAll(db);
  alice = await makeUser(db, "alice@example.test");
  bob = await makeUser(db, "bob@example.test");
  as(alice);
});
afterAll(() => close());

describe("API заметок: основной сценарий", () => {
  it("создать → найти → изменить → история → откат → удалить → восстановить", async () => {
    let res = await notesRoute.POST(req("POST", "/api/notes", { content: "Договор аренды" }));
    expect(res.status).toBe(201);
    const { note } = await res.json();
    expect(note.title).toBe("Договор аренды");

    res = await notesRoute.GET(req("GET", "/api/notes?q=договоры"));
    expect((await res.json()).notes.map((n: { id: string }) => n.id)).toEqual([note.id]);

    res = await noteRoute.PATCH(
      req("PATCH", `/api/notes/${note.id}`, { content: "Изменено", tags: ["дом"] }),
      params({ id: note.id }),
    );
    expect((await res.json()).note.content).toBe("Изменено");

    res = await versionsRoute.GET(req("GET", ""), params({ id: note.id }));
    const { versions } = await res.json();
    expect(versions).toHaveLength(2);

    res = await versionRestoreRoute.POST(
      req("POST", ""),
      params({ id: note.id, versionId: versions[1].id }),
    );
    expect((await res.json()).note.content).toBe("Договор аренды");

    res = await tagsRoute.GET(req("GET", "/api/tags"));
    expect((await res.json()).tags).toEqual([{ tag: "дом", count: 1 }]);

    res = await noteRoute.DELETE(req("DELETE", ""), params({ id: note.id }));
    expect(res.status).toBe(204);
    res = await noteRoute.GET(req("GET", ""), params({ id: note.id }));
    expect(res.status).toBe(404);

    res = await trashRoute.GET(req("GET", "/api/notes/trash"));
    expect((await res.json()).notes).toHaveLength(1);

    res = await restoreRoute.POST(req("POST", ""), params({ id: note.id }));
    expect(res.status).toBe(200);
    res = await noteRoute.GET(req("GET", ""), params({ id: note.id }));
    expect((await res.json()).note.content).toBe("Договор аренды");
  });
});

describe("API заметок: изоляция пользователей", () => {
  it("Боб получает 404 на любые операции с заметкой Алисы", async () => {
    const note = await createNote(db, alice, { content: "секрет" });
    const [version] = await listVersions(db, alice, note.id);
    as(bob);
    const p = params({ id: note.id });

    expect((await noteRoute.GET(req("GET", ""), p)).status).toBe(404);
    expect((await noteRoute.PATCH(req("PATCH", "", { content: "взлом" }), p)).status).toBe(404);
    expect((await noteRoute.DELETE(req("DELETE", ""), p)).status).toBe(404);
    expect((await versionsRoute.GET(req("GET", ""), p)).status).toBe(404);
    expect(
      (
        await versionRestoreRoute.POST(
          req("POST", ""),
          params({ id: note.id, versionId: version.id }),
        )
      ).status,
    ).toBe(404);
    expect((await (await notesRoute.GET(req("GET", "/api/notes"))).json()).notes).toEqual([]);

    await deleteNote(db, alice, note.id);
    expect((await restoreRoute.POST(req("POST", ""), p)).status).toBe(404);
    expect((await (await trashRoute.GET(req("GET", ""))).json()).notes).toEqual([]);

    as(alice);
    expect((await restoreRoute.POST(req("POST", ""), p)).status).toBe(200);
    const res = await noteRoute.GET(req("GET", ""), p);
    expect((await res.json()).note.content).toBe("секрет");
  });

  it("user_id в теле запроса игнорируется", async () => {
    const res = await notesRoute.POST(req("POST", "/api/notes", { content: "x", userId: bob }));
    const { note } = await res.json();
    expect(note.userId).toBe(alice);
  });
});

describe("API заметок: ошибки и защита", () => {
  it("без сессии — 401", async () => {
    as(null);
    expect((await notesRoute.GET(req("GET", "/api/notes"))).status).toBe(401);
    expect((await notesRoute.POST(req("POST", "/api/notes", { content: "x" }))).status).toBe(401);
  });

  it("изменяющий запрос с чужого origin или без origin — 403", async () => {
    const evil = req("POST", "/api/notes", { content: "x" }, "https://evil.example");
    expect((await notesRoute.POST(evil)).status).toBe(403);
    const none = req("POST", "/api/notes", { content: "x" }, null);
    expect((await notesRoute.POST(none)).status).toBe(403);
  });

  it("некорректный id — 404, некорректные данные и JSON — 400", async () => {
    expect((await noteRoute.GET(req("GET", ""), params({ id: "not-a-uuid" }))).status).toBe(404);

    const note = await createNote(db, alice, { content: "x" });
    const p = params({ id: note.id });
    const empty = await noteRoute.PATCH(req("PATCH", "", {}), p);
    expect(empty.status).toBe(400);
    expect((await empty.json()).error).toMatch(/Нет полей/);
    expect((await noteRoute.PATCH(req("PATCH", "", "{oops"), p)).status).toBe(400);
  });
});
