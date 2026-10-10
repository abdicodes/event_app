import Link from "next/link";
import { sql } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type PollRow = {
  id: number;
  title: string;
  description: string | null;
  starts_at: Date | null;
  ends_at: Date | null;
  choice_mode: "SINGLE" | "MULTIPLE";
  min_selections: number;
  max_selections: number;
  registered: number;
  voted: number;
  not_voted: number;
};

type OptionRow = {
  poll_id: number;
  id: number;
  label: string;
  position: number;
  votes: number;
};

export default async function PollResultsPage() {
  const polls = await sql<PollRow[]>`
    SELECT
      p.id,
      p.title,
      p.description,
      p.starts_at,
      p.ends_at,
      p.choice_mode,
      p.min_selections,
      p.max_selections,
      COUNT(DISTINCT pg.guest_id)::int AS registered,
      COUNT(DISTINCT ps.guest_id)::int AS voted,
      GREATEST(
        COUNT(DISTINCT pg.guest_id) - COUNT(DISTINCT ps.guest_id),
        0
      )::int AS not_voted
    FROM polls p
    LEFT JOIN poll_guests pg
      ON pg.poll_id = p.id
    LEFT JOIN poll_submissions ps
      ON ps.poll_id = p.id
      AND ps.guest_id = pg.guest_id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;

  const options = await sql<OptionRow[]>`
    SELECT
      po.poll_id,
      po.id,
      po.label,
      po.position,
      COUNT(pv.id)::int AS votes
    FROM poll_options po
    LEFT JOIN poll_votes pv
      ON pv.poll_id = po.poll_id
      AND pv.option_id = po.id
    GROUP BY
      po.poll_id,
      po.id,
      po.label,
      po.position
    ORDER BY
      po.poll_id,
      po.position,
      po.id
  `;

  const optionsByPoll = new Map<number, OptionRow[]>();

  for (const option of options) {
    const current = optionsByPoll.get(option.poll_id) ?? [];
    current.push(option);
    optionsByPoll.set(option.poll_id, current);
  }

  const fmt = (value: Date | null) =>
    value ? formatDateTime(value) : "No limit";

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Poll results</h1>
          <p>
            View total submitted votes, results for every option, and how many
            registered participants have not voted.
          </p>
        </div>

        <Link href="/polls" className="btn secondary">
          Manage polls
        </Link>
      </div>

      <div className="event-list">
        {polls.map((poll) => {
          const pollOptions = optionsByPoll.get(poll.id) ?? [];

          const turnout =
            poll.registered > 0
              ? Math.round((poll.voted / poll.registered) * 100)
              : 0;

          const rule =
            poll.choice_mode === "SINGLE"
              ? "One answer"
              : poll.min_selections === poll.max_selections
                ? `${poll.min_selections} answers required`
                : `${poll.min_selections}–${poll.max_selections} answers`;

          return (
            <article className="card" key={poll.id}>
              <div className="page-head compact">
                <div>
                  <h2>{poll.title}</h2>

                  <p>
                    {poll.description || "No description"}
                    <br />
                    Open: {fmt(poll.starts_at)} · Close: {fmt(poll.ends_at)} (GMT+8)
                    <br />
                    Answer rule: <strong>{rule}</strong>
                  </p>
                </div>
              </div>

              <div className="grid stats four-stats">
                <div className="card">
                  <div className="stat-label">Registered</div>
                  <div className="stat-value">{poll.registered}</div>
                </div>

                <div className="card">
                  <div className="stat-label">Votes submitted</div>
                  <div className="stat-value">{poll.voted}</div>
                </div>

                <div className="card">
                  <div className="stat-label">Not voted</div>
                  <div className="stat-value">{poll.not_voted}</div>
                </div>

                <div className="card">
                  <div className="stat-label">Turnout</div>
                  <div className="stat-value">{turnout}%</div>
                </div>
              </div>

              <div style={{ height: 16 }} />

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Option</th>
                      <th>Votes</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pollOptions.map((option) => (
                      <tr key={option.id}>
                        <td>
                          <strong>{option.label}</strong>
                        </td>
                        <td>{option.votes}</td>
                      </tr>
                    ))}

                    {!pollOptions.length && (
                      <tr>
                        <td colSpan={2} className="muted">
                          No options found for this poll.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {poll.choice_mode === "MULTIPLE" && (
                <p className="small muted" style={{ marginBottom: 0 }}>
                  This poll allows multiple answers, so the option vote totals
                  can add up to more than the number of submitted votes.
                </p>
              )}
            </article>
          );
        })}

        {!polls.length && (
          <div className="card empty-state">
            No polls have been created yet.
          </div>
        )}
      </div>
    </>
  );
}
