import type { Db } from "@/db";
import { purgeTrash } from "@/db/queries/notes";
import { TRASH_RETENTION_DAYS } from "@/lib/notes";

export const PURGE_TRASH_QUEUE = "purge-trash";
// Раз в сутки, ночью по Москве.
export const PURGE_TRASH_CRON = "0 3 * * *";

/** Окончательно удаляет заметки, пролежавшие в корзине больше 30 дней. */
export async function runPurgeTrash(db: Db, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  return purgeTrash(db, cutoff);
}
