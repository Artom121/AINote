import { NextResponse } from "next/server";
import { createNote, listNotes } from "@/db/queries/notes";
import { withUser } from "@/lib/api";

export const GET = withUser(async ({ req, db, userId }) => {
  const p = req.nextUrl.searchParams;
  const notes = await listNotes(db, userId, {
    q: p.get("q") ?? undefined,
    tag: p.get("tag") ?? undefined,
    limit: p.get("limit") ?? undefined,
    offset: p.get("offset") ?? undefined,
  });
  return NextResponse.json({ notes });
});

export const POST = withUser(async ({ req, db, userId }) => {
  const note = await createNote(db, userId, await req.json());
  return NextResponse.json({ note }, { status: 201 });
});
