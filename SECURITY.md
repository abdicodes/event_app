# Security notes

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
