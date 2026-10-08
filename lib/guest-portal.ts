import crypto from "node:crypto";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";

const COOKIE_NAME = "guestflow_guest";
const TTL_SECONDS = 4 * 60 * 60;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return value;
}

function sign(value:string){ return crypto.createHmac("sha256",secret()).update(value).digest("hex"); }
function equal(a:string,b:string){ const aa=Buffer.from(a); const bb=Buffer.from(b); return aa.length===bb.length && crypto.timingSafeEqual(aa,bb); }

export function createGuestPortalSession(guestId:number){
  const exp=Math.floor(Date.now()/1000)+TTL_SECONDS;
  const payload=`${guestId}:${exp}`;
  return `${payload}:${sign(payload)}`;
}

export function guestPortalCookieOptions(){
  const secure=process.env.SESSION_COOKIE_SECURE==="false"?false:process.env.SESSION_COOKIE_SECURE==="true"?true:process.env.NODE_ENV==="production";
  return {httpOnly:true,secure,sameSite:"lax" as const,path:"/",maxAge:TTL_SECONDS};
}

export async function currentPortalGuest(){
  const value=(await cookies()).get(COOKIE_NAME)?.value;
  if(!value) return null;
  const parts=value.split(":");
  if(parts.length!==3) return null;
  const guestId=Number(parts[0]); const exp=Number(parts[1]);
  if(!Number.isInteger(guestId)||guestId<1||!Number.isFinite(exp)||exp<Math.floor(Date.now()/1000)) return null;
  const payload=`${guestId}:${exp}`;
  if(!equal(sign(payload),parts[2])) return null;
  return (await sql<{id:number;name:string;region:string|null}[]>`SELECT id,name,region FROM guests WHERE id=${guestId} LIMIT 1`)[0] ?? null;
}

export const GUEST_PORTAL_COOKIE = COOKIE_NAME;
