import type { RoleCode } from "./roles";
export type GuestStatus = "NOT_ARRIVED" | "INSIDE" | "CHECKED_OUT";
export type ScanMode = "CHECK_IN" | "CHECK_OUT";
export type AttendanceAction = "CHECK_IN" | "CHECK_OUT";

/**
 * Normalize database/runtime values into the three-state attendance model.
 * Older installations may still contain ON_BREAK from versions before v1.3.
 * Treat ON_BREAK as INSIDE so legacy data can never crash the UI or block
 * checkout operations while the migration catches up.
 */
export function normalizeGuestStatus(status: unknown): GuestStatus {
  if (status === "INSIDE" || status === "ON_BREAK") return "INSIDE";
  if (status === "CHECKED_OUT") return "CHECKED_OUT";
  return "NOT_ARRIVED";
}

export type Guest = {
  id: number;
  name: string;
  region: string | null;
  qr_token: string;
  badge_code: string;
  roles?: RoleCode[];
  created_at: string | Date;
};
