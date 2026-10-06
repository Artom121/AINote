import { NextResponse } from "next/server";
import { restoreNote } from "@/db/queries/notes";
import { parseId, withUser } from "@/lib/api";

/** Восстановить заметку из корзины. */
export const POST = withUser(
  async ({ db, userId }, { params }: RouteContext<"/api/notes/[id]/restore">) => {
    const note = await restoreNote(db, userId, parseId((await params).id));
    return NextResponse.json({ note });
  },
);
