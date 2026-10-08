import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { assertSameOrigin, requireStaffApi } from "@/lib/auth";
<<<<<<< HEAD
=======
import { validateGuestRoles } from "@/lib/roles";

function newBadgeCode(){ return `G-${crypto.randomBytes(5).toString("hex").toUpperCase()}`; }
>>>>>>> 50ba541 (Updated project)

export async function POST(request:Request){
  if(!(await requireStaffApi())) return NextResponse.json({error:"Staff login required"},{status:401});
  if(!(await assertSameOrigin(request))) return NextResponse.json({error:"Invalid request origin"},{status:403});
  const b=await request.json().catch(()=>({}));
  const name=typeof b.name==="string"?b.name.trim():"";
<<<<<<< HEAD
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
=======
  const region=typeof b.region==="string"?b.region.trim():"";
  const requestedRoles=[b.role1,b.role2].filter((value:unknown)=>typeof value==="string"&&value.length>0);
  const roleCheck=validateGuestRoles(requestedRoles);
  if(!roleCheck.ok) return NextResponse.json({error:roleCheck.error},{status:400});
  if(name.length<2||name.length>120) return NextResponse.json({error:"Guest name must be 2–120 characters"},{status:400});
  if(region.length>120) return NextResponse.json({error:"Region is too long"},{status:400});

  const token=crypto.randomBytes(24).toString("base64url");
  let row:{id:number;name:string;badge_code:string}|undefined;
  for(let attempt=0;attempt<4;attempt++){
    try {
      row=await sql.begin(async tx=>{
        const created=(await tx<{id:number;name:string;badge_code:string}[]>`
          INSERT INTO guests(name,region,qr_token,badge_code)
          VALUES(${name},${region||null},${token},${newBadgeCode()})
          RETURNING id,name,badge_code
        `)[0];
        for(let i=0;i<roleCheck.roles.length;i++){
          await tx`INSERT INTO guest_roles(guest_id,role_code,position) VALUES(${created.id},${roleCheck.roles[i]},${i+1})`;
        }
        return created;
      });
      break;
    } catch(error:any){ if(error?.code!=="23505"||attempt===3) throw error; }
  }
  return NextResponse.json({guest:row},{status:201});
>>>>>>> 50ba541 (Updated project)
}
