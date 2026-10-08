import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { resolveGuestCredential } from "@/lib/guest-access";
import { validateSelectionCount } from "@/lib/polls";

type VoteRequestBody = {
  credential?: unknown;
  optionId?: unknown;
  optionIds?: unknown;
};

const POSTGRES_INT4_OID = 23;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assertSameOrigin(request))) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });

  const pollId = Number((await params).id);
  const body = (await request.json().catch(() => ({}))) as VoteRequestBody;
  const rawOptionIds: unknown[] = Array.isArray(body.optionIds)
    ? body.optionIds
    : body.optionId !== undefined
      ? [body.optionId]
      : [];

  const optionIds: number[] = Array.from(
    new Set(
      rawOptionIds
        .map((value: unknown) => Number(value))
        .filter((value: number) => Number.isInteger(value) && value > 0),
    ),
  );
  if (!Number.isInteger(pollId) || pollId < 1 || optionIds.length < 1) {
    return NextResponse.json({ error: "Invalid vote request" }, { status: 400 });
  }

  const guest = await resolveGuestCredential(typeof body.credential === "string" ? body.credential : "");
  if (!guest) return NextResponse.json({ error: "Badge not recognized" }, { status: 404 });

  try {
    const result = await sql.begin(async tx => {
      const poll = (await tx<{
        id: number;
        choice_mode: "SINGLE" | "MULTIPLE";
        min_selections: number;
        max_selections: number;
      }[]>`
        SELECT p.id,p.choice_mode,p.min_selections,p.max_selections
        FROM polls p
        JOIN poll_guests pg ON pg.poll_id=p.id AND pg.guest_id=${guest.id}
        WHERE p.id=${pollId}
          AND (p.starts_at IS NULL OR p.starts_at<=now())
          AND (p.ends_at IS NULL OR p.ends_at>=now())
        FOR UPDATE
      `)[0];
      if (!poll) {
        throw Object.assign(new Error("You are not registered for this poll, or voting is not currently open"), { status: 403 });
      }

      if ((await tx`SELECT 1 FROM poll_submissions WHERE poll_id=${pollId} AND guest_id=${guest.id} FOR UPDATE`)[0]) {
        throw Object.assign(new Error("Your vote has already been submitted"), { status: 409 });
      }

      const countError = validateSelectionCount(
        poll.choice_mode,
        optionIds.length,
        poll.min_selections,
        poll.max_selections,
      );
      if (countError) throw Object.assign(new Error(countError), { status: 400 });

      const validOptions = await tx<{ id: number }[]>`
        SELECT id
        FROM poll_options
        WHERE poll_id=${pollId}
          AND id = ANY(${tx.array(optionIds, POSTGRES_INT4_OID)})
      `;
      if (validOptions.length !== optionIds.length) {
        throw Object.assign(new Error("One or more selected options are invalid"), { status: 400 });
      }

      for (const optionId of optionIds) {
        await tx`INSERT INTO poll_votes(poll_id,guest_id,option_id) VALUES(${pollId},${guest.id},${optionId})`;
      }
      await tx`INSERT INTO poll_submissions(poll_id,guest_id) VALUES(${pollId},${guest.id})`;
      return { ok: true };
    });
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.code === "23505") return NextResponse.json({ error: "Your vote has already been submitted" }, { status: 409 });
    return NextResponse.json({ error: error?.message || "Could not submit vote" }, { status: error?.status || 500 });
  }
}
