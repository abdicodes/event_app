import { NextResponse } from "next/server";
import { assertSameOrigin, checkLoginRateLimit, resetLoginRateLimit, sessionCookie, staffPasswordMatches } from "@/lib/auth";

export async function POST(request: Request) {
  if (!(await assertSameOrigin(request))) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!(await checkLoginRateLimit(request))) return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.password !== "string" || !staffPasswordMatches(body.password)) return NextResponse.json({ error: "Incorrect staff password" }, { status: 401 });
  await resetLoginRateLimit(request);
  const response = NextResponse.json({ ok: true });
  const c = sessionCookie(); response.cookies.set(c.name, c.value, c.options);
  return response;
}
