<<<<<<< HEAD
import Link from 'next/link'
import StatusPill from '@/components/StatusPill'
import { guestAttendanceRows } from '@/lib/attendance'
import { sql } from '@/lib/db'
import { formatDateTime, formatDuration, formatTime } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const events = await sql<
    {
      id: number
      name: string
      starts_at: Date | null
      ends_at: Date | null
      created_at: Date
      last_check_in: Date | null
    }[]
  >`
=======
import Link from "next/link";
import StatusPill from "@/components/StatusPill";
import CheckoutEventButton from "@/components/CheckoutEventButton";
import { guestAttendanceRows } from "@/lib/attendance";
import { sql } from "@/lib/db";
import { autoCheckoutExpiredEvents } from "@/lib/events";
import { formatDateTime, formatDuration, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await autoCheckoutExpiredEvents();
  const events = await sql<{id:number;name:string;starts_at:Date|null;ends_at:Date|null;created_at:Date;last_check_in:Date|null}[]>`
>>>>>>> 50ba541 (Updated project)
    SELECT e.id,e.name,e.starts_at,e.ends_at,e.created_at,
      MAX(al.created_at) FILTER (WHERE al.action='CHECK_IN') AS last_check_in
    FROM events e
    LEFT JOIN attendance_logs al ON al.event_id=e.id
    GROUP BY e.id,e.name,e.starts_at,e.ends_at,e.created_at
    ORDER BY (MAX(al.created_at) FILTER (WHERE al.action='CHECK_IN') IS NULL), MAX(al.created_at) FILTER (WHERE al.action='CHECK_IN') DESC NULLS LAST, e.created_at DESC
