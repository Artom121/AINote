import { z } from "zod";

export const TITLE_MAX = 200;
export const DERIVED_TITLE_MAX = 60;
export const CONTENT_MAX = 100_000;
export const TAG_MAX = 50;
export const TAGS_MAX = 20;
export const TRASH_RETENTION_DAYS = 30;

/** Строка без разметки Markdown: заголовков, маркеров списков, цитат, выделения. */
function stripLine(line: string): string {
  return line
    .replace(/^\s*(#{1,6}\s+|[-*+]\s+(\[[ xX]\]\s+)?|>\s*|\d+[.)]\s+)/, "")
    .replace(/[*_`~]/g, "")
    .trim();
}

/** Текст заметки без разметки, строки через пробел — для превью в списке. */
export function plainText(content: string): string {
  return content.split("\n").map(stripLine).filter(Boolean).join(" ");
}

/**
 * Заголовок из первой непустой строки текста, до 60 символов.
 * На Этапе 2 для заметок от ассистента заголовок будет генерировать LLM.
 */
export function deriveTitle(content: string): string {
  const line = content
    .split("\n")
    .map(stripLine)
    .find((l) => l.length > 0);
  if (!line) return "Без названия";
  const chars = [...line];
  return chars.length <= DERIVED_TITLE_MAX
    ? line
    : chars
        .slice(0, DERIVED_TITLE_MAX - 1)
        .join("")
        .trimEnd() + "…";
}

/** Теги: без # и лишних пробелов, в нижнем регистре, без повторов. */
export function normalizeTags(tags: string[]): string[] {
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/^#+/, "").replace(/\s+/g, " ").toLowerCase();
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

const tags = z
  .array(z.string().max(TAG_MAX, `Тег длиннее ${TAG_MAX} символов`))
  .transform(normalizeTags)
  .pipe(z.array(z.string()).max(TAGS_MAX, `Не больше ${TAGS_MAX} тегов`));

const title = z.string().trim().max(TITLE_MAX, `Заголовок длиннее ${TITLE_MAX} символов`);
const content = z.string().max(CONTENT_MAX, "Заметка слишком длинная");

export const createNoteInput = z.object({
  title: title.optional(),
  content: content.default(""),
  tags: tags.default([]),
});

export const updateNoteInput = z
  .object({
    title: title.min(1, "Заголовок не может быть пустым"),
    content,
    tags,
    pinned: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Нет полей для изменения");

export const listNotesInput = z.object({
  q: z.string().trim().max(200).optional(),
  tag: z.string().trim().max(TAG_MAX).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateNoteInput = z.input<typeof createNoteInput>;
export type UpdateNoteInput = z.input<typeof updateNoteInput>;
export type ListNotesInput = z.input<typeof listNotesInput>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Сколько полных дней осталось до окончательного удаления из корзины. */
export function trashDaysLeft(deletedAt: Date, now: Date = new Date()): number {
  const left = TRASH_RETENTION_DAYS - (now.getTime() - deletedAt.getTime()) / DAY_MS;
  return Math.max(0, Math.ceil(left));
}
