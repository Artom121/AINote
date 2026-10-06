import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Markdown } from "@/components/markdown";
import { getDb } from "@/db";
import { getNote, listVersions } from "@/db/queries/notes";
import { requireUser } from "@/lib/auth/current-user";
import { formatDateTime } from "@/lib/format";
import { ActionButton } from "../../action-button";
import { loadOrNotFound } from "../../load";

const AUTHOR = { user: "вы", assistant: "ассистент" } as const;

export default async function NoteHistoryPage({ params }: PageProps<"/notes/[id]/history">) {
  const user = await requireUser();
  const { id } = await params;
  const db = getDb();
  const [note, versions] = await loadOrNotFound(id, () =>
    Promise.all([getNote(db, user.id, id), listVersions(db, user.id, id)]),
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader active="/notes" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6">
        <Link href={`/notes/${id}`} className="text-sm hover:underline">
          ← К заметке
        </Link>
        <h1 className="text-xl font-semibold">История: {note.title}</h1>
        <ol className="space-y-3">
          {versions.map((v, i) => (
            <li key={v.id} className="rounded-lg border border-border">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <time className="font-medium">{formatDateTime(v.createdAt, user.timezone)}</time>
                  <span className="text-sm text-muted">изменил(а): {AUTHOR[v.changedBy]}</span>
                  {i === 0 && <span className="text-xs text-muted">текущая версия</span>}
                </summary>
                <div className="space-y-3 border-t border-border px-4 py-3">
                  <p className="font-medium">{v.title}</p>
                  {v.content.trim() ? (
                    <Markdown>{v.content}</Markdown>
                  ) : (
                    <p className="text-sm text-muted">Пусто</p>
                  )}
                  {i > 0 && (
                    <ActionButton
                      endpoint={`/api/notes/${id}/versions/${v.id}/restore`}
                      label="Восстановить эту версию"
                      redirectTo={`/notes/${id}`}
                    />
                  )}
                </div>
              </details>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
