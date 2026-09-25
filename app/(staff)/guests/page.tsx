import Link from 'next/link'
import GuestManager from '@/components/GuestManager'
import { sql } from '@/lib/db'
export const dynamic = 'force-dynamic'

export default async function GuestsPage() {
  const rows = await sql<
    {
      id: number
      name: string
      delegation_wg: string | null
      registration_count: number
      qr_token: string
    }[]
  >`
    SELECT g.id,g.name,g.delegation_wg,g.qr_token,COUNT(eg.event_id)::int AS registration_count
    FROM guests g
    LEFT JOIN event_guests eg ON eg.guest_id=g.id
    GROUP BY g.id,g.name,g.delegation_wg,g.qr_token
    ORDER BY g.name
  `
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Guest directory</h1>
          {/* <p>Guests and QR badges are global. Register the same guest for any number of events without issuing a new badge.</p> */}
        </div>
        <div className="actions">
          <Link className="btn secondary" href="/badges">
            Print badges
          </Link>
          <Link className="btn accent" href="/events">
            Event registrations
          </Link>
        </div>
      </div>
      <GuestManager />
      <div style={{ height: 18 }} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Guest</th>
              <th>Delegation/WG</th>
              <th>Events</th>
              <th>Badge</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.name}</strong>
                </td>
                <td>{r.delegation_wg || '—'}</td>
                <td>{r.registration_count}</td>
                <td>
                  <a
                    className="btn secondary"
                    href={`/api/qr/${r.qr_token}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    QR
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <div className="card empty-state">No guests yet.</div>}
    </>
  )
}
