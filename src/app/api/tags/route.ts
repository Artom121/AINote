import { NextResponse } from "next/server";
import { listTags } from "@/db/queries/notes";
import { withUser } from "@/lib/api";

export const GET = withUser(async ({ db, userId }) => {
  return NextResponse.json({ tags: await listTags(db, userId) });
});
