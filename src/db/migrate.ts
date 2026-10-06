import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "./index";

export async function runMigrations(url: string): Promise<void> {
  const { db, close } = createDb(url);
  try {
    await migrate(db, { migrationsFolder: "src/db/migrations" });
  } finally {
    await close();
  }
}

// Запуск как скрипта: pnpm db:migrate
if (process.argv[1]?.endsWith("migrate.ts")) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL не задан");
  runMigrations(url)
    .then(() => console.log("Миграции применены"))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
