import { NextResponse } from "next/server";
import { listTrash } from "@/db/queries/notes";
import { withUser } from "@/lib/api";

export const GET = withUser(async ({ db, userId }) => {
  return NextResponse.json({ notes: await listTrash(db, userId) });
});
