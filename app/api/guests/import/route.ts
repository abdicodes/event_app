import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { assertSameOrigin, requireStaffApi } from "@/lib/auth";

export async function POST(request:Request){
  if(!(await requireStaffApi())) return NextResponse.json({error:"Staff login required"},{status:401});
  if(!(await assertSameOrigin(request))) return NextResponse.json({error:"Invalid request origin"},{status:403});
  const b=await request.json().catch(()=>({}));
  const csv=typeof b.csv==="string"?b.csv:"";
  if(csv.length>100000) return NextResponse.json({error:"CSV is too large for this MVP importer"},{status:400});
  const lines=csv.split(/\r?\n/).map((l:string)=>l.trim()).filter(Boolean);
  if(lines.length<2) return NextResponse.json({error:"CSV needs a header and at least one guest"},{status:400});
  if(lines[0].toLowerCase().replace(/\s/g,"")!=="name,delegation_wg") return NextResponse.json({error:"Header must be name,delegation_wg"},{status:400});
  const parsed=lines.slice(1,501).map((line:string)=>line.split(",").map(v=>v.trim()));
  let imported=0;
  await sql.begin(async tx=>{
    for(const [name,delegationWg=""] of parsed){
      if(!name||name.length>120||delegationWg.length>120) continue;
      const token=crypto.randomBytes(24).toString("base64url");
      await tx`INSERT INTO guests(name,delegation_wg,qr_token) VALUES(${name},${delegationWg||null},${token})`;
      imported++;
    }
  });
  return NextResponse.json({imported});
}
