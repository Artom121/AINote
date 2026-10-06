import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth/current-user";
import { TimezoneInit } from "./timezone-init";

export default async function ChatPage() {
  const user = await requireUser();

  return (
    <div className="flex h-dvh flex-col">
      {!user.timezone && <TimezoneInit />}
      <AppHeader active="/" />

      <main className="flex flex-1 flex-col overflow-hidden">
        <section
          aria-label="Сообщения"
          className="flex flex-1 items-center justify-center overflow-y-auto px-4 text-center text-sm text-muted"
        >
          Здесь появится диалог с ассистентом.
        </section>

        <form className="flex gap-2 border-t border-border p-3">
          <label htmlFor="message" className="sr-only">
            Сообщение
          </label>
          <input
            id="message"
            name="message"
            disabled
            placeholder="Ассистент пока не подключён"
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
          />
          <button
            type="submit"
            disabled
            className="rounded-lg bg-foreground px-4 py-2 text-sm text-background disabled:opacity-40"
          >
            Отправить
          </button>
        </form>
      </main>
    </div>
  );
}
