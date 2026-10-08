import { NextResponse } from "next/server";
import { assertSameOrigin, requireStaffApi } from "@/lib/auth";
import { sql } from "@/lib/db";

function id(v:string){const n=Number(v);return Number.isInteger(n)&&n>0?n:null;}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await requireStaffApi()))return NextResponse.json({error:"Staff login required"},{status:401});
  if(!(await assertSameOrigin(request)))return NextResponse.json({error:"Invalid request origin"},{status:403});
  const pollId=id((await params).id),b=await request.json().catch(()=>({}));
  if(!pollId||!(await sql`SELECT 1 FROM polls WHERE id=${pollId}`)[0])return NextResponse.json({error:"Poll not found"},{status:404});

  if(b.all===true){
    const rows=await sql`INSERT INTO poll_guests(poll_id,guest_id) SELECT ${pollId},id FROM guests ON CONFLICT DO NOTHING RETURNING guest_id`;
    return NextResponse.json({ok:true,registered:rows.length});
  }

  if(typeof b.region==="string"&&b.region.trim()){
    const group=b.region.trim();
    const rows=await sql`INSERT INTO poll_guests(poll_id,guest_id) SELECT ${pollId},id FROM guests WHERE region=${group} ON CONFLICT DO NOTHING RETURNING guest_id`;
    return NextResponse.json({ok:true,registered:rows.length});
  }

  const guestId=Number(b.guestId);
  if(!Number.isInteger(guestId)||guestId<1)return NextResponse.json({error:"Invalid guest"},{status:400});
  if(!(await sql`SELECT 1 FROM guests WHERE id=${guestId}`)[0])return NextResponse.json({error:"Guest not found"},{status:404});
  await sql`INSERT INTO poll_guests(poll_id,guest_id) VALUES(${pollId},${guestId}) ON CONFLICT DO NOTHING`;
  return NextResponse.json({ok:true});
}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await requireStaffApi()))return NextResponse.json({error:"Staff login required"},{status:401});
  if(!(await assertSameOrigin(request)))return NextResponse.json({error:"Invalid request origin"},{status:403});
  const pollId=id((await params).id),b=await request.json().catch(()=>({}));
  if(!pollId)return NextResponse.json({error:"Invalid request"},{status:400});

  if(b.all===true){
    const rows=await sql<{guest_id:number}[]>`
      DELETE FROM poll_guests pg
      WHERE pg.poll_id=${pollId}
        AND NOT EXISTS(
          SELECT 1 FROM poll_submissions ps
          WHERE ps.poll_id=pg.poll_id AND ps.guest_id=pg.guest_id
        )
      RETURNING guest_id
    `;
    const remaining=(await sql<{count:number}[]>`SELECT COUNT(*)::int count FROM poll_guests WHERE poll_id=${pollId}`)[0]?.count ?? 0;
    return NextResponse.json({ok:true,unregistered:rows.length,skipped:remaining});
  }

  const guestId=Number(b.guestId);
  if(!Number.isInteger(guestId)||guestId<1)return NextResponse.json({error:"Invalid request"},{status:400});
  if((await sql`SELECT 1 FROM poll_submissions WHERE poll_id=${pollId} AND guest_id=${guestId}`)[0])return NextResponse.json({error:"A vote has already been submitted for this participant"},{status:409});
  await sql`DELETE FROM poll_guests WHERE poll_id=${pollId} AND guest_id=${guestId}`;
  return NextResponse.json({ok:true});
}
