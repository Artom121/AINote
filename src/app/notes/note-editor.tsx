"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Note } from "@/db/schema";
import { apiFetch } from "@/lib/client-api";
import { Markdown } from "@/components/markdown";

type Props = { note?: Pick<Note, "id" | "title" | "content" | "tags" | "pinned"> };

const parseTags = (s: string) =>
  s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

export function NoteEditor({ note }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [tags, setTags] = useState(note?.tags.join(", ") ?? "");
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      setStatus(null);
      try {
        await fn();
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Ошибка");
      }
    });

  const save = () =>
    run(async () => {
      if (!note) {
        const { note: created } = await apiFetch<{ note: Note }>("/api/notes", {
          method: "POST",
          body: { title: title.trim() || undefined, content, tags: parseTags(tags) },
        });
        router.push(`/notes/${created.id}`);
        return;
      }
      const { note: saved } = await apiFetch<{ note: Note }>(`/api/notes/${note.id}`, {
        method: "PATCH",
        body: { title: title.trim() || note.title, content, tags: parseTags(tags) },
      });
      setTitle(saved.title);
      setTags(saved.tags.join(", "));
      setStatus("Сохранено");
      router.refresh();
    });

  const togglePin = () =>
    run(async () => {
      await apiFetch(`/api/notes/${note!.id}`, { method: "PATCH", body: { pinned: !pinned } });
      setPinned(!pinned);
    });

  const remove = () => {
    if (!confirm("Переместить заметку в корзину? Её можно будет восстановить в течение 30 дней."))
      return;
    run(async () => {
      await apiFetch(`/api/notes/${note!.id}`, { method: "DELETE" });
      router.push("/notes");
      router.refresh();
    });
  };

  const tabClass = (t: typeof tab) =>
    `px-3 py-1.5 text-sm ${tab === t ? "border-b-2 border-foreground font-medium" : "text-muted"}`;

  return (
    <div className="space-y-4">
      <label className="block space-y-1">
        <span className="text-xs text-muted">Заголовок</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={note ? undefined : "Если не задан — возьмётся из первой строки"}
          maxLength={200}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-medium"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted">Теги через запятую</span>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="работа, дом"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </label>

      <div>
        <div role="tablist" className="flex border-b border-border">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "edit"}
            onClick={() => setTab("edit")}
            className={tabClass("edit")}
          >
            Текст
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "preview"}
            onClick={() => setTab("preview")}
            className={tabClass("preview")}
          >
            Просмотр
          </button>
        </div>
        {tab === "edit" ? (
          <textarea
            aria-label="Текст заметки"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            placeholder="Текст в Markdown"
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          />
        ) : (
          <div className="mt-2 min-h-40 rounded-lg border border-border px-4 py-3">
            {content.trim() ? (
              <Markdown>{content}</Markdown>
            ) : (
              <p className="text-sm text-muted">Пусто</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          {note ? "Сохранить" : "Создать"}
        </button>
        {note && (
          <>
            <button
              type="button"
              onClick={togglePin}
              disabled={pending}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface"
            >
              {pinned ? "Открепить" : "Закрепить"}
            </button>
            <Link
              href={`/notes/${note.id}/history`}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface"
            >
              История
            </Link>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="ml-auto rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            >
              Удалить
            </button>
          </>
        )}
        {status && (
          <span role="status" className="text-sm text-muted">
            {status}
          </span>
        )}
      </div>
    </div>
  );
}
