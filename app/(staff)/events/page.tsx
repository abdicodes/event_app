import Link from "next/link";
import EventManager from "@/components/EventManager";
import { sql } from "@/lib/db";
import { autoCheckoutExpiredEvents } from "@/lib/events";
import { formatDateTime } from "@/lib/format";

export const dynamic="force-dynamic";

export default async function EventsPage(){
  await autoCheckoutExpiredEvents();
  const events=await sql<{id:number;name:string;starts_at:Date|null;ends_at:Date|null;created_at:Date;guest_count:number;last_check_in:Date|null}[]>`
    SELECT e.id,e.name,e.starts_at,e.ends_at,e.created_at,
      COUNT(DISTINCT eg.guest_id)::int AS guest_count,
      MAX(al.created_at) FILTER (WHERE al.action='CHECK_IN') AS last_check_in
    FROM events e
    LEFT JOIN event_guests eg ON eg.event_id=e.id
    LEFT JOIN attendance_logs al ON al.event_id=e.id
    GROUP BY e.id,e.name,e.starts_at,e.ends_at,e.created_at
    ORDER BY (MAX(al.created_at) FILTER (WHERE al.action='CHECK_IN') IS NULL), MAX(al.created_at) FILTER (WHERE al.action='CHECK_IN') DESC NULLS LAST, e.created_at DESC
  `;
  return <>
    <div className="page-head"><div><h1>Events</h1><p>Create events and register guests from the shared directory. All times are GMT+8.</p></div></div>
    <EventManager/>
    <div style={{height:18}}/>
    <div className="event-list">
      {events.map(event=><article className="card event-row" key={event.id}>
        <div><h2 style={{marginBottom:5}}>{event.name}</h2><div className="small muted">{formatDateTime(event.starts_at)}{event.ends_at?` → ${formatDateTime(event.ends_at)}`:""}</div></div>
        <div className="event-meta"><strong>{event.guest_count}</strong><span>registered</span></div>
        <div className="event-meta"><strong>{event.last_check_in?formatDateTime(event.last_check_in):"—"}</strong><span>latest check-in</span></div>
        <div className="actions"><Link className="btn accent" href={`/events/${event.id}/guests`}>Registrations</Link><Link className="btn secondary" href={`/scanner?event=${event.id}`}>Scanner</Link></div>
      </article>)}
      {!events.length&&<div className="card muted">No events yet.</div>}
    </div>
  </>;
}
