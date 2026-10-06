import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { createDevSession, DEV_SESSION_COOKIE, isDevLoginEnabled } from "@/lib/auth/sessions";

const form = z.object({ email: z.string().email() });

// Вход без OAuth для локальной разработки. Вне NODE_ENV=development маршрута как бы нет.
export async function POST(req: NextRequest) {
  if (!isDevLoginEnabled()) return new NextResponse(null, { status: 404 });

  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) {
    return new NextResponse("Bad origin", { status: 403 });
  }

  const parsed = form.safeParse(Object.fromEntries(await req.formData()));
  if (!parsed.success) return new NextResponse("Некорректный email", { status: 400 });

  const { sessionToken, expires } = await createDevSession(getDb(), parsed.data.email);
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.set(DEV_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });
  return res;
}
