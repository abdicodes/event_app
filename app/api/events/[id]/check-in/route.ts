import { NextResponse } from "next/server";
import { assertSameOrigin, requireStaffApi } from "@/lib/auth";
import { processManualCheckIn, ScanError } from "@/lib/attendance";

function parseId(value:string){ const n=Number(value); return Number.isInteger(n)&&n>0?n:null; }

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await requireStaffApi())) return NextResponse.json({error:"Staff login required"},{status:401});
  if(!(await assertSameOrigin(request))) return NextResponse.json({error:"Invalid request origin"},{status:403});
  const eventId=parseId((await params).id);
  const body=await request.json().catch(()=>({}));
  const guestId=Number(body.guestId);
  if(!eventId||!Number.isInteger(guestId)||guestId<1) return NextResponse.json({error:"Invalid request"},{status:400});
  try {
    return NextResponse.json(await processManualCheckIn(guestId,eventId));
  } catch(error){
    if(error instanceof ScanError) return NextResponse.json({error:error.message,code:error.code,guestName:error.guestName},{status:error.status});
    console.error(error);
    return NextResponse.json({error:"Could not check in guest"},{status:500});
  }
}
