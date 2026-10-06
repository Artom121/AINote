import { NextResponse } from "next/server";
import { restoreVersion } from "@/db/queries/notes";
import { parseId, withUser } from "@/lib/api";

/** Откатить заметку к версии. */
export const POST = withUser(
  async (
    { db, userId },
    { params }: RouteContext<"/api/notes/[id]/versions/[versionId]/restore">,
  ) => {
    const { id, versionId } = await params;
    const note = await restoreVersion(db, userId, parseId(id), parseId(versionId, "Версия"));
    return NextResponse.json({ note });
  },
);
