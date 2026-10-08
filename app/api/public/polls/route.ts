import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { resolveGuestCredential } from "@/lib/guest-access";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const guest = await resolveGuestCredential(typeof body.credential === "string" ? body.credential : "");
  if (!guest) {
    return NextResponse.json(
      { error: "Badge not recognized. Scan your badge or enter the printed badge code." },
      { status: 404 },
    );
  }

  const polls = await sql<{
    id: number;
    title: string;
    description: string | null;
    starts_at: Date | null;
    ends_at: Date | null;
    choice_mode: "SINGLE" | "MULTIPLE";
    min_selections: number;
    max_selections: number;
    voted: boolean;
    options: { id: number; label: string }[];
  }[]>`
    SELECT
      p.id,p.title,p.description,p.starts_at,p.ends_at,p.choice_mode,p.min_selections,p.max_selections,
      (ps.guest_id IS NOT NULL) voted,
      COALESCE(
        json_agg(json_build_object('id',po.id,'label',po.label) ORDER BY po.position,po.id)
        FILTER (WHERE po.id IS NOT NULL),
        '[]'
      ) options
    FROM poll_guests pg
    JOIN polls p ON p.id=pg.poll_id
    LEFT JOIN poll_submissions ps ON ps.poll_id=p.id AND ps.guest_id=pg.guest_id
    LEFT JOIN poll_options po ON po.poll_id=p.id
    WHERE pg.guest_id=${guest.id}
      AND (p.starts_at IS NULL OR p.starts_at<=now())
      AND (p.ends_at IS NULL OR p.ends_at>=now())
    GROUP BY p.id,ps.guest_id
    ORDER BY COALESCE(p.starts_at,p.created_at),p.id
  `;

  return NextResponse.json({
    guest: { id: guest.id, name: guest.name, region: guest.region },
    polls,
  });
}
