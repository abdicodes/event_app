import { NextResponse } from "next/server";
import { assertSameOrigin, requireStaffApi } from "@/lib/auth";
import { autoCheckoutExpiredEvents } from "@/lib/events";

export async function POST(request:Request){
  if(!(await requireStaffApi())) return NextResponse.json({error:"Staff login required"},{status:401});
  if(!(await assertSameOrigin(request))) return NextResponse.json({error:"Invalid request origin"},{status:403});
  const checkedOut=await autoCheckoutExpiredEvents();
  return NextResponse.json({ok:true,checkedOut});
}
