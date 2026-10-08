# GuestFlow v1.4.2 targeted test report

## Requested changes

1. Event registration search removed.
2. Poll registration search removed.
3. Congress shows a Votes & polls entry whenever any poll is live.
4. Votes page still requires badge identification and returns only polls registered to that guest.
5. Event registration includes manual staff Check in for registered guests.

## Static/source checks performed

- Parsed all `app`, `components`, and `lib` TypeScript/TSX files with TypeScript 5.8.3 `transpileModule` diagnostics.
- Result: **63 files parsed, 0 syntax diagnostics**.
- Confirmed `EventGuestManager.tsx` contains no search input/state/filtering.
- Confirmed `PollParticipantManager.tsx` contains no guest search input/state/filtering.
- Confirmed `/congress` uses a global live-poll existence query and links to `/votes`.
- Confirmed `/votes` continues to identify the guest by QR/badge code before returning registered live ballots.
- Confirmed `POST /api/events/[id]/check-in` requires a staff session and same-origin request.
- Confirmed manual check-in uses the shared attendance transaction in `lib/attendance.ts`.
- Confirmed manual check-in rejects unregistered guests, ended events, duplicate/recent actions, and already-inside guests.
- Confirmed successful manual check-in records a normal `CHECK_IN` attendance log with scanner label `Manual staff check-in`.

## Dependency-aware build

A fresh `npm install` was attempted in the artifact environment but the npm registry request timed out. Therefore a full dependency-aware `npm run typecheck` / `npm run build` could not be completed here. Run the following locally or in CI/Vercel:

```bash
npm install
npm run db:migrate
npm run typecheck
npm run build
```

## Manual browser checks recommended

### Event registrations
- Open one event's **Manage registration** page.
- Verify there is no search field.
- Register a guest.
- Press **Check in** beside that guest.
- Verify status changes to **Inside** and the button becomes **Checked in**.
- Verify the dashboard shows the check-in and attendance log-derived timestamp.
- Pressing check-in again should not create another record.

### Poll registrations
- Open one poll's participants page.
- Verify there is no guest search field.
- Verify Register all, Unregister all, Delegation/WG registration and individual registration still work.

### Congress voting
- Keep all polls closed: `/congress` should not show Votes & polls.
- Open a poll: `/congress` should show Votes & polls without requiring prior badge identification.
- Open `/votes`, scan a registered badge: the guest name and eligible ballot should appear.
- Scan a valid but unregistered badge: no ballot should be returned.
