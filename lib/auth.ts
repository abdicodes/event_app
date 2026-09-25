import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";

const COOKIE_NAME = "guestflow_staff";
const SESSION_TTL_SECONDS = 12 * 60 * 60;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return value;
}

function sign(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export function createSessionValue() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `staff:${expires}`;
  return `${payload}:${sign(payload)}`;
}

export function verifySessionValue(value?: string) {
  if (!value) return false;
  const parts = value.split(":");
  if (parts.length !== 3 || parts[0] !== "staff") return false;
  const expires = Number(parts[1]);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  const payload = `staff:${expires}`;
  return safeEqual(sign(payload), parts[2]);
}

export async function isStaffAuthenticated() {
  const store = await cookies();
  return verifySessionValue(store.get(COOKIE_NAME)?.value);
}

export async function requireStaff() {
  if (!(await isStaffAuthenticated())) redirect("/login");
}

export async function requireStaffApi() {
  const store = await cookies();
  return verifySessionValue(store.get(COOKIE_NAME)?.value);
}

function useSecureCookies() {
  if (process.env.SESSION_COOKIE_SECURE === "false") return false;
  if (process.env.SESSION_COOKIE_SECURE === "true") return true;
  return process.env.NODE_ENV === "production";
}

export function sessionCookie() {
  return {
    name: COOKIE_NAME,
    value: createSessionValue(),
    options: {
      httpOnly: true,
      secure: useSecureCookies(),
      sameSite: "strict" as const,
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    },
  };
}

export function clearSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    options: { httpOnly: true, secure: useSecureCookies(), sameSite: "strict" as const, path: "/", maxAge: 0 },
  };
}

export function staffPasswordMatches(candidate: string) {
  const expected = process.env.STAFF_PASSWORD ?? "";
  if (!expected || expected === "change-me-now") return false;
  return safeEqual(crypto.createHash("sha256").update(expected).digest("hex"), crypto.createHash("sha256").update(candidate).digest("hex"));
}

export async function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}

function hashIp(ip: string) {
  return crypto.createHmac("sha256", secret()).update(ip).digest("hex");
}

export async function checkLoginRateLimit(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = hashIp(ip);
  const rows = await sql<{ attempts: number; window_started: Date }[]>`
    INSERT INTO auth_attempts (ip_hash, attempts, window_started)
    VALUES (${key}, 1, now())
    ON CONFLICT (ip_hash) DO UPDATE SET
      attempts = CASE WHEN auth_attempts.window_started < now() - interval '15 minutes' THEN 1 ELSE auth_attempts.attempts + 1 END,
      window_started = CASE WHEN auth_attempts.window_started < now() - interval '15 minutes' THEN now() ELSE auth_attempts.window_started END
    RETURNING attempts, window_started
  `;
  return rows[0].attempts <= 8;
}

export async function resetLoginRateLimit(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  await sql`DELETE FROM auth_attempts WHERE ip_hash = ${hashIp(ip)}`;
}
