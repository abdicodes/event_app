import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireStaffApi } from "@/lib/auth";
import { createBadgesPdf, type BadgeGuest } from "@/lib/badge-pdf";
import type { RoleCode } from "@/lib/roles";

export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await requireStaffApi())) return NextResponse.json({error:"Staff login required"},{status:401});
  const {id}=await params;
  const guestId=Number(id);
  if(!Number.isInteger(guestId)||guestId<1) return NextResponse.json({error:"Invalid guest"},{status:400});
  const guest=(await sql<(Omit<BadgeGuest,"roles">&{roles:RoleCode[]})[]>`
    SELECT g.id,g.name,g.badge_code,
           COALESCE(json_agg(gr.role_code ORDER BY gr.position) FILTER (WHERE gr.role_code IS NOT NULL),'[]'::json) AS roles
    FROM guests g LEFT JOIN guest_roles gr ON gr.guest_id=g.id
    WHERE g.id=${guestId}
    GROUP BY g.id,g.name,g.badge_code
  `)[0];
  if(!guest) return NextResponse.json({error:"Guest not found"},{status:404});
  const bytes=await createBadgesPdf([guest]);
  const safe=guest.name.replace(/[^a-z0-9_-]+/gi,"-").replace(/^-+|-+$/g,"").toLowerCase()||`guest-${guest.id}`;
  return new NextResponse(Buffer.from(bytes),{headers:{"content-type":"application/pdf","content-disposition":`attachment; filename=${safe}-badge.pdf`,"cache-control":"private, no-store"}});
}
