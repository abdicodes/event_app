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
  const csv=typeof b.csv==="string"?b.csv:"";
  if(csv.length>100000) return NextResponse.json({error:"CSV is too large for this MVP importer"},{status:400});
  const lines=csv.split(/\r?\n/).map((l:string)=>l.trim()).filter(Boolean);
  if(lines.length<2) return NextResponse.json({error:"CSV needs a header and at least one guest"},{status:400});
<<<<<<< HEAD
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
=======
  const header=lines[0].toLowerCase().replace(/\s/g,"");
  const legacyRegionHeader=header==="name,region";
  const roleRegionHeader=header==="name,region,role_1,role_2";
  // Keep old exports importable during the migration to Region.
  const legacyDelegationHeader=header==="name,delegation_wg";
  const roleDelegationHeader=header==="name,delegation_wg,role_1,role_2";
  const twoColumn=legacyRegionHeader||legacyDelegationHeader;
  const fourColumn=roleRegionHeader||roleDelegationHeader;
  if(!twoColumn&&!fourColumn) return NextResponse.json({error:"Header must be name,region,role_1,role_2"},{status:400});

  const parsed=lines.slice(1,501).map((line:string)=>line.split(",").map(v=>v.trim()));
  let imported=0;
  let skipped=0;
  await sql.begin(async tx=>{
    for(const fields of parsed){
      const [name,region="",role1="DELEGATE",role2=""]=fields;
      if(!name||name.length>120||region.length>120){skipped++;continue;}
      const roleCheck=validateGuestRoles([role1||"DELEGATE",role2].filter(Boolean));
      if(!roleCheck.ok){skipped++;continue;}
      const token=crypto.randomBytes(24).toString("base64url");
      let created:{id:number}|undefined;
      for(let attempt=0;attempt<4;attempt++){
        try {
          created=(await tx<{id:number}[]>`
            INSERT INTO guests(name,region,qr_token,badge_code)
            VALUES(${name},${region||null},${token},${newBadgeCode()})
            RETURNING id
          `)[0];
          break;
        } catch(error:any){ if(error?.code!=="23505"||attempt===3) throw error; }
      }
      if(!created){skipped++;continue;}
      for(let i=0;i<roleCheck.roles.length;i++){
        await tx`INSERT INTO guest_roles(guest_id,role_code,position) VALUES(${created.id},${roleCheck.roles[i]},${i+1})`;
      }
      imported++;
    }
  });
  return NextResponse.json({imported,skipped});
>>>>>>> 50ba541 (Updated project)
}
