import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireStaffApi } from "@/lib/auth";

export async function GET(_:Request,{params}:{params:Promise<{token:string}>}){
  if(!(await requireStaffApi())) return NextResponse.json({error:"Staff login required"},{status:401});
  const {token}=await params;
  const guest=(await sql<{qr_token:string}[]>`SELECT qr_token FROM guests WHERE qr_token=${token} LIMIT 1`)[0];
  if(!guest) return NextResponse.json({error:"Unknown badge"},{status:404});
  const svg=await QRCode.toString(guest.qr_token,{type:"svg",margin:1,width:360,errorCorrectionLevel:"M"});
  return new NextResponse(svg,{headers:{"content-type":"image/svg+xml; charset=utf-8","cache-control":"private, max-age=300","x-content-type-options":"nosniff"}});
}
