import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { getDb } from "@/db";
import { getNote } from "@/db/queries/notes";
import { requireUser } from "@/lib/auth/current-user";
import { formatDateTime } from "@/lib/format";
import { NoteEditor } from "../note-editor";
import { loadOrNotFound } from "../load";

export default async function NotePage({ params }: PageProps<"/notes/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const note = await loadOrNotFound(id, () => getNote(getDb(), user.id, id));

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader active="/notes" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6">
        <div className="flex items-center justify-between text-sm">
          <Link href="/notes" className="hover:underline">
            ← Все заметки
          </Link>
          <span className="text-muted">
            Изменена {formatDateTime(note.updatedAt, user.timezone)}
          </span>
        </div>
        <NoteEditor
          note={{
            id: note.id,
            title: note.title,
            content: note.content,
            tags: note.tags,
            pinned: note.pinned,
          }}
        />
      </main>
    </div>
  );
}
