import BadgePreview from "@/components/BadgePreview";
import { sql } from "@/lib/db";
import { ROLE_STYLE, type RoleCode } from "@/lib/roles";
export const dynamic="force-dynamic";

type BadgeRow={id:number;name:string;region:string|null;badge_code:string;roles:RoleCode[]};

export default async function BadgesPage(){
  const guests=await sql<BadgeRow[]>`
    SELECT g.id,g.name,g.region,g.badge_code,
           COALESCE(json_agg(gr.role_code ORDER BY gr.position) FILTER (WHERE gr.role_code IS NOT NULL),'[]'::json) AS roles
    FROM guests g LEFT JOIN guest_roles gr ON gr.guest_id=g.id
    GROUP BY g.id,g.name,g.region,g.badge_code
    ORDER BY g.name
  `;
  return <>
    <div className="page-head"><div><h1>Guest badges</h1><p>Badge colour is role-driven. If Delegate is combined with another role, the other role takes precedence. Each PDF contains one badge per page.</p></div><div className="actions no-print"><a className="btn accent" href="/api/badges/pdf">Download all badges PDF</a></div></div>
    <div className="badge-grid role-badge-grid">{guests.map(g=><article className="badge-display-card" key={g.id}>
      <BadgePreview name={g.name} badgeCode={g.badge_code} roles={g.roles}/>
      <div className="badge-card-info no-print">
        <strong>{g.name}</strong>
        <span className="muted">{g.region||"No Region"}</span>
        <div className="role-lines">{g.roles.map(role=><span key={role}>{ROLE_STYLE[role].label}</span>)}</div>
        <code className="badge-manual-code">{g.badge_code}</code>
        <a className="btn secondary" href={`/api/badges/${g.id}/pdf`}>Individual PDF</a>
      </div>
    </article>)}</div>
    {!guests.length&&<div className="card empty-state">No guests have been added yet.</div>}
  </>;
}
