import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireStaffApi } from "@/lib/auth";
import { normalizeBadgeCode } from "@/lib/badge";

export async function GET(_request:Request,{params}:{params:Promise<{token:string}>}){
  if(!(await requireStaffApi())) return NextResponse.json({error:"Staff login required"},{status:401});
  const {token}=await params;
  const normalized=normalizeBadgeCode(token);
  const guest=(await sql<{badge_code:string}[]>`
    SELECT badge_code FROM guests
    WHERE qr_token=${token} OR badge_code=${normalized}
    LIMIT 1
  `)[0];
  if(!guest) return NextResponse.json({error:"Unknown badge"},{status:404});

  // The QR payload is deliberately only the guest's badge code. It contains
  // no URL, host name, route or personal data.
  const svg=await QRCode.toString(guest.badge_code,{type:"svg",margin:1,width:360,errorCorrectionLevel:"M"});
  return new NextResponse(svg,{headers:{"content-type":"image/svg+xml; charset=utf-8","cache-control":"private, max-age=300","x-content-type-options":"nosniff"}});
}
