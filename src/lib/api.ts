import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { auth } from "@/auth";
import { getDb, type Db } from "@/db";
import { NotFoundError } from "@/lib/errors";

type Ctx = { req: NextRequest; userId: string; db: Db };

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * Обёртка API-роута: сессия → userId, CSRF-проверка Origin для изменяющих
 * запросов, единый формат ошибок. userId берётся только из сессии.
 */
export function withUser<A extends unknown[]>(
  handler: (ctx: Ctx, ...args: A) => Promise<Response>,
) {
  return async (req: NextRequest, ...args: A): Promise<Response> => {
    if (!SAFE_METHODS.has(req.method)) {
      const origin = req.headers.get("origin");
      if (!origin || origin !== req.nextUrl.origin) return jsonError(403, "Недопустимый источник");
    }
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return jsonError(401, "Требуется вход");

    try {
      return await handler({ req, userId, db: getDb() }, ...args);
    } catch (e) {
      if (e instanceof NotFoundError) return jsonError(404, e.message);
      if (e instanceof ZodError) return jsonError(400, e.issues.map((i) => i.message).join("; "));
      if (e instanceof SyntaxError) return jsonError(400, "Некорректный JSON");
      throw e;
    }
  };
}

const uuid = z.uuid();

/** id из URL: некорректный uuid — это тоже «не найдено». */
export function parseId(value: string, what = "Заметка"): string {
  if (!uuid.safeParse(value).success) throw new NotFoundError(what);
  return value;
}
