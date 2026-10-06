import { and, arrayContains, desc, eq, isNotNull, isNull, lt, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { notes, noteVersions, type ChangedBy, type Note, type NoteVersion } from "@/db/schema";
import { NotFoundError } from "@/lib/errors";
import {
  createNoteInput,
  deriveTitle,
  listNotesInput,
  updateNoteInput,
  type CreateNoteInput,
  type ListNotesInput,
  type UpdateNoteInput,
} from "@/lib/notes";

// Время ставится часами БД (now()), как и в DEFAULT колонок, чтобы порядок был согласован.
// Все функции принимают userId из сессии и фильтруют по нему каждый запрос
// (ТЗ, раздел 10). Чужая заметка неотличима от несуществующей: NotFoundError.

const noteColumns = {
  id: notes.id,
  userId: notes.userId,
  title: notes.title,
  content: notes.content,
  tags: notes.tags,
  pinned: notes.pinned,
  createdAt: notes.createdAt,
  updatedAt: notes.updatedAt,
  deletedAt: notes.deletedAt,
};

export type NoteListItem = Pick<Note, "id" | "title" | "tags" | "pinned" | "updatedAt"> & {
  excerpt: string;
};

const listColumns = {
  id: notes.id,
  title: notes.title,
  tags: notes.tags,
  pinned: notes.pinned,
  updatedAt: notes.updatedAt,
  excerpt: sql<string>`left(${notes.content}, 200)`,
};

const own = (userId: string, id: string) => and(eq(notes.id, id), eq(notes.userId, userId));

export async function createNote(
  db: Db,
  userId: string,
  input: CreateNoteInput,
  changedBy: ChangedBy = "user",
): Promise<Note> {
  const data = createNoteInput.parse(input);
  const title = data.title || deriveTitle(data.content);
  return db.transaction(async (tx) => {
    const [note] = await tx
      .insert(notes)
      .values({ userId, title, content: data.content, tags: data.tags })
      .returning(noteColumns);
    await tx
      .insert(noteVersions)
      .values({ noteId: note.id, title, content: data.content, changedBy });
    return note;
  });
}

/** Активная заметка (не в корзине). */
export async function getNote(db: Db, userId: string, id: string): Promise<Note> {
  const [note] = await db
    .select(noteColumns)
    .from(notes)
    .where(and(own(userId, id), isNull(notes.deletedAt)));
  if (!note) throw new NotFoundError("Заметка");
  return note;
}

export async function listNotes(
  db: Db,
  userId: string,
  input: ListNotesInput = {},
): Promise<NoteListItem[]> {
  const { q, tag, limit, offset } = listNotesInput.parse(input);
  const query = q ? sql`websearch_to_tsquery('russian', ${q})` : undefined;
  const where = and(
    eq(notes.userId, userId),
    isNull(notes.deletedAt),
    tag ? arrayContains(notes.tags, [tag.toLowerCase()]) : undefined,
    query ? sql`${notes.searchVector} @@ ${query}` : undefined,
  );
  const order = query
    ? [desc(sql`ts_rank(${notes.searchVector}, ${query})`), desc(notes.updatedAt)]
    : [desc(notes.pinned), desc(notes.updatedAt)];
  return db
    .select(listColumns)
    .from(notes)
    .where(where)
    .orderBy(...order)
    .limit(limit)
    .offset(offset);
}

/** Все теги пользователя с числом активных заметок. */
export async function listTags(db: Db, userId: string): Promise<{ tag: string; count: number }[]> {
  const rows = await db.execute<{ tag: string; count: number }>(sql`
    SELECT tag, count(*)::int AS count
    FROM ${notes}, unnest(${notes.tags}) AS tag
    WHERE ${notes.userId} = ${userId} AND ${notes.deletedAt} IS NULL
    GROUP BY tag ORDER BY count DESC, tag`);
  return [...rows];
}

/**
 * Изменение заметки. Новая версия создаётся, только если поменялись заголовок
 * или текст: теги и закрепление в историю не попадают.
 */
export async function updateNote(
  db: Db,
  userId: string,
  id: string,
  input: UpdateNoteInput,
  changedBy: ChangedBy = "user",
): Promise<Note> {
  const patch = updateNoteInput.parse(input);
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select(noteColumns)
      .from(notes)
      .where(and(own(userId, id), isNull(notes.deletedAt)))
      .for("update");
    if (!current) throw new NotFoundError("Заметка");

    const [note] = await tx
      .update(notes)
      .set({ ...patch, updatedAt: sql`now()` })
      .where(own(userId, id))
      .returning(noteColumns);

    if (note.title !== current.title || note.content !== current.content) {
      await tx
        .insert(noteVersions)
        .values({ noteId: id, title: note.title, content: note.content, changedBy });
    }
    return note;
  });
}

/** Мягкое удаление: в корзину на 30 дней. */
export async function deleteNote(db: Db, userId: string, id: string): Promise<void> {
  const rows = await db
    .update(notes)
    .set({ deletedAt: sql`now()` })
    .where(and(own(userId, id), isNull(notes.deletedAt)))
    .returning({ id: notes.id });
  if (rows.length === 0) throw new NotFoundError("Заметка");
}

export async function restoreNote(db: Db, userId: string, id: string): Promise<Note> {
  const [note] = await db
    .update(notes)
    .set({ deletedAt: null, updatedAt: sql`now()` })
    .where(and(own(userId, id), isNotNull(notes.deletedAt)))
    .returning(noteColumns);
  if (!note) throw new NotFoundError("Заметка в корзине");
  return note;
}

export async function listTrash(
  db: Db,
  userId: string,
): Promise<(NoteListItem & { deletedAt: Date })[]> {
  const rows = await db
    .select({ ...listColumns, deletedAt: notes.deletedAt })
    .from(notes)
    .where(and(eq(notes.userId, userId), isNotNull(notes.deletedAt)))
    .orderBy(desc(notes.deletedAt));
  return rows as (NoteListItem & { deletedAt: Date })[];
}

export async function listVersions(db: Db, userId: string, noteId: string): Promise<NoteVersion[]> {
  await getNote(db, userId, noteId);
  return db
    .select()
    .from(noteVersions)
    .where(eq(noteVersions.noteId, noteId))
    .orderBy(desc(noteVersions.createdAt));
}

/** Откат к версии: её заголовок и текст становятся текущими, это тоже новая версия. */
export async function restoreVersion(
  db: Db,
  userId: string,
  noteId: string,
  versionId: string,
): Promise<Note> {
  await getNote(db, userId, noteId);
  const [version] = await db
    .select()
    .from(noteVersions)
    .where(and(eq(noteVersions.id, versionId), eq(noteVersions.noteId, noteId)));
  if (!version) throw new NotFoundError("Версия");
  return updateNote(db, userId, noteId, { title: version.title, content: version.content });
}

/** Окончательно удаляет заметки, пролежавшие в корзине дольше срока. Для фоновой задачи. */
export async function purgeTrash(db: Db, olderThan: Date): Promise<number> {
  const rows = await db
    .delete(notes)
    .where(and(isNotNull(notes.deletedAt), lt(notes.deletedAt, olderThan)))
    .returning({ id: notes.id });
  return rows.length;
}
