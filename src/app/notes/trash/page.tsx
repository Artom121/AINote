import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { getDb } from "@/db";
import { listTrash } from "@/db/queries/notes";
import { requireUser } from "@/lib/auth/current-user";
import { formatDateTime } from "@/lib/format";
import { TRASH_RETENTION_DAYS, trashDaysLeft } from "@/lib/notes";
import { ActionButton } from "../action-button";

export default async function TrashPage() {
  const user = await requireUser();
  const notes = await listTrash(getDb(), user.id);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader active="/notes" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6">
        <Link href="/notes" className="text-sm hover:underline">
          ← Все заметки
        </Link>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Корзина</h1>
          <p className="text-sm text-muted">
            Заметки удаляются окончательно через {TRASH_RETENTION_DAYS} дней.
          </p>
        </div>
        {notes.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">Корзина пуста.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {notes.map((n) => {
              const daysLeft = trashDaysLeft(n.deletedAt);
              return (
                <li
                  key={n.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{n.title}</p>
                    <p className="text-xs text-muted">
                      Удалена {formatDateTime(n.deletedAt, user.timezone)} · осталось дней:{" "}
                      {daysLeft}
                    </p>
                  </div>
                  <ActionButton endpoint={`/api/notes/${n.id}/restore`} label="Восстановить" />
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
