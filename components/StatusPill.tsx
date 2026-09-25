import type { GuestStatus } from "@/lib/types";
const map: Record<GuestStatus, { label: string; cls: string }> = {
  NOT_ARRIVED: { label: "Not arrived", cls: "waiting" },
  INSIDE: { label: "Inside", cls: "inside" },
  ON_BREAK: { label: "On break", cls: "break" },
  CHECKED_OUT: { label: "Checked out", cls: "out" },
};
export default function StatusPill({ status }: { status: GuestStatus }) {
  const s = map[status];
  return <span className={`pill ${s.cls}`}>{s.label}</span>;
}
