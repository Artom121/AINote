import Link from "next/link";
import { signOutAction, signOutEverywhere } from "@/app/actions";
import { requireUser } from "@/lib/auth/current-user";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto w-full max-w-xl space-y-8 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Настройки</h1>
        <Link href="/" className="text-sm hover:underline">
          ← К чату
        </Link>
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Профиль</h2>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">Имя</dt>
          <dd>{user.name ?? "—"}</dd>
          <dt className="text-muted">Email</dt>
          <dd>{user.email ?? "—"}</dd>
          <dt className="text-muted">Часовой пояс</dt>
          <dd>{user.timezone ?? "не определён"}</dd>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Сессии</h2>
        <div className="flex flex-wrap gap-2">
          <form action={signOutAction}>
            <button className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface">
              Выйти
            </button>
          </form>
          <form action={signOutEverywhere}>
            <button className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
              Выйти на всех устройствах
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
