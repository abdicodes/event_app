import { sql } from "@/lib/db";
import { extractBadgeCredential } from "@/lib/badge";
export type PublicGuest={id:number;name:string;region:string|null;badge_code:string;qr_token:string};
export async function resolveGuestCredential(raw:string){
  const c=extractBadgeCredential(raw);
  if(!c.token&&!c.badgeCode) return null;
  const rows=await sql<PublicGuest[]>`
    SELECT id,name,region,badge_code,qr_token FROM guests
    WHERE ${c.token?sql`qr_token=${c.token}`:sql`badge_code=${c.badgeCode}`}
    LIMIT 1
  `;
  return rows[0]??null;
}
