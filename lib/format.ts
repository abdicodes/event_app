<<<<<<< HEAD
=======
import { APP_TIME_ZONE } from "@/lib/timezone";

>>>>>>> 50ba541 (Updated project)
export function formatDuration(ms: number) {
  if (!ms) return "—";
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
export function formatTime(value: Date | string | null) {
  if (!value) return "—";
<<<<<<< HEAD
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
export function formatDateTime(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle:"medium", timeStyle:"short" }).format(new Date(value));
=======
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12:false, timeZone:APP_TIME_ZONE }).format(new Date(value));
}
export function formatDateTime(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle:"medium", timeStyle:"short", timeZone:APP_TIME_ZONE }).format(new Date(value));
>>>>>>> 50ba541 (Updated project)
}
