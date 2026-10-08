import { NextResponse } from "next/server";
import { assertSameOrigin, requireStaffApi } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaffApi())) return NextResponse.json({ error: "Staff login required" }, { status: 401 });
  if (!(await assertSameOrigin(request))) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });

  const pollId = Number((await params).id);
  if (!Number.isInteger(pollId) || pollId < 1) return NextResponse.json({ error: "Invalid poll" }, { status: 400 });

  const deleted = await sql<{ id: number }[]>`DELETE FROM polls WHERE id=${pollId} RETURNING id`;
  if (!deleted[0]) return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
