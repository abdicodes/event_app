import { NextResponse } from "next/server";
import { assertSameOrigin, requireStaffApi } from "@/lib/auth";
import { sql } from "@/lib/db";

function parseId(value:string){ const n=Number(value); return Number.isInteger(n)&&n>0?n:null; }

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await requireStaffApi())) return NextResponse.json({error:"Staff login required"},{status:401});
  if(!(await assertSameOrigin(request))) return NextResponse.json({error:"Invalid request origin"},{status:403});
  const eventId=parseId((await params).id);
  if(!eventId) return NextResponse.json({error:"Invalid event"},{status:400});
  const body=await request.json().catch(()=>({}));
  const guestId=Number(body.guestId);
  if(!Number.isInteger(guestId)||guestId<1) return NextResponse.json({error:"Invalid guest"},{status:400});
  if(!(await sql`SELECT id FROM events WHERE id=${eventId} LIMIT 1`)[0]) return NextResponse.json({error:"Event not found"},{status:404});
  if(!(await sql`SELECT id FROM guests WHERE id=${guestId} LIMIT 1`)[0]) return NextResponse.json({error:"Guest not found"},{status:404});
  await sql`INSERT INTO event_guests(event_id,guest_id) VALUES(${eventId},${guestId}) ON CONFLICT(event_id,guest_id) DO NOTHING`;
  return NextResponse.json({ok:true});
}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await requireStaffApi())) return NextResponse.json({error:"Staff login required"},{status:401});
  if(!(await assertSameOrigin(request))) return NextResponse.json({error:"Invalid request origin"},{status:403});
  const eventId=parseId((await params).id);
  const body=await request.json().catch(()=>({}));
  const guestId=Number(body.guestId);
  if(!eventId||!Number.isInteger(guestId)||guestId<1) return NextResponse.json({error:"Invalid request"},{status:400});
  const hasLogs=(await sql`SELECT 1 FROM attendance_logs WHERE event_id=${eventId} AND guest_id=${guestId} LIMIT 1`)[0];
  if(hasLogs) return NextResponse.json({error:"This guest already has attendance history for the event and cannot be unregistered."},{status:409});
  await sql`DELETE FROM event_guests WHERE event_id=${eventId} AND guest_id=${guestId}`;
  return NextResponse.json({ok:true});
}
