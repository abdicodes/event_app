import { sql } from "@/lib/db";
import { autoCheckoutExpiredEvents } from "@/lib/events";
import { resolveGuestCredential } from "@/lib/guest-access";
import { normalizeGuestStatus, type AttendanceAction, type GuestStatus, type ScanMode } from "@/lib/types";

export class ScanError extends Error {
  constructor(public code: string, message: string, public status = 400, public guestName?: string) { super(message); }
}

function transition(status: GuestStatus, mode: ScanMode): { action: AttendanceAction; next: GuestStatus; message: string } {
  if (mode === "CHECK_IN") {
    if (status === "NOT_ARRIVED" || status === "CHECKED_OUT") {
      return { action: "CHECK_IN", next: "INSIDE", message: "Checked in successfully" };
    }
    throw new ScanError("ALREADY_INSIDE", "Already checked in — no new record was created", 409);
  }

  if (status === "INSIDE") return { action: "CHECK_OUT", next: "CHECKED_OUT", message: "Checked out successfully" };
  if (status === "CHECKED_OUT") throw new ScanError("ALREADY_CHECKED_OUT", "Guest is already checked out", 409);
  throw new ScanError("NOT_CHECKED_IN", "Guest has not checked in to this event yet", 409);
}

async function recordAttendanceForGuest(guestId: number, mode: ScanMode, scannerLabel: string, eventId: number) {
  if (!Number.isInteger(eventId) || eventId < 1) throw new ScanError("INVALID_EVENT", "Select a valid event", 400);
  if (!Number.isInteger(guestId) || guestId < 1) throw new ScanError("UNKNOWN_GUEST", "Guest is not registered", 404);

  return sql.begin(async (tx) => {
    const event = (await tx<{ id:number; name:string; starts_at:Date|null; ends_at:Date|null }[]>`
      SELECT id,name,starts_at,ends_at FROM events WHERE id=${eventId} LIMIT 1
    `)[0];
    if (!event) throw new ScanError("INVALID_EVENT", "The selected event no longer exists", 404);
    if (event.ends_at && new Date(event.ends_at).getTime() <= Date.now()) {
      throw new ScanError("EVENT_ENDED", "This event has ended and cannot accept new check-ins.", 409);
    }

    const globalGuest = (await tx<{ id:number; name:string }[]>`
      SELECT id,name FROM guests WHERE id=${guestId} LIMIT 1
    `)[0];
    if (!globalGuest) throw new ScanError("UNKNOWN_GUEST", "Guest is not registered", 404);

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
      throw new ScanError("SCAN_COOLDOWN", "This guest was just updated — ignored to prevent a duplicate", 429, globalGuest.name);
    }

    let next;
    try { next = transition(normalizeGuestStatus(registration.status), mode); }
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

export async function processScan(rawCredential: string, mode: ScanMode, scannerLabel: string, eventId: number) {
  await autoCheckoutExpiredEvents();
  // New badges encode only badge_code. resolveGuestCredential also accepts
  // legacy raw tokens / old /q/<token> URLs so previously printed badges keep working.
  const guest = await resolveGuestCredential(rawCredential);
  if (!guest) throw new ScanError("UNKNOWN_GUEST", "QR code or badge code is not registered", 404);
  return recordAttendanceForGuest(guest.id, mode, scannerLabel, eventId);
}

export async function processManualCheckIn(guestId: number, eventId: number) {
  await autoCheckoutExpiredEvents();
  return recordAttendanceForGuest(guestId, "CHECK_IN", "Manual staff check-in", eventId);
}

export async function guestAttendanceRows(eventId: number) {
  await autoCheckoutExpiredEvents();
  const guests = await sql<{ id:number; name:string; region:string|null; status:GuestStatus; qr_token:string }[]>`
    SELECT g.id,g.name,g.region,eg.status,g.qr_token
    FROM event_guests eg
    JOIN guests g ON g.id=eg.guest_id
    WHERE eg.event_id=${eventId}
    ORDER BY g.name
  `;
  const logs = await sql<{ guest_id:number; action:AttendanceAction; created_at:Date }[]>`
    SELECT guest_id,action,created_at
    FROM attendance_logs
    WHERE event_id=${eventId} AND action IN ('CHECK_IN','CHECK_OUT')
    ORDER BY created_at
  `;

  const rows = guests.map((g) => {
    const gl = logs.filter((l) => l.guest_id === g.id);
    const checkIns = gl.filter(l => l.action === "CHECK_IN");
    const checkOuts = gl.filter(l => l.action === "CHECK_OUT");
    const checkIn = checkIns[0]?.created_at ?? null;
    const checkout = checkOuts.length ? checkOuts[checkOuts.length - 1].created_at : null;
    const lastActivity = gl.length ? gl[gl.length - 1].created_at : null;

    let attendanceMs = 0;
    let openCheckIn: Date | null = null;
    for (const log of gl) {
      if (log.action === "CHECK_IN") openCheckIn = new Date(log.created_at);
      if (log.action === "CHECK_OUT" && openCheckIn) {
        attendanceMs += Math.max(0, new Date(log.created_at).getTime() - openCheckIn.getTime());
        openCheckIn = null;
      }
    }
    if (openCheckIn) attendanceMs += Math.max(0, Date.now() - openCheckIn.getTime());

    return { ...g, status: normalizeGuestStatus(g.status), checkIn, checkout, lastActivity, attendanceMs };
  });

  const statusRank: Record<GuestStatus, number> = { INSIDE: 0, CHECKED_OUT: 1, NOT_ARRIVED: 2 };
  return rows.sort((a,b) => {
    const rankDiff = statusRank[a.status] - statusRank[b.status];
    if (rankDiff) return rankDiff;
    const at = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
    const bt = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
    if (bt !== at) return bt - at;
    return a.name.localeCompare(b.name);
  });
}
