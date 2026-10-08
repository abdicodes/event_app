import Link from "next/link";
import GuestManager from "@/components/GuestManager";
import GuestRolesEditor from "@/components/GuestRolesEditor";
import DeleteGuestButton from "@/components/DeleteGuestButton";
import { sql } from "@/lib/db";
import type { RoleCode } from "@/lib/roles";
export const dynamic="force-dynamic";

type GuestRow={id:number;name:string;region:string|null;registration_count:number;badge_code:string;roles:RoleCode[]};

export default async function GuestsPage(){
  const rows=await sql<GuestRow[]>`
    SELECT g.id,g.name,g.region,g.badge_code,
           COUNT(DISTINCT eg.event_id)::int AS registration_count,
           COALESCE((SELECT json_agg(gr.role_code ORDER BY gr.position) FROM guest_roles gr WHERE gr.guest_id=g.id),'[]'::json) AS roles
    FROM guests g
    LEFT JOIN event_guests eg ON eg.guest_id=g.id
    GROUP BY g.id,g.name,g.region,g.badge_code
    ORDER BY g.name
  `;
  return <>
    <div className="page-head">
      <div><h1>Guest directory</h1><p>Guests are global and may have one or two roles. Their QR badge remains reusable across events and polls.</p></div>
      <div className="actions"><Link className="btn secondary" href="/badges">Badges & PDFs</Link><Link className="btn accent" href="/events">Event registrations</Link></div>
    </div>
    <GuestManager/>
    <div style={{height:18}}/>
    <div className="table-wrap"><table><thead><tr><th>Guest</th><th>Region</th><th>Roles</th><th>Events</th><th>Badge code</th><th>QR code</th><th>Delete</th></tr></thead><tbody>
      {rows.map(r=><tr key={r.id}><td><strong>{r.name}</strong></td><td>{r.region||"—"}</td><td><GuestRolesEditor guestId={r.id} roles={r.roles}/></td><td>{r.registration_count}</td><td><code className="badge-manual-code">{r.badge_code}</code></td><td><a className="btn secondary" href={`/api/qr/${encodeURIComponent(r.badge_code)}`} target="_blank" rel="noreferrer">QR</a></td><td><DeleteGuestButton guestId={r.id} name={r.name}/></td></tr>)}
    </tbody></table></div>
    {!rows.length&&<div className="card empty-state">No guests yet.</div>}
  </>;
}
