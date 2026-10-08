import { normalizeGuestStatus, type GuestStatus } from "@/lib/types";

const map: Record<GuestStatus, { label: string; cls: string }> = {
  NOT_ARRIVED: { label: "Not arrived", cls: "waiting" },
  INSIDE: { label: "Inside", cls: "inside" },
  CHECKED_OUT: { label: "Checked out", cls: "out" },
};

export default function StatusPill({ status }: { status: unknown }) {
  const normalized = normalizeGuestStatus(status);
  const s = map[normalized];
  return <span className={`pill ${s.cls}`}>{s.label}</span>;
}
