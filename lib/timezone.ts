export const APP_TIME_ZONE = "Asia/Singapore";
export const APP_TIME_ZONE_LABEL = "GMT+8";

export function gmt8LocalInputToIso(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(trimmed)) return null;
  const iso = `${trimmed.length === 16 ? `${trimmed}:00` : trimmed}+08:00`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function formatGmt8DateTime(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(value));
}

export function formatGmt8Time(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: APP_TIME_ZONE,
  }).format(new Date(value));
}
