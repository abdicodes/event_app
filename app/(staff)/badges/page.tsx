import PrintButton from '@/components/PrintButton'
import { sql } from '@/lib/db'
export const dynamic = 'force-dynamic'

export default async function BadgesPage() {
  const guests = await sql<
    {
      id: number
      name: string
      delegation_wg: string | null
      qr_token: string
    }[]
  >`
    SELECT id,name,delegation_wg,qr_token FROM guests ORDER BY name
  `
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Guest badges</h1>
          {/* <p>Each guest has one QR code that can be reused across every event they are registered for.</p> */}
        </div>
        <div className="actions no-print">
          <PrintButton />
        </div>
      </div>
      <div className="badge-grid">
        {guests.map((g) => (
          <article className="badge" key={g.id}>
            <img src={`/api/qr/${g.qr_token}`} alt={`QR badge for ${g.name}`} />
            <div className="badge-name">{g.name}</div>
            <div className="muted">{g.delegation_wg || 'Guest'}</div>
            <div className="badge-code">Guest #{g.id}</div>
          </article>
        ))}
      </div>
      {!guests.length && (
        <div className="card empty-state">No guests have been added yet.</div>
      )}
    </>
  )
}
