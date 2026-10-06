import { NextResponse } from "next/server";
import { listVersions } from "@/db/queries/notes";
import { parseId, withUser } from "@/lib/api";

export const GET = withUser(
  async ({ db, userId }, { params }: RouteContext<"/api/notes/[id]/versions">) => {
    const versions = await listVersions(db, userId, parseId((await params).id));
    return NextResponse.json({ versions });
  },
);
