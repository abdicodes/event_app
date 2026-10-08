import { sql } from "@/lib/db";

/**
 * Close every still-inside registration whose event end time has passed.
 * The checkout log is timestamped at the event's configured end time so
 * attendance duration does not depend on when reconciliation happens.
 */
export async function autoCheckoutExpiredEvents() {
  return sql.begin(async tx => {
    const due = await tx<{ event_id: number; guest_id: number; ends_at: Date }[]>`
      SELECT eg.event_id, eg.guest_id, e.ends_at
      FROM event_guests eg
      JOIN events e ON e.id=eg.event_id
      WHERE eg.status IN ('INSIDE','ON_BREAK')
        AND e.ends_at IS NOT NULL
        AND e.ends_at <= now()
      FOR UPDATE OF eg
    `;

    if (!due.length) return 0;

    for (const row of due) {
      await tx`
        INSERT INTO attendance_logs(event_id,guest_id,action,scanner_label,created_at)
        VALUES(${row.event_id},${row.guest_id},'CHECK_OUT','Automatic event end',${row.ends_at})
      `;
      await tx`
        UPDATE event_guests
        SET status='CHECKED_OUT',updated_at=now()
        WHERE event_id=${row.event_id} AND guest_id=${row.guest_id}
      `;
    }
    return due.length;
  });
}

/**
 * Manually check out every participant currently marked INSIDE for one event.
 * The checkout timestamp is the moment staff trigger the action.
 */
export async function checkoutWholeEvent(eventId: number) {
  return sql.begin(async tx => {
    const event = (await tx<{ id: number }[]>`
      SELECT id FROM events WHERE id=${eventId} LIMIT 1
    `)[0];
    if (!event) return { eventFound: false, checkedOut: 0 };

    const inside = await tx<{ guest_id: number }[]>`
      SELECT guest_id
      FROM event_guests
      WHERE event_id=${eventId} AND status IN ('INSIDE','ON_BREAK')
      FOR UPDATE
    `;

    if (!inside.length) return { eventFound: true, checkedOut: 0 };

    const checkedOutAt = new Date();
    for (const row of inside) {
      await tx`
        INSERT INTO attendance_logs(event_id,guest_id,action,scanner_label,created_at)
        VALUES(${eventId},${row.guest_id},'CHECK_OUT','Manual whole-event checkout',${checkedOutAt})
      `;
      await tx`
        UPDATE event_guests
        SET status='CHECKED_OUT', updated_at=now()
        WHERE event_id=${eventId} AND guest_id=${row.guest_id}
      `;
    }

    return { eventFound: true, checkedOut: inside.length };
  });
}
