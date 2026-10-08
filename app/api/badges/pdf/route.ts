import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireStaffApi } from "@/lib/auth";
import { createBadgesPdf, type BadgeGuest } from "@/lib/badge-pdf";
import type { RoleCode } from "@/lib/roles";

export const runtime="nodejs";
export async function GET(_request:Request){
  if(!(await requireStaffApi())) return NextResponse.json({error:"Staff login required"},{status:401});
  const guests=await sql<(Omit<BadgeGuest,"roles">&{roles:RoleCode[]})[]>`
    SELECT g.id,g.name,g.badge_code,
           COALESCE(json_agg(gr.role_code ORDER BY gr.position) FILTER (WHERE gr.role_code IS NOT NULL),'[]'::json) AS roles
    FROM guests g LEFT JOIN guest_roles gr ON gr.guest_id=g.id
    GROUP BY g.id,g.name,g.badge_code ORDER BY g.name
  `;
  if(!guests.length) return NextResponse.json({error:"No guests to print"},{status:404});
  const bytes=await createBadgesPdf(guests);
  return new NextResponse(Buffer.from(bytes),{headers:{"content-type":"application/pdf","content-disposition":"attachment; filename=all-badges.pdf","cache-control":"private, no-store"}});
}
