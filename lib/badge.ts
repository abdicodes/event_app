import { extractQrToken } from "./qr";

export function normalizeBadgeCode(value:string){return value.trim().toUpperCase().replace(/\s+/g,"");}

export function extractBadgeCredential(raw:string){
  const value=raw.trim();
  if(!value) return {token:null as string|null,badgeCode:null as string|null};

  // New badges contain only the short badge code.
  const badgeCode=normalizeBadgeCode(value);
  if(/^G-[A-F0-9]{10}$/.test(badgeCode)) return {token:null,badgeCode};

  // Compatibility with previously printed raw-token / URL badges.
  const token=extractQrToken(value);
  if(token) return {token,badgeCode:null};

  return {token:null,badgeCode:null};
}
