import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Таблицы users / accounts / sessions / verification_tokens повторяют схему,
// которую ожидает @auth/drizzle-adapter. Свои поля добавляем только в users.

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date", withTimezone: true }),
  image: text("image"),
  // IANA-зона, например "Europe/Moscow". null — ещё не определена браузером.
  timezone: text("timezone"),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
});

// Привязки входа через OAuth. Токены провайдера здесь не храним
// (см. src/lib/auth/adapter.ts): для входа они не нужны.
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("accounts_user_id_idx").on(t.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

const createdAt = () =>
  timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow();

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    // Не null — заметка в корзине (ТЗ, раздел 5).
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
    // Полнотекстовый индекс с русской морфологией; заголовок весит больше текста.
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('russian', coalesce(title, '')), 'A') || setweight(to_tsvector('russian', coalesce(content, '')), 'B')`,
    ),
  },
  (t) => [
    index("notes_user_updated_idx").on(t.userId, t.deletedAt, t.updatedAt.desc()),
    index("notes_search_idx").using("gin", t.searchVector),
    index("notes_tags_idx").using("gin", t.tags),
  ],
);

export const noteChangedBy = pgEnum("note_changed_by", ["user", "assistant"]);

// Снимок заголовка и текста после каждого изменения (включая создание).
export const noteVersions = pgTable(
  "note_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    changedBy: noteChangedBy("changed_by").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("note_versions_note_idx").on(t.noteId, t.createdAt.desc())],
);

export type User = typeof users.$inferSelect;
export type Note = Omit<typeof notes.$inferSelect, "searchVector">;
export type NoteVersion = typeof noteVersions.$inferSelect;
export type ChangedBy = (typeof noteChangedBy.enumValues)[number];
