import { z } from "zod";

// Все секреты и настройки — только из переменных окружения (ТЗ, раздел 12, п. 5).
// Полный список с описаниями — в .env.example.
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET должен быть не короче 32 символов"),
  AUTH_URL: z.string().url().optional(),
  AUTH_YANDEX_ID: z.string().optional(),
  AUTH_YANDEX_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`Неверные переменные окружения:\n${issues.join("\n")}`);
  }
  const env = result.data;
  if (env.NODE_ENV === "production" && (!env.AUTH_YANDEX_ID || !env.AUTH_YANDEX_SECRET)) {
    throw new Error("В production нужны AUTH_YANDEX_ID и AUTH_YANDEX_SECRET");
  }
  return env;
}

let cached: Env | undefined;

export function env(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
