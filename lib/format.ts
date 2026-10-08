import { APP_TIME_ZONE } from "@/lib/timezone";

export function formatDuration(ms: number) {
  if (!ms) return "—";
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
export function formatTime(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12:false, timeZone:APP_TIME_ZONE }).format(new Date(value));
}
export function formatDateTime(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle:"medium", timeStyle:"short", timeZone:APP_TIME_ZONE }).format(new Date(value));
}
