import { NextResponse } from "next/server";
import { assertSameOrigin, requireStaffApi } from "@/lib/auth";
import { sql } from "@/lib/db";

function parseId(value:string){
  const id=Number(value);
  return Number.isInteger(id)&&id>0?id:null;
}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await requireStaffApi())) return NextResponse.json({error:"Staff login required"},{status:401});
  if(!(await assertSameOrigin(request))) return NextResponse.json({error:"Invalid request origin"},{status:403});
  const guestId=parseId((await params).id);
  if(!guestId) return NextResponse.json({error:"Invalid guest"},{status:400});
  const deleted=(await sql<{id:number;name:string}[]>`
    DELETE FROM guests WHERE id=${guestId} RETURNING id,name
  `)[0];
  if(!deleted) return NextResponse.json({error:"Guest not found"},{status:404});
  return NextResponse.json({ok:true,guest:deleted});
}
