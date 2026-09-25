import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { assertSameOrigin, requireStaffApi } from "@/lib/auth";

export async function POST(request:Request){
  if(!(await requireStaffApi())) return NextResponse.json({error:"Staff login required"},{status:401});
  if(!(await assertSameOrigin(request))) return NextResponse.json({error:"Invalid request origin"},{status:403});
  const b=await request.json().catch(()=>({}));
  const name=typeof b.name==="string"?b.name.trim():"";
  const delegationWg=typeof b.delegationWg==="string"?b.delegationWg.trim():"";
  if(name.length<2||name.length>120) return NextResponse.json({error:"Guest name must be 2–120 characters"},{status:400});
  if(delegationWg.length>120) return NextResponse.json({error:"Delegation/WG is too long"},{status:400});
  const token=crypto.randomBytes(24).toString("base64url");
  const rows=await sql<{id:number;name:string}[]>`
    INSERT INTO guests(name,delegation_wg,qr_token)
    VALUES(${name},${delegationWg||null},${token})
    RETURNING id,name
  `;
  return NextResponse.json({guest:rows[0]},{status:201});
}
