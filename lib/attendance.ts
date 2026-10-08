import { sql } from "@/lib/db";
import { autoCheckoutExpiredEvents } from "@/lib/events";
import { extractBadgeCredential } from "@/lib/badge";
import { normalizeGuestStatus, type AttendanceAction, type GuestStatus, type ScanMode } from "@/lib/types";

export class ScanError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public guestName?: string,
    public details?: { guestId?: number; eventId?: number },
  ) {
    super(message);
  }
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

async function recordAttendanceForCredential(
  rawCredential: string,
  mode: ScanMode,
  scannerLabel: string,
  eventId: number,
) {
  if (!Number.isInteger(eventId) || eventId < 1) {
    throw new ScanError("INVALID_EVENT", "Select a valid event", 400, undefined, { eventId });
  }

  const credential = extractBadgeCredential(rawCredential);
  if (!credential.token && !credential.badgeCode) {
    throw new ScanError("UNKNOWN_GUEST", "QR code or badge code is not registered", 404, undefined, { eventId });
  }

  return sql.begin(async (tx) => {
    const event = (await tx<{ id: number; name: string; starts_at: Date | null; ends_at: Date | null }[]>`
      SELECT id,name,starts_at,ends_at
      FROM events
      WHERE id=${eventId}
      LIMIT 1
    `)[0];

    if (!event) {
      throw new ScanError("INVALID_EVENT", "The selected event no longer exists", 404, undefined, { eventId });
    }

    if (event.ends_at && new Date(event.ends_at).getTime() <= Date.now()) {
      throw new ScanError("EVENT_ENDED", "This event has ended and cannot accept new check-ins.", 409, undefined, { eventId });
    }

    // Registration is now the primary lookup. A successful scan must match both
    // the scanned credential and the selected event in event_guests.
    let guest: { id:number; name:string; status:unknown } | undefined;
    if (credential.badgeCode) {
      guest = (await tx<{ id:number; name:string; status:unknown }[]>`
        SELECT g.id,g.name,eg.status
        FROM event_guests eg
        JOIN guests g ON g.id=eg.guest_id
        WHERE eg.event_id=${eventId}
          AND g.badge_code=${credential.badgeCode}
        LIMIT 1
        FOR UPDATE OF eg
      `)[0];
    } else if (credential.token) {
      guest = (await tx<{ id:number; name:string; status:unknown }[]>`
        SELECT g.id,g.name,eg.status
        FROM event_guests eg
        JOIN guests g ON g.id=eg.guest_id
        WHERE eg.event_id=${eventId}
          AND g.qr_token=${credential.token}
        LIMIT 1
        FOR UPDATE OF eg
      `)[0];
    }

    if (!guest) {
      let knownGuest: { id:number; name:string } | undefined;
      if (credential.badgeCode) {
        knownGuest = (await tx<{ id:number; name:string }[]>`
          SELECT id,name FROM guests WHERE badge_code=${credential.badgeCode} LIMIT 1
        `)[0];
      } else if (credential.token) {
        knownGuest = (await tx<{ id:number; name:string }[]>`
          SELECT id,name FROM guests WHERE qr_token=${credential.token} LIMIT 1
        `)[0];
      }

      if (knownGuest) {
        throw new ScanError(
          "NOT_REGISTERED_FOR_EVENT",
          "Guest is recognized, but is not registered for the selected event — no record was created",
          409,
          knownGuest.name,
          { guestId: knownGuest.id, eventId },
        );
      }

      throw new ScanError("UNKNOWN_GUEST", "QR code or badge code is not registered", 404, undefined, { eventId });
    }

    const recent = await tx<{ created_at: Date }[]>`
      SELECT created_at
      FROM attendance_logs
      WHERE event_id=${eventId} AND guest_id=${guest.id}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < 3000) {
      throw new ScanError(
        "SCAN_COOLDOWN",
        "This guest was just updated — ignored to prevent a duplicate",
        429,
        guest.name,
        { guestId: guest.id, eventId },
      );
    }

    let next;
    try {
      next = transition(normalizeGuestStatus(guest.status), mode);
    } catch (error) {
      if (error instanceof ScanError) {
        error.guestName = guest.name;
        error.details = { guestId: guest.id, eventId };
      }
      throw error;
    }

    await tx`
      UPDATE event_guests
      SET status=${next.next}, updated_at=now()
      WHERE event_id=${eventId} AND guest_id=${guest.id}
    `;

    const logs = await tx<{ created_at: Date }[]>`
      INSERT INTO attendance_logs(event_id, guest_id, action, scanner_label)
      VALUES(${eventId}, ${guest.id}, ${next.action}, ${scannerLabel.slice(0,80)})
      RETURNING created_at
    `;

    return {
      ok: true,
      event: { id: event.id, name: event.name },
      guest: { id: guest.id, name: guest.name, status: next.next },
      action: next.action,
      message: next.message,
      timestamp: logs[0].created_at,
    };
  });
}

async function recordAttendanceForGuestId(
  guestId: number,
  mode: ScanMode,
  scannerLabel: string,
  eventId: number,
) {
  if (!Number.isInteger(eventId) || eventId < 1) throw new ScanError("INVALID_EVENT", "Select a valid event", 400);
  if (!Number.isInteger(guestId) || guestId < 1) throw new ScanError("UNKNOWN_GUEST", "Guest is not registered", 404);

  return sql.begin(async (tx) => {
    const row = (await tx<{ id:number; name:string; status:unknown; event_name:string; ends_at:Date|null }[]>`
      SELECT g.id,g.name,eg.status,e.name AS event_name,e.ends_at
      FROM event_guests eg
      JOIN guests g ON g.id=eg.guest_id
      JOIN events e ON e.id=eg.event_id
      WHERE eg.event_id=${eventId} AND eg.guest_id=${guestId}
      FOR UPDATE OF eg
    `)[0];

    if (!row) throw new ScanError("NOT_REGISTERED_FOR_EVENT", "Guest is not registered for this event", 409, undefined, {guestId,eventId});
    if (row.ends_at && new Date(row.ends_at).getTime() <= Date.now()) throw new ScanError("EVENT_ENDED", "This event has ended and cannot accept new check-ins.", 409, row.name, {guestId,eventId});

    let next;
    try { next = transition(normalizeGuestStatus(row.status), mode); }
    catch (error) {
      if (error instanceof ScanError) { error.guestName=row.name; error.details={guestId,eventId}; }
      throw error;
    }

    const recent = await tx<{ created_at:Date }[]>`
      SELECT created_at FROM attendance_logs
      WHERE event_id=${eventId} AND guest_id=${guestId}
      ORDER BY created_at DESC LIMIT 1
    `;
    if(recent[0] && Date.now()-new Date(recent[0].created_at).getTime()<3000){
      throw new ScanError("SCAN_COOLDOWN","This guest was just updated — ignored to prevent a duplicate",429,row.name,{guestId,eventId});
    }

    await tx`UPDATE event_guests SET status=${next.next},updated_at=now() WHERE event_id=${eventId} AND guest_id=${guestId}`;
    const logs=await tx<{created_at:Date}[]>`
      INSERT INTO attendance_logs(event_id,guest_id,action,scanner_label)
      VALUES(${eventId},${guestId},${next.action},${scannerLabel.slice(0,80)}) RETURNING created_at
    `;
    return {ok:true,event:{id:eventId,name:row.event_name},guest:{id:guestId,name:row.name,status:next.next},action:next.action,message:next.message,timestamp:logs[0].created_at};
  });
}

export async function processScan(rawCredential: string, mode: ScanMode, scannerLabel: string, eventId: number) {
  await autoCheckoutExpiredEvents();
  return recordAttendanceForCredential(rawCredential, mode, scannerLabel, eventId);
}

export async function processManualCheckIn(guestId: number, eventId: number) {
  await autoCheckoutExpiredEvents();
  return recordAttendanceForGuestId(guestId, "CHECK_IN", "Manual staff check-in", eventId);
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
