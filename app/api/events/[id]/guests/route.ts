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
<<<<<<< HEAD
  const guestId=Number(body.guestId);
  if(!Number.isInteger(guestId)||guestId<1) return NextResponse.json({error:"Invalid guest"},{status:400});
  if(!(await sql`SELECT id FROM events WHERE id=${eventId} LIMIT 1`)[0]) return NextResponse.json({error:"Event not found"},{status:404});
=======
  if(!(await sql`SELECT id FROM events WHERE id=${eventId} LIMIT 1`)[0]) return NextResponse.json({error:"Event not found"},{status:404});

  if(body.all===true){
    const rows=await sql`
      INSERT INTO event_guests(event_id,guest_id)
      SELECT ${eventId},id FROM guests
      ON CONFLICT(event_id,guest_id) DO NOTHING
      RETURNING guest_id
    `;
    return NextResponse.json({ok:true,registered:rows.length});
  }

  const guestId=Number(body.guestId);
  if(!Number.isInteger(guestId)||guestId<1) return NextResponse.json({error:"Invalid guest"},{status:400});
>>>>>>> 50ba541 (Updated project)
  if(!(await sql`SELECT id FROM guests WHERE id=${guestId} LIMIT 1`)[0]) return NextResponse.json({error:"Guest not found"},{status:404});
  await sql`INSERT INTO event_guests(event_id,guest_id) VALUES(${eventId},${guestId}) ON CONFLICT(event_id,guest_id) DO NOTHING`;
  return NextResponse.json({ok:true});
}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await requireStaffApi())) return NextResponse.json({error:"Staff login required"},{status:401});
  if(!(await assertSameOrigin(request))) return NextResponse.json({error:"Invalid request origin"},{status:403});
  const eventId=parseId((await params).id);
  const body=await request.json().catch(()=>({}));
<<<<<<< HEAD
  const guestId=Number(body.guestId);
  if(!eventId||!Number.isInteger(guestId)||guestId<1) return NextResponse.json({error:"Invalid request"},{status:400});
  const hasLogs=(await sql`SELECT 1 FROM attendance_logs WHERE event_id=${eventId} AND guest_id=${guestId} LIMIT 1`)[0];
  if(hasLogs) return NextResponse.json({error:"This guest already has attendance history for the event and cannot be unregistered."},{status:409});
=======
  if(!eventId) return NextResponse.json({error:"Invalid request"},{status:400});

  if(body.all===true){
    const result=await sql<{guest_id:number}[]>`
      DELETE FROM event_guests eg
      WHERE eg.event_id=${eventId}
        AND NOT EXISTS(
          SELECT 1 FROM attendance_logs al
          WHERE al.event_id=eg.event_id AND al.guest_id=eg.guest_id
        )
      RETURNING guest_id
    `;
    const remaining=(await sql<{count:number}[]>`SELECT COUNT(*)::int count FROM event_guests WHERE event_id=${eventId}`)[0]?.count ?? 0;
    return NextResponse.json({ok:true,unregistered:result.length,skipped:remaining});
  }

  const guestId=Number(body.guestId);
  if(!Number.isInteger(guestId)||guestId<1) return NextResponse.json({error:"Invalid request"},{status:400});
  const hasLogs=(await sql`SELECT 1 FROM attendance_logs WHERE event_id=${eventId} AND guest_id=${guestId} LIMIT 1`)[0];
  if(hasLogs) return NextResponse.json({error:"This guest has attendance history and cannot be unregistered without deleting audit history."},{status:409});
>>>>>>> 50ba541 (Updated project)
  await sql`DELETE FROM event_guests WHERE event_id=${eventId} AND guest_id=${guestId}`;
  return NextResponse.json({ok:true});
}