<<<<<<< HEAD
  `

  const data = await Promise.all(
    events.map(async (event) => ({
      event,
      rows: await guestAttendanceRows(event.id),
    })),
  )
  const totals = data.reduce(
    (acc, item) => {
      acc.registered += item.rows.length
      acc.inside += item.rows.filter((r) => r.status === 'INSIDE').length
      acc.break += item.rows.filter((r) => r.status === 'ON_BREAK').length
      acc.out += item.rows.filter((r) => r.status === 'CHECKED_OUT').length
      acc.waiting += item.rows.filter((r) => r.status === 'NOT_ARRIVED').length
      return acc
    },
    { registered: 0, inside: 0, break: 0, out: 0, waiting: 0 },
  )

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Event dashboard</h1>
          {/* <p>Events are ordered by their most recent check-in. Expand only the guest list; registration management and scanning stay immediately accessible.</p> */}
        </div>
        <div className="actions">
          <Link href="/events" className="btn accent">
            Add event
          </Link>
        </div>
      </div>
      <div className="grid stats">
        <div className="card">
          <div className="stat-label">Registrations</div>
          <div className="stat-value">{totals.registered}</div>
        </div>
        <div className="card">
          <div className="stat-label">Inside</div>
          <div className="stat-value">{totals.inside}</div>
        </div>
        <div className="card">
          <div className="stat-label">On break</div>
          <div className="stat-value">{totals.break}</div>
        </div>
        <div className="card">
          <div className="stat-label">Checked out</div>
          <div className="stat-value">{totals.out}</div>
        </div>
        <div className="card">
          <div className="stat-label">Not arrived</div>
          <div className="stat-value">{totals.waiting}</div>
        </div>
      </div>
      <div style={{ height: 18 }} />
      <div className="event-stack">
        {data.map(({ event, rows }, index) => {
          const counts = {
            inside: rows.filter((r) => r.status === 'INSIDE').length,
            break: rows.filter((r) => r.status === 'ON_BREAK').length,
          }
          return (
            <section className="event-panel" key={event.id}>
              <div className="event-panel-head">
                <div className="event-summary-main">
                  <strong>{event.name}</strong>
                  <span className="small muted">
                    Latest check-in: {formatDateTime(event.last_check_in)}
                  </span>
                </div>
                <div className="event-summary-counts">
                  <span>{rows.length} registered</span>
                  <span className="summary-live">{counts.inside} inside</span>
                  <span>{counts.break} break</span>
                </div>
                <div className="actions event-panel-actions">
                  <Link
                    className="btn secondary"
                    href={`/events/${event.id}/guests`}
                  >
                    Manage registration
                  </Link>
                  <Link
                    className="btn accent"
                    href={`/scanner?event=${event.id}`}
                  >
                    Scanner
                  </Link>
                </div>
              </div>
              <details className="guest-details" open={index === 0}>
                <summary>
                  Guest list{' '}
                  <span className="small muted">({rows.length})</span>
                </summary>
                <div className="event-detail-body">
                  {rows.length ? (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Guest</th>
                            <th>Delegation/WG</th>
                            <th>Status</th>
                            <th>Arrival</th>
                            <th>Away</th>
                            <th>Attendance</th>
                            <th>Final exit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r.id}>
                              <td>
                                <strong>{r.name}</strong>
                              </td>
                              <td>{r.delegation_wg || '—'}</td>
                              <td>
                                <StatusPill status={r.status} />
                              </td>
                              <td>{formatTime(r.checkIn)}</td>
                              <td>{formatDuration(r.awayMs)}</td>
                              <td>{formatDuration(r.attendanceMs)}</td>
                              <td>{formatTime(r.checkout)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state">
                      No guests are registered for this event yet.
                    </div>
                  )}
                </div>
              </details>
            </section>
          )
        })}
        {!data.length && (
          <div className="card empty-state">
            No events yet. Create your first event to get started.
          </div>
        )}
      </div>
    </>
  )
=======
  `;

  const data = await Promise.all(events.map(async event=>({event,rows:await guestAttendanceRows(event.id)})));
  const totals=data.reduce((acc,item)=>{
    acc.registered+=item.rows.length;
    acc.inside+=item.rows.filter(r=>r.status==="INSIDE").length;
    acc.out+=item.rows.filter(r=>r.status==="CHECKED_OUT").length;
    acc.waiting+=item.rows.filter(r=>r.status==="NOT_ARRIVED").length;
    return acc;
  },{registered:0,inside:0,out:0,waiting:0});

  return <>
    <div className="page-head"><div><h1>Event dashboard</h1><p>Times use GMT+8. Events are ordered by their most recent check-in; expired events automatically close any remaining inside registrations.</p></div><div className="actions"><Link href="/schedule/manage" className="btn secondary">Edit schedule</Link><Link href="/polls" className="btn secondary">Polls</Link><Link href="/events" className="btn accent">Add event</Link></div></div>
    <div className="grid stats four-stats">
      <div className="card"><div className="stat-label">Registrations</div><div className="stat-value">{totals.registered}</div></div>
      <div className="card"><div className="stat-label">Inside</div><div className="stat-value">{totals.inside}</div></div>
      <div className="card"><div className="stat-label">Checked out</div><div className="stat-value">{totals.out}</div></div>
      <div className="card"><div className="stat-label">Not arrived</div><div className="stat-value">{totals.waiting}</div></div>
    </div>
    <div style={{height:18}} />
    <div className="event-stack">
      {data.map(({event,rows},index)=>{
        const inside=rows.filter(r=>r.status==="INSIDE").length;
        return <section className="event-panel" key={event.id}>
          <div className="event-panel-head">
            <div className="event-summary-main"><strong>{event.name}</strong><span className="small muted">{formatDateTime(event.starts_at)} → {formatDateTime(event.ends_at)} · Latest check-in: {formatDateTime(event.last_check_in)}</span></div>
            <div className="event-summary-counts"><span>{rows.length} registered</span><span className="summary-live">{inside} inside</span></div>
            <div className="actions event-panel-actions"><Link className="btn secondary" href={`/events/${event.id}/guests`}>Manage registration</Link><Link className="btn accent" href={`/scanner?event=${event.id}`}>Scanner</Link><CheckoutEventButton eventId={event.id} eventName={event.name} insideCount={inside}/></div>
          </div>
          <details className="guest-details" open={index===0}>
            <summary>Guest list <span className="small muted">({rows.length})</span></summary>
            <div className="event-detail-body">
              {rows.length?<div className="table-wrap"><table><thead><tr><th>Guest</th><th>Region</th><th>Status</th><th>First check-in</th><th>Attendance</th><th>Last checkout</th></tr></thead><tbody>
                {rows.map(r=><tr key={r.id}><td><strong>{r.name}</strong></td><td>{r.region || "—"}</td><td><StatusPill status={r.status}/></td><td>{formatTime(r.checkIn)}</td><td>{formatDuration(r.attendanceMs)}</td><td>{formatTime(r.checkout)}</td></tr>)}
              </tbody></table></div>:<div className="empty-state">No guests are registered for this event yet.</div>}
            </div>
          </details>
        </section>;
      })}
      {!data.length&&<div className="card empty-state">No events yet. Create your first event to get started.</div>}
    </div>
  </>;
>>>>>>> 50ba541 (Updated project)
}
