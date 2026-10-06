import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { getDb } from "@/db";
import { listNotes, listTags } from "@/db/queries/notes";
import { requireUser } from "@/lib/auth/current-user";
import { formatDateTime } from "@/lib/format";
import { plainText } from "@/lib/notes";

export default async function NotesPage({ searchParams }: PageProps<"/notes">) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const tag = typeof sp.tag === "string" ? sp.tag : "";

  const db = getDb();
  const [notes, tags] = await Promise.all([
    listNotes(db, user.id, { q: q || undefined, tag: tag || undefined }),
    listTags(db, user.id),
  ]);

  const tagHref = (t: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (t) p.set("tag", t);
    const s = p.toString();
    return s ? `/notes?${s}` : "/notes";
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader active="/notes" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Заметки</h1>
          <div className="flex gap-2 text-sm">
            <Link href="/notes/trash" className="rounded-lg px-3 py-2 hover:bg-surface">
              Корзина
            </Link>
            <Link
              href="/notes/new"
              className="rounded-lg bg-foreground px-3 py-2 text-background hover:opacity-90"
            >
              Новая заметка
            </Link>
          </div>
        </div>

        <form action="/notes" role="search" className="flex gap-2">
          {tag && <input type="hidden" name="tag" value={tag} />}
          <label htmlFor="q" className="sr-only">
            Поиск по заметкам
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Поиск по заметкам"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface">
            Найти
          </button>
        </form>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 text-sm" aria-label="Теги">
            <Link
              href={tagHref("")}
              className={`rounded-full border px-3 py-1 ${!tag ? "border-foreground" : "border-border hover:bg-surface"}`}
            >
              Все
            </Link>
            {tags.map((t) => (
              <Link
                key={t.tag}
                href={tagHref(t.tag)}
                aria-current={t.tag === tag ? "true" : undefined}
                className={`rounded-full border px-3 py-1 ${t.tag === tag ? "border-foreground" : "border-border hover:bg-surface"}`}
              >
                #{t.tag} <span className="text-muted">{t.count}</span>
              </Link>
            ))}
          </div>
        )}

        {notes.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">
            {q || tag ? "Ничего не найдено." : "Заметок пока нет."}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {notes.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/notes/${n.id}`}
                  className="block space-y-1 px-4 py-3 hover:bg-surface"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">
                      {n.pinned && (
                        <span title="Закреплена" aria-label="Закреплена">
                          📌{" "}
                        </span>
                      )}
                      {n.title}
                    </span>
                    <time className="shrink-0 text-xs text-muted">
                      {formatDateTime(n.updatedAt, user.timezone)}
                    </time>
                  </div>
                  {n.excerpt && (
                    <p className="line-clamp-2 text-sm text-muted">{plainText(n.excerpt)}</p>
                  )}
                  {n.tags.length > 0 && (
                    <p className="text-xs text-muted">{n.tags.map((t) => `#${t}`).join(" ")}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
