import "dotenv/config";
import { PgBoss } from "pg-boss";
import { createDb } from "@/db";
import { PURGE_TRASH_CRON, PURGE_TRASH_QUEUE, runPurgeTrash } from "./purge-trash";

// Отдельный процесс фоновых задач: pnpm worker (в Docker — сервис worker).
export async function startWorker(url: string): Promise<PgBoss> {
  const { db } = createDb(url, { max: 2 });
  const boss = new PgBoss(url);
  boss.on("error", (e) => console.error("[worker]", e.message));
  await boss.start();

  await boss.createQueue(PURGE_TRASH_QUEUE);
  await boss.schedule(PURGE_TRASH_QUEUE, PURGE_TRASH_CRON, null, { tz: "Europe/Moscow" });
  await boss.work(PURGE_TRASH_QUEUE, async () => {
    const count = await runPurgeTrash(db);
    console.log(`[worker] корзина: удалено заметок — ${count}`);
  });
  return boss;
}

if (process.argv[1]?.endsWith("worker.ts")) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL не задан");
  startWorker(url).then((boss) => {
    console.log("[worker] запущен");
    const stop = () => boss.stop().then(() => process.exit(0));
    process.on("SIGTERM", stop);
    process.on("SIGINT", stop);
  });
}
