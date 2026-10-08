# Refactor test report

This report covers the public congress portal and upgraded voting refactor.

## Automated checks completed

### Public congress portal
- PASS: `/congress` exists and is public.
- PASS: schedule is available without badge identification.
- PASS: the live-voting card is rendered only when at least one poll is currently open.
- PASS: badge QR landing `/q/<token>` redirects to `/congress`.
- PASS: unauthenticated `/` redirects to `/congress`; authenticated staff still go to `/dashboard`.

### Badge scanning / guest identification
- PASS: staff scanner parser still accepts `/q/<token>` URLs.
- PASS: staff scanner parser still accepts legacy/raw badge tokens.
- PASS: guest voting uses `html5-qrcode` with the rear camera.
- PASS: the public voting API resolves the scanned QR/token server-side.
- PASS: the identified guest name is returned and displayed on the ballot page.
- PASS: only polls registered to that guest are returned.
- PASS: only polls whose voting window is live are returned.

### Single and multiple-answer polls
Unit tests executed against `lib/polls.ts`:
- PASS: single-answer polls force min=1 and max=1.
- PASS: a valid multiple-answer 2–3 range is accepted.
- PASS: maximum selections greater than the number of options is rejected.
- PASS: single-answer submission with two options is rejected.
- PASS: multiple-answer submission with two selections in a 2–3 range is accepted.
- PASS: multiple-answer submission below the minimum is rejected.
- PASS: open/future poll time-window logic behaves correctly.

### Voting integrity
- PASS: server validates min/max selection counts again; client validation is not trusted.
- PASS: selected option IDs must belong to the requested poll.
- PASS: participation registration is checked server-side.
- PASS: live start/end window is checked server-side.
- PASS: `poll_submissions` enforces one final submission per guest per poll.
- PASS: `poll_votes` supports multiple selected options for a multi-answer poll.

### Poll administration
- PASS: staff poll form includes `One answer only` and `Multiple answers`.
- PASS: multiple-answer creation includes minimum and maximum selection inputs.
- PASS: server validates min/max against the number of poll options.
- PASS: a staff-authenticated DELETE route exists for polls.
- PASS: poll deletion cascades to options, participant registrations, submissions and votes.

### Source checks
- PASS: all 55 TypeScript/TSX files parse with the TypeScript compiler API with zero syntax diagnostics.
- PASS: Node syntax check passed for the updated seed script.
- PASS: 17/17 integration source-wiring assertions passed.

## Full build limitation in this environment

A fresh `npm install --no-audit --no-fund` was attempted, but the package registry request timed out in the sandbox. Because dependencies were not available locally, a dependency-aware `npm run typecheck` / `npm run build` could not be executed here.

Run these final checks on your development machine after extracting the project:

```bash
npm install
npm run db:migrate
npm run typecheck
npm run build
```

Then test the camera over HTTPS (for example, on the Vercel deployment), because iPhone camera access is blocked on ordinary LAN `http://192.168.x.x` origins.

## Manual end-to-end test

1. Run `npm run db:migrate` and `npm run db:seed`.
2. Open `/congress` without logging in; confirm the schedule card is visible.
3. With the seeded live polls, confirm the Live voting card is visible.
4. Open Live voting and press Start camera.
5. Scan Amina's seeded QR badge; confirm `Voting as Amina Noor` appears.
6. Confirm Amina sees both seeded polls (one single-answer and one multiple-answer).
7. Submit one option on the single-answer poll.
8. On the multiple-answer poll, confirm the submit button stays disabled below the minimum and accepts 2–3 options.
9. Attempt a second submission to the same poll; confirm it is rejected/already submitted.
10. Scan a guest not registered for any live poll; confirm their badge is recognized but no ballot is revealed.
11. Log in as staff, open `/polls`, create a multiple-answer poll, set min/max, register participants, then delete the poll.
12. Confirm the deleted poll disappears and no longer appears to participants.
