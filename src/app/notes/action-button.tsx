"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { apiFetch } from "@/lib/client-api";

type Props = {
  /** POST-эндпоинт своего API. */
  endpoint: string;
  label: string;
  /** Куда перейти после успеха; по умолчанию — обновить текущую страницу. */
  redirectTo?: string;
  confirmText?: string;
};

export function ActionButton({ endpoint, label, redirectTo, confirmText }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    if (confirmText && !confirm(confirmText)) return;
    startTransition(async () => {
      setError(null);
      try {
        await apiFetch(endpoint, { method: "POST" });
        if (redirectTo) router.push(redirectTo);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-50"
      >
        {label}
      </button>
      {error && (
        <span role="alert" className="text-sm text-red-600">
          {error}
        </span>
      )}
    </span>
  );
}
