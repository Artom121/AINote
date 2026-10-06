import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signInWithYandex } from "@/app/actions";
import { isDevLoginEnabled } from "@/lib/auth/sessions";
import { env, isYandexConfigured } from "@/lib/env";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/");
  const yandexReady = isYandexConfigured(env());

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Ассистент</h1>
          <p className="text-sm text-muted">Заметки и календарь на естественном языке</p>
        </div>

        <form action={signInWithYandex} className="space-y-2">
          <button
            type="submit"
            disabled={!yandexReady}
            className="w-full rounded-lg bg-[#ffcc00] px-4 py-3 font-medium text-black hover:bg-[#f5c400] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Войти с Яндекс ID
          </button>
          {!yandexReady && (
            <p className="text-center text-xs text-muted">
              Вход через Яндекс ID не настроен: задайте AUTH_YANDEX_ID и AUTH_YANDEX_SECRET
            </p>
          )}
        </form>

        {isDevLoginEnabled() && (
          <form
            action="/api/dev/login"
            method="post"
            className="space-y-2 rounded-lg border border-dashed border-border p-4"
          >
            <label htmlFor="dev-email" className="block text-xs font-medium text-muted">
              Dev-вход (только NODE_ENV=development)
            </label>
            <input
              id="dev-email"
              name="email"
              type="email"
              required
              defaultValue="dev@example.test"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-md border border-border px-3 py-2 text-sm hover:bg-surface"
            >
              Войти как dev-пользователь
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
