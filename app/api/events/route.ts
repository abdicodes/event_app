import { NextResponse } from "next/server";
import { assertSameOrigin, requireStaffApi } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function POST(request:Request){
  if(!(await requireStaffApi())) return NextResponse.json({error:"Staff login required"},{status:401});
  if(!(await assertSameOrigin(request))) return NextResponse.json({error:"Invalid request origin"},{status:403});
  const body=await request.json().catch(()=>({}));
  const name=typeof body.name==="string"?body.name.trim():"";
  if(name.length<2||name.length>140) return NextResponse.json({error:"Event name must be 2–140 characters"},{status:400});
  const startsAt=body.startsAt?new Date(body.startsAt):null;
  const endsAt=body.endsAt?new Date(body.endsAt):null;
  if(!startsAt||!endsAt) return NextResponse.json({error:"Start and end times are required for automatic checkout"},{status:400});
  if(startsAt && Number.isNaN(startsAt.getTime())) return NextResponse.json({error:"Invalid start date"},{status:400});
  if(endsAt && Number.isNaN(endsAt.getTime())) return NextResponse.json({error:"Invalid end date"},{status:400});
  if(startsAt&&endsAt&&endsAt.getTime()<startsAt.getTime()) return NextResponse.json({error:"End time must be after start time"},{status:400});
  const rows=await sql<{id:number;name:string;starts_at:Date|null;ends_at:Date|null}[]>`
    INSERT INTO events(name,starts_at,ends_at) VALUES(${name},${startsAt},${endsAt})
    RETURNING id,name,starts_at,ends_at
  `;
  return NextResponse.json({event:rows[0]},{status:201});
}
