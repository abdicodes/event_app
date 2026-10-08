# GuestFlow v1.5 role/badge refactor test report

## Automated checks completed

- TypeScript parser check: all TS/TSX sources parse successfully.
- Node syntax: `scripts/seed.mjs`, `scripts/migrate.mjs`, and QR generation scripts parse successfully.
- Role rule unit checks: 10 cases passed, including one role, two roles, Delegate precedence, duplicate-role rejection, >2-role rejection, and Global Support + Local Support rejection.
- Supplied badge artwork mapping verified visually:
  - Delegate -> red
  - Global Support -> yellow
  - Local Support -> grey
  - Facilitator -> green
- A two-role Delegate + Facilitator badge was rendered against the supplied artwork to verify two separate role lines, green precedence, name placement and QR placement.
- Individual/all PDF routes are staff-authenticated and both use one badge page per guest.

## Environment limitation

A full `npm install` timed out in the build sandbox, so dependency-aware `npm run typecheck` / `next build` must be run locally or by Vercel. The source parser and pure role-logic tests passed.

## Manual end-to-end checklist

1. Run `npm run db:migrate` and verify existing guests show Delegate.
2. Add a Delegate-only guest; verify red badge.
3. Add Delegate + Facilitator; verify roles appear on two lines and badge is green.
4. Add Delegate + Global Support; verify yellow badge.
5. Add Local Support; verify grey badge.
6. Attempt Global Support + Local Support; verify the request is rejected.
7. Edit an existing guest from one role to two roles and refresh the badge page.
8. Download Individual PDF; verify exactly one badge page.
9. Download All badges PDF; verify every guest has one page.
10. Scan a generated QR with the staff scanner and with a guest phone to confirm the persistent QR still performs both functions.
