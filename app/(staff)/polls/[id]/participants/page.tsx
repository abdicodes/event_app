import { notFound } from "next/navigation";
import Link from "next/link";
import PollParticipantManager from "@/components/PollParticipantManager";
import { sql } from "@/lib/db";
import type { RoleCode } from "@/lib/roles";
export const dynamic="force-dynamic";
export default async function PollParticipantsPage({params}:{params:Promise<{id:string}>}){
  const id=Number((await params).id);if(!Number.isInteger(id)||id<1)notFound();
  const poll=(await sql<{title:string}[]>`SELECT title FROM polls WHERE id=${id}`)[0];if(!poll)notFound();
  const rows=await sql<{id:number;name:string;region:string|null;registered:boolean;has_voted:boolean;roles:RoleCode[]}[]>`
    SELECT g.id,g.name,g.region,(pg.guest_id IS NOT NULL) registered,(ps.guest_id IS NOT NULL) has_voted,
           COALESCE(json_agg(gr.role_code ORDER BY gr.position) FILTER (WHERE gr.role_code IS NOT NULL),'[]'::json) AS roles
    FROM guests g
    LEFT JOIN poll_guests pg ON pg.guest_id=g.id AND pg.poll_id=${id}
    LEFT JOIN poll_submissions ps ON ps.guest_id=g.id AND ps.poll_id=${id}
    LEFT JOIN guest_roles gr ON gr.guest_id=g.id
    GROUP BY g.id,g.name,g.region,pg.guest_id,ps.guest_id
    ORDER BY g.name
  `;
  return <><div className="page-head"><div><h1>{poll.title}</h1><p>Register the guests allowed to participate in this poll, individually, by Region, or all at once.</p></div><Link href="/polls" className="btn secondary">Back to polls</Link></div><PollParticipantManager pollId={id} rows={rows}/></>;
}
