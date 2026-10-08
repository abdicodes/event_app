import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { assertSameOrigin, requireStaffApi } from "@/lib/auth";
import { validateGuestRoles } from "@/lib/roles";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await requireStaffApi())) return NextResponse.json({error:"Staff login required"},{status:401});
  if(!(await assertSameOrigin(request))) return NextResponse.json({error:"Invalid request origin"},{status:403});
  const {id}=await params;
  const guestId=Number(id);
  if(!Number.isInteger(guestId)||guestId<1) return NextResponse.json({error:"Invalid guest"},{status:400});
  const body=await request.json().catch(()=>({}));
  const check=validateGuestRoles(body.roles);
  if(!check.ok) return NextResponse.json({error:check.error},{status:400});

  const exists=(await sql<{id:number}[]>`SELECT id FROM guests WHERE id=${guestId} LIMIT 1`)[0];
  if(!exists) return NextResponse.json({error:"Guest not found"},{status:404});

  await sql.begin(async tx=>{
    await tx`DELETE FROM guest_roles WHERE guest_id=${guestId}`;
    for(let i=0;i<check.roles.length;i++){
      await tx`INSERT INTO guest_roles(guest_id,role_code,position) VALUES(${guestId},${check.roles[i]},${i+1})`;
    }
  });
  return NextResponse.json({ok:true,roles:check.roles});
}
