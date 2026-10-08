import Link from "next/link";
import PollManager from "@/components/PollManager";
import DeletePollButton from "@/components/DeletePollButton";
import { sql } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PollsPage() {
  const polls = await sql<{
    id: number;
    title: string;
    description: string | null;
    starts_at: Date | null;
    ends_at: Date | null;
    choice_mode: "SINGLE" | "MULTIPLE";
    min_selections: number;
    max_selections: number;
    participants: number;
    submissions: number;
  }[]>`
    SELECT
      p.id,p.title,p.description,p.starts_at,p.ends_at,p.choice_mode,p.min_selections,p.max_selections,
      COUNT(DISTINCT pg.guest_id)::int participants,
      COUNT(DISTINCT ps.guest_id)::int submissions
    FROM polls p
    LEFT JOIN poll_guests pg ON pg.poll_id=p.id
    LEFT JOIN poll_submissions ps ON ps.poll_id=p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;
  const fmt = (v: Date | null) => v ? formatDateTime(v) : "No limit";

  return <>
    <div className="page-head">
      <div>
        <h1>Polls & votes</h1>
        <p>Create ballots, configure answer rules, register participants and remove polls that are no longer needed.</p>
      </div>
      <Link className="btn secondary" href="/congress" target="_blank">Open congress portal</Link>
    </div>

    <PollManager />
    <div style={{ height: 18 }} />

    <div className="event-list">
      {polls.map(p => {
        const rule = p.choice_mode === "SINGLE"
          ? "One answer"
          : p.min_selections === p.max_selections
            ? `${p.min_selections} answers required`
            : `${p.min_selections}–${p.max_selections} answers`;
        return <article className="card event-row" key={p.id}>
          <div>
            <h2>{p.title}</h2>
            <div className="small muted">
              {p.description || "No description"}<br />
              Open: {fmt(p.starts_at)} · Close: {fmt(p.ends_at)} (GMT+8)<br />
              Answer rule: <strong>{rule}</strong>
            </div>
          </div>
          <div className="event-meta"><strong>{p.participants}</strong><span>participants</span></div>
          <div className="event-meta"><strong>{p.submissions}</strong><span>votes</span></div>
          <div className="actions">
            <Link className="btn accent" href={`/polls/${p.id}/participants`}>Manage participants</Link>
            <DeletePollButton pollId={p.id} title={p.title} />
          </div>
        </article>;
      })}
      {!polls.length && <div className="card empty-state">No polls yet.</div>}
    </div>
  </>;
}
