import { NextResponse } from "next/server";
import { processScan, ScanError } from "@/lib/attendance";
import { assertSameOrigin, requireStaffApi } from "@/lib/auth";
import type { ScanMode } from "@/lib/types";

<<<<<<< HEAD
const modes = new Set<ScanMode>(["ENTRY_RETURN","BREAK_OUT","CHECK_OUT"]);
=======
const modes = new Set<ScanMode>(["CHECK_IN","CHECK_OUT"]);
>>>>>>> 50ba541 (Updated project)
export async function POST(request:Request){
  if (!(await requireStaffApi())) return NextResponse.json({error:"Staff login required"},{status:401});
  if (!(await assertSameOrigin(request))) return NextResponse.json({error:"Invalid request origin"},{status:403});
  const body = await request.json().catch(()=>({}));
  const eventId = Number(body.eventId);
  if (typeof body.rawToken !== "string" || !modes.has(body.mode) || !Number.isInteger(eventId) || eventId < 1) {
    return NextResponse.json({error:"Invalid scan request"},{status:400});
  }
  try {
    return NextResponse.json(await processScan(body.rawToken, body.mode, typeof body.scannerLabel === "string" ? body.scannerLabel : "Web scanner", eventId));
  } catch(error){
    if(error instanceof ScanError) return NextResponse.json({error:error.message,code:error.code,guestName:error.guestName},{status:error.status});
    console.error(error);
    return NextResponse.json({error:"Could not record scan"},{status:500});
  }
}
