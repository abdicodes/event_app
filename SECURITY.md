# Security notes

<<<<<<< HEAD
This MVP is designed for a small staffed event, not for high-assurance identity verification.

Implemented safeguards:
- Guest QR codes contain random opaque tokens, not names/emails.
- Scanning and badge management require an authenticated staff session.
- Sessions are signed using HMAC-SHA256 and stored in HttpOnly, SameSite=Strict cookies; production cookies are Secure.
- State-changing browser requests are origin checked.
- Login attempts are rate-limited in PostgreSQL using a keyed hash of the source IP rather than storing the raw IP.
- Attendance transitions are validated on the server.
- Guest rows are locked in a PostgreSQL transaction while scanning to reduce race-condition duplicates across multiple devices.
- A 3-second server-side scan cooldown rejects repeated reads of the same badge.
- Database queries use parameterized SQL.

Before a real event:
1. Set a strong unique STAFF_PASSWORD and 32+ byte SESSION_SECRET.
2. Keep DATABASE_URL and secrets only in `.env.local` / Vercel Environment Variables; never commit them.
3. Use only HTTPS in production (Vercel provides HTTPS).
4. Give staff accounts/devices only to trusted operators.
5. Delete demo guests/tokens before the real event.
6. Review your event's privacy notice and retention period because attendance logs are personal data.

For larger/public events, replace the shared password with individual staff accounts (Auth.js, Clerk, or your organization's SSO), add role-based access, audit logs, backup/retention policies, and stronger operational monitoring.

## Multi-event isolation

Every attendance scan includes an explicit event ID selected by staff. The server checks that the selected event exists and that the QR token belongs to a guest registered for that event. A badge from another event is rejected with no attendance record created.

## Persistent badges and event authorization

A QR token identifies a guest globally; it does **not** grant access to every event. The scan endpoint looks up the badge and separately verifies a row in `event_guests` for the event selected by staff. If no registration exists, the server returns `NOT_REGISTERED_FOR_EVENT` and creates no attendance log. Attendance status is stored on the guest/event registration rather than on the global guest record.
=======
## Staff attendance scanning

Staff attendance endpoints require the signed staff session and same-origin requests. The server, not the scanner browser, validates the selected event, badge token and allowed attendance transition.

## Public congress page

`/congress` and `/schedule` are intentionally public and contain no private guest directory data.

## Voting identity

Voting is possession-based in this MVP: the QR badge or printed badge code acts as the credential. The server resolves that credential and returns only live polls to which that guest is registered. The client cannot choose a different guest ID or bypass the registration lookup.

A photographed/copied badge could therefore impersonate a participant. For higher-assurance elections, add a second factor such as a guest PIN, staff activation, signed one-time voting credential, or another identity-verification step.

## Voting integrity

The server validates:
- guest badge identity;
- poll participant registration;
- poll opening/closing window;
- selected options belonging to the poll;
- single/multiple selection count rules.

`poll_submissions` has a `(poll_id, guest_id)` primary key, providing a database-level one-submission-per-poll guarantee. Individual selections use a unique `(poll_id, guest_id, option_id)` index.

## Poll deletion

Poll deletion is staff-authenticated and same-origin protected. Related options, participant registrations, submissions and vote rows are removed through database cascades.

## Production transport

Use HTTPS in production. Keep secure cookies enabled on Vercel/production. Do not commit `.env.local`, `DATABASE_URL`, `STAFF_PASSWORD`, or `SESSION_SECRET` to Git.
>>>>>>> 50ba541 (Updated project)
