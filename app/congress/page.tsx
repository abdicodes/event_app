import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CongressPage() {
  const livePoll = ((await sql<{exists:boolean}[]>`
    SELECT EXISTS(
      SELECT 1
      FROM polls p
      WHERE (p.starts_at IS NULL OR p.starts_at<=now())
        AND (p.ends_at IS NULL OR p.ends_at>=now())
    ) AS exists
  `)[0]?.exists ?? false);

  return (
    <main className="guest-portal congress-portal">
      <div className="guest-hero">
        <span className="public-brand"><BrandLogo/></span>
        <h1>Congress portal</h1>
        <p>Browse the congress programme. When voting is live, badge holders can scan their badge to access any poll they are registered for.</p>
      </div>

      <div className="guest-actions">
        <Link className="guest-action-card" href="/schedule">
          <span className="guest-action-icon">◷</span>
          <strong>Activities of the day</strong>
          <span>Browse the programme in a day-by-day timeline. Times are GMT+8.</span>
        </Link>

        {livePoll && (
          <Link className="guest-action-card" href="/votes">
            <span className="guest-action-icon">✓</span>
            <strong>Votes &amp; polls</strong>
            <span>A poll is live now. Scan your badge to see whether you are registered and open your ballot.</span>
          </Link>
        )}
      </div>

      {!livePoll && <p className="public-footnote">There are no live polls at the moment.</p>}
    </main>
  );
}
