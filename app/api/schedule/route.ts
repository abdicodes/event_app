import { NextResponse } from "next/server";
import { assertSameOrigin, requireStaffApi } from "@/lib/auth";
import { sql } from "@/lib/db";
import { parseScheduleInput } from "@/lib/schedule";
export async function POST(request:Request){if(!(await requireStaffApi()))return NextResponse.json({error:"Staff login required"},{status:401});if(!(await assertSameOrigin(request)))return NextResponse.json({error:"Invalid request origin"},{status:403});const parsed=parseScheduleInput(await request.json().catch(()=>({})));if(!parsed.value)return NextResponse.json({error:parsed.error},{status:400});const v=parsed.value;const rows=await sql`INSERT INTO schedule_items(day,start_time,end_time,title,description,location) VALUES(${v.day},${v.start},${v.end},${v.title},${v.description},${v.location}) RETURNING id`;return NextResponse.json({item:rows[0]},{status:201});}
