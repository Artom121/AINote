import { notFound } from "next/navigation";
import { z } from "zod";
import { NotFoundError } from "@/lib/errors";

/** Загрузка для страницы: чужой, удалённый или некорректный id — это 404. */
export async function loadOrNotFound<T>(id: string, load: () => Promise<T>): Promise<T> {
  if (!z.uuid().safeParse(id).success) notFound();
  try {
    return await load();
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
}
