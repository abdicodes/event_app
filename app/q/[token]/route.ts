import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { createGuestPortalSession, guestPortalCookieOptions, GUEST_PORTAL_COOKIE } from "@/lib/guest-portal";

export async function GET(request:Request,{params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  const guest=(await sql<{id:number}[]>`SELECT id FROM guests WHERE qr_token=${token} LIMIT 1`)[0];
  const url=new URL("/congress",request.url);
  if(!guest) return NextResponse.redirect(url);
  const response=NextResponse.redirect(url);
  response.cookies.set(GUEST_PORTAL_COOKIE,createGuestPortalSession(guest.id),guestPortalCookieOptions());
  return response;
}
