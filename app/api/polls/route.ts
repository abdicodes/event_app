import { NextResponse } from "next/server";
import { assertSameOrigin, requireStaffApi } from "@/lib/auth";
import { sql } from "@/lib/db";
import { parsePollInput } from "@/lib/polls";

export async function POST(request: Request) {
  if (!(await requireStaffApi())) return NextResponse.json({ error: "Staff login required" }, { status: 401 });
  if (!(await assertSameOrigin(request))) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });

  const parsed = parsePollInput(await request.json().catch(() => ({})));
  if (!parsed.value) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const v = parsed.value;

  const poll = await sql.begin(async tx => {
    const p = (await tx<{ id: number }[]>`
      INSERT INTO polls(title,description,starts_at,ends_at,choice_mode,min_selections,max_selections)
      VALUES(${v.title},${v.description},${v.startsAt},${v.endsAt},${v.choiceMode},${v.minSelections},${v.maxSelections})
      RETURNING id
    `)[0];
    for (let i = 0; i < v.options.length; i++) {
      await tx`INSERT INTO poll_options(poll_id,label,position) VALUES(${p.id},${v.options[i]},${i})`;
    }
    return p;
  });

  return NextResponse.json({ poll }, { status: 201 });
}
