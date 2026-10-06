/** fetch к своему API из браузера: JSON туда и обратно, ошибка — с текстом от сервера. */
export async function apiFetch<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? "GET",
    headers: init.body === undefined ? undefined : { "content-type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Ошибка ${res.status}`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}
