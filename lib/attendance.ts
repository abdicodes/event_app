import { sql } from "@/lib/db";
import { extractQrToken } from "@/lib/qr";
import type { AttendanceAction, GuestStatus, ScanMode } from "@/lib/types";

export class ScanError extends Error {
  constructor(public code: string, message: string, public status = 400, public guestName?: string) { super(message); }
}

function transition(status: GuestStatus, mode: ScanMode): { action: AttendanceAction; next: GuestStatus; message: string } {
  if (mode === "ENTRY_RETURN") {
    if (status === "NOT_ARRIVED") return { action: "CHECK_IN", next: "INSIDE", message: "Checked in successfully" };
    if (status === "ON_BREAK") return { action: "BREAK_IN", next: "INSIDE", message: "Returned from break" };
    if (status === "INSIDE") throw new ScanError("ALREADY_INSIDE", "Already checked in — no new record was created", 409);
    throw new ScanError("ALREADY_CHECKED_OUT", "This guest already completed final checkout for this event", 409);
  }
  if (mode === "BREAK_OUT") {
    if (status === "INSIDE") return { action: "BREAK_OUT", next: "ON_BREAK", message: "Break started" };
    if (status === "ON_BREAK") throw new ScanError("ALREADY_ON_BREAK", "Guest is already on break", 409);
    if (status === "NOT_ARRIVED") throw new ScanError("NOT_CHECKED_IN", "Guest has not checked in to this event yet", 409);
    throw new ScanError("ALREADY_CHECKED_OUT", "Guest already checked out of this event", 409);
  }
  if (status === "INSIDE" || status === "ON_BREAK") return { action: "CHECK_OUT", next: "CHECKED_OUT", message: "Final checkout recorded" };
  if (status === "CHECKED_OUT") throw new ScanError("ALREADY_CHECKED_OUT", "Guest already checked out of this event", 409);
  throw new ScanError("NOT_CHECKED_IN", "Guest has not checked in to this event yet", 409);
}

export async function processScan(rawToken: string, mode: ScanMode, scannerLabel: string, eventId: number) {
  const token = extractQrToken(rawToken);
  if (!token) throw new ScanError("INVALID_QR", "This QR code is not valid", 400);
  if (!Number.isInteger(eventId) || eventId < 1) throw new ScanError("INVALID_EVENT", "Select a valid event", 400);

  return sql.begin(async (tx) => {
    const event = (await tx<{ id:number; name:string }[]>`SELECT id,name FROM events WHERE id=${eventId} LIMIT 1`)[0];
    if (!event) throw new ScanError("INVALID_EVENT", "The selected event no longer exists", 404);

    // First identify the persistent badge globally.
    const globalGuest = (await tx<{ id:number; name:string }[]>`
      SELECT id,name FROM guests WHERE qr_token=${token} LIMIT 1
    `)[0];
    if (!globalGuest) throw new ScanError("UNKNOWN_GUEST", "QR code is not registered", 404);

    // Then lock this guest's registration/status for the selected event.
    const registration = (await tx<{ status:GuestStatus }[]>`
      SELECT status FROM event_guests
      WHERE event_id=${eventId} AND guest_id=${globalGuest.id}
      FOR UPDATE
    `)[0];
    if (!registration) {
      throw new ScanError(
        "NOT_REGISTERED_FOR_EVENT",
        "Guest is recognized, but is not registered for the selected event — no record was created",
        409,
        globalGuest.name
      );
    }

    const recent = await tx<{ created_at: Date }[]>`
      SELECT created_at FROM attendance_logs
      WHERE event_id=${eventId} AND guest_id=${globalGuest.id}
      ORDER BY created_at DESC LIMIT 1
    `;
    if (recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < 3000) {
      throw new ScanError("SCAN_COOLDOWN", "Badge was just scanned — ignored to prevent a duplicate", 429, globalGuest.name);
    }

    let next;
    try { next = transition(registration.status, mode); }
    catch (error) {
      if (error instanceof ScanError) error.guestName = globalGuest.name;
      throw error;
    }

    await tx`
      UPDATE event_guests
      SET status=${next.next}, updated_at=now()
      WHERE event_id=${eventId} AND guest_id=${globalGuest.id}
    `;
    const logs = await tx<{ created_at: Date }[]>`
      INSERT INTO attendance_logs (event_id, guest_id, action, scanner_label)
      VALUES (${eventId}, ${globalGuest.id}, ${next.action}, ${scannerLabel.slice(0,80)})
      RETURNING created_at
    `;
    return {
      ok: true,
      event: { id: event.id, name: event.name },
      guest: { id: globalGuest.id, name: globalGuest.name, status: next.next },
      action: next.action,
      message: next.message,
      timestamp: logs[0].created_at,
    };
  });
}

export async function guestAttendanceRows(eventId: number) {
  const guests = await sql<{ id:number; name:string; delegation_wg:string|null; status:GuestStatus; qr_token:string }[]>`
    SELECT g.id,g.name,g.delegation_wg,eg.status,g.qr_token
    FROM event_guests eg
    JOIN guests g ON g.id=eg.guest_id
    WHERE eg.event_id=${eventId}
    ORDER BY g.name
  `;
  const logs = await sql<{ guest_id:number; action:AttendanceAction; created_at:Date }[]>`
    SELECT guest_id,action,created_at FROM attendance_logs WHERE event_id=${eventId} ORDER BY created_at
  `;

  const rows = guests.map((g) => {
    const gl = logs.filter((l) => l.guest_id === g.id);
    const checkIn = gl.find((l) => l.action === "CHECK_IN")?.created_at ?? null;
    const checkout = [...gl].reverse().find((l) => l.action === "CHECK_OUT")?.created_at ?? null;
    const lastActivity = gl.length ? gl[gl.length - 1].created_at : null;
    let awayMs = 0;
    let breakStart: Date | null = null;
    for (const l of gl) {
      if (l.action === "BREAK_OUT") breakStart = new Date(l.created_at);
      if (l.action === "BREAK_IN" && breakStart) { awayMs += new Date(l.created_at).getTime() - breakStart.getTime(); breakStart = null; }
    }
    if (breakStart) awayMs += Date.now() - breakStart.getTime();
    const end = checkout ?? (checkIn ? new Date() : null);
    const attendanceMs = checkIn && end ? Math.max(0, end.getTime() - new Date(checkIn).getTime() - awayMs) : 0;
    return { ...g, checkIn, checkout, lastActivity, awayMs, attendanceMs };
  });

  const statusRank: Record<GuestStatus, number> = { INSIDE: 0, ON_BREAK: 1, CHECKED_OUT: 2, NOT_ARRIVED: 3 };
  return rows.sort((a,b) => {
    const rankDiff = statusRank[a.status] - statusRank[b.status];
    if (rankDiff) return rankDiff;
    const at = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
    const bt = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
    if (bt !== at) return bt - at;
    return a.name.localeCompare(b.name);
  });
}
