const FALLBACK_TZ = "Europe/Moscow";

export function formatDateTime(date: Date | string, timezone: string | null): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone ?? FALLBACK_TZ,
  }).format(new Date(date));
}
