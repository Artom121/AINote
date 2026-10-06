import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth/current-user";
import { NoteEditor } from "../note-editor";

export default async function NewNotePage() {
  await requireUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader active="/notes" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6">
        <Link href="/notes" className="text-sm hover:underline">
          ← Все заметки
        </Link>
        <h1 className="text-xl font-semibold">Новая заметка</h1>
        <NoteEditor />
      </main>
    </div>
  );
}
