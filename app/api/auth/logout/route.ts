import { NextResponse } from "next/server";
import { clearSessionCookie, requireStaffApi } from "@/lib/auth";
export async function POST() {
  if (!(await requireStaffApi())) return NextResponse.json({ ok:true });
  const response = NextResponse.json({ ok:true });
  const c = clearSessionCookie(); response.cookies.set(c.name,c.value,c.options);
  return response;
}
