export type GuestStatus = "NOT_ARRIVED" | "INSIDE" | "ON_BREAK" | "CHECKED_OUT";
export type ScanMode = "ENTRY_RETURN" | "BREAK_OUT" | "CHECK_OUT";
export type AttendanceAction = "CHECK_IN" | "BREAK_OUT" | "BREAK_IN" | "CHECK_OUT";

export type Guest = {
  id: number;
  name: string;
  delegation_wg: string | null;
  qr_token: string;
  created_at: string | Date;
};
