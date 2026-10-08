import { NextResponse } from "next/server";
import { assertSameOrigin, requireStaffApi } from "@/lib/auth";
import { checkoutWholeEvent } from "@/lib/events";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaffApi())) {
    return NextResponse.json({ error: "Staff login required" }, { status: 401 });
  }
  if (!(await assertSameOrigin(request))) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const eventId = parseId((await params).id);
  if (!eventId) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const result = await checkoutWholeEvent(eventId);
  if (!result.eventFound) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, checkedOut: result.checkedOut });
}
