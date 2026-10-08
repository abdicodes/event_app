# GuestFlow v1.4 focused verification

Changes in this revision:

- Removed the Vercel Cron configuration and `/api/cron/auto-checkout` route.
- Removed `CRON_SECRET` from `.env.example`.
- Added `POST /api/events/[id]/checkout-all`.
- Added a dashboard **Check out whole event** action.
- The bulk checkout only changes registrations currently in `INSIDE` state.
- The action writes one `CHECK_OUT` attendance log per affected guest with scanner label `Manual whole-event checkout`.
- The endpoint requires staff authentication and same-origin request validation.
- Existing event-end reconciliation through active staff pages remains in place.

Recommended local verification:

```bash
npm install
npm run typecheck
npm run build
```

Manual test:

1. Register two or more guests for one event.
2. Check some guests in and leave at least one guest `NOT_ARRIVED`.
3. On Dashboard, click **Check out whole event** and confirm.
4. Verify all previously `INSIDE` guests become `CHECKED_OUT`.
5. Verify `NOT_ARRIVED` guests remain unchanged.
6. Verify the button becomes disabled when the event has nobody inside.
7. Verify the attendance log contains one `CHECK_OUT` row per affected guest.
