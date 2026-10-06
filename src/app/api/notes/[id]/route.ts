import { NextResponse } from "next/server";
import { deleteNote, getNote, updateNote } from "@/db/queries/notes";
import { parseId, withUser } from "@/lib/api";

type Ctx = RouteContext<"/api/notes/[id]">;

export const GET = withUser(async ({ db, userId }, { params }: Ctx) => {
  const note = await getNote(db, userId, parseId((await params).id));
  return NextResponse.json({ note });
});

export const PATCH = withUser(async ({ req, db, userId }, { params }: Ctx) => {
  const note = await updateNote(db, userId, parseId((await params).id), await req.json());
  return NextResponse.json({ note });
});

export const DELETE = withUser(async ({ db, userId }, { params }: Ctx) => {
  await deleteNote(db, userId, parseId((await params).id));
  return new NextResponse(null, { status: 204 });
});
