# GuestFlow — QR attendance, congress programme and voting MVP

GuestFlow is a Next.js/PostgreSQL event system with reusable guest QR badges, staff attendance scanning, event registrations, a public congress programme, and registration-gated live voting.

## Public guest flow

The public congress page is available without scanning a badge:

```text
https://YOUR_DOMAIN/congress
```

It shows:
- **Activities of the day** — public schedule/timeline.
- **Live voting** — only while at least one poll is currently open.

When at least one poll is live, `/congress` shows **Votes & polls** to everyone. Opening it goes to `/votes`, where the participant must scan their own badge (or use the badge-code fallback). The server then returns only live polls for which that guest is registered, and the guest's name is shown above their ballots.

The printed badge QR contains **only the guest badge code** (for example `G-A1B2C3D4E5`). It contains no URL, domain name or personal data. Staff attendance scanning and guest voting identify the guest from that badge code. Previously printed legacy `/q/<token>` badges remain accepted for compatibility, but all newly generated badges use badge-code-only QR payloads.

## Poll answer rules

Staff can create:
- **One answer only** — exactly one selection.
- **Multiple answers** — staff define the minimum and maximum selections.

Both client and server validate the selection count. Final submissions are stored in `poll_submissions`, while individual selected answers are stored in `poll_votes`. This supports multiple answers while preserving one final submission per guest per poll.

## Staff poll management

Open:

```text
/polls
```

From there staff can:
- create polls;
- set opening/closing times;
- choose single- or multiple-answer rules;
- set min/max for multiple-answer polls;
- register individual guests or Region participants;
- delete polls.

Deleting a poll also removes its options, participant registrations, submissions and votes.

## Setup / upgrade

Keep your existing `.env.local`, then run:

```bash
npm install
npm run db:migrate
npm run typecheck
npm run build
```

The migration upgrades earlier poll data automatically:
- existing polls become `SINGLE`, min 1, max 1;
- the old one-row-per-poll vote restriction is replaced with one row per selected option;
- existing vote records are backfilled into `poll_submissions`.

For demo data:

```bash
npm run db:seed
npm run qr:generate
```

The seed creates both a single-answer demo poll and a multiple-answer demo poll.

## Environment variables

Typical `.env.local`:

```env
DATABASE_URL=postgresql://...
STAFF_PASSWORD=your-secure-password
SESSION_SECRET=your-long-random-secret
NEXT_PUBLIC_APP_NAME=GuestFlow
SESSION_COOKIE_SECURE=false
```

Use `SESSION_COOKIE_SECURE=false` only for local/LAN HTTP testing. On Vercel, remove it or set it to `true`.


## iPhone / mobile camera

Browser camera APIs require a secure context. On an iPhone, use the deployed HTTPS site (for example Vercel). A LAN URL such as `http://192.168.1.20:3000` can load the dashboard but Safari normally blocks camera access there.

## Final verification

See [`TEST_REPORT.md`](./TEST_REPORT.md) for automated checks and a manual end-to-end test sequence.

## v1.4 attendance / voting refactor

- Event attendance has only two scan modes: **Check in** and **Check out**.
- Event start/end inputs are interpreted as **GMT+8** and all event/poll timestamps are displayed in GMT+8.
- Event registrations now include **Register all participants** and **Unregister all participants**. Individual registered guests have an **×** unregister action. Guests with attendance history are protected from removal.
- When an event end time passes, active staff pages reconcile attendance every 60 seconds and dashboard/scanner requests also reconcile expired events. Automatic checkout logs use the configured event end time.
- Each dashboard event card also has a **Check out whole event** button. This manually checks out every participant currently marked `INSIDE` and records an auditable `CHECK_OUT` log at the moment staff trigger the action.
- The public `/congress` page is accessible without a badge and always exposes the programme. Whenever any poll is live, it shows a **Votes & polls** card; eligibility is checked only after the guest scans their badge on `/votes`.
- Poll participants can be registered/unregistered individually, by Region, or all at once. Guests with submitted votes are protected from unregistration.

### Event checkout

There is no Vercel Cron dependency. While a staff page is open, the application reconciles expired events every 60 seconds and also reconciles when dashboard/scanner requests are handled. Staff can additionally use **Check out whole event** on any event card to immediately check out everyone currently inside. Guests who never arrived are not changed.

### Security checks before deployment

Runtime packages are pinned in `package.json`. Run these after `npm install` creates/updates `package-lock.json`:

```bash
npm audit --omit=dev
npm run typecheck
npm run build
```

See `SECURITY_AUDIT.md` for the dependency review performed for this revision.

## v1.4.1 legacy attendance-status compatibility

Older databases can still contain `ON_BREAK` registrations from versions before the two-state scanner refactor. v1.4.1 normalizes legacy `ON_BREAK` to `INSIDE` at runtime and `npm run db:migrate` also permanently updates those rows. This prevents dashboard SSR crashes such as `Cannot read properties of undefined (reading 'cls')`.


## v1.4.2 registration usability changes

- Removed the non-working search boxes from both event registration and poll participant registration. Registered guests remain sorted first, followed by the rest of the guest directory.
- `/congress` now shows **Votes & polls** whenever at least one poll is currently live. The public page does not assume eligibility; `/votes` asks the participant to scan their badge and then shows only polls that guest is registered for.
- Event registration now includes a staff **Check in** button for each registered guest who is not currently inside. Manual check-ins use the same attendance transition rules, event-end checks, duplicate cooldown, database locking, and attendance logs as QR check-in.
- Guests already marked `INSIDE` display **Checked in** instead of allowing another manual check-in.

No database migration is required specifically for v1.4.2. After replacing the code, run:

```bash
npm install
npm run db:migrate
npm run typecheck
npm run build
```


## v1.5.1 badge-code-only QR payloads

- New QR codes encode only `badge_code` such as `G-A1B2C3D4E5`.
- QR payloads contain no URL, hostname, `/q/` route or guest name.
- Staff check-in/check-out and live voting resolve the scanned badge code directly.
- Legacy token/URL badges remain readable so old printed badges continue to work.
- The badge code remains visible in staff management screens for manual entry, but it is no longer printed as text on PDF badges.
- Mock QR images generated by `npm run qr:generate` also contain only badge codes.

## v1.5 guest roles and badge PDFs

Guests now have an ordered many-to-many relationship with four fixed roles:

- `DELEGATE` — red badge
- `GLOBAL_SUPPORT` — yellow badge
- `LOCAL_SUPPORT` — grey badge
- `FACILITATOR` — green badge

Every guest must have **one or two** roles. `GLOBAL_SUPPORT` and `LOCAL_SUPPORT` cannot be assigned together. When `DELEGATE` is combined with another role, the other role controls the badge colour. If two non-Delegate roles are intentionally used, Role 1 controls the badge colour. Both role labels are printed on separate lines.

Existing guests are migrated safely: any guest without a role receives `DELEGATE`.

### Badge artwork and PDF output

The `/badges` page uses the supplied Global Sumud Flotilla red/yellow/grey/green artwork as templates while replacing the sample role, name and QR with the real guest data.

Two PDF options are available:

- **Individual PDF** on each guest card — one badge, one PDF page.
- **Download all badges PDF** — one PDF containing every guest, one badge per page.

The short badge code is shown on the staff management page, but **is not printed as visible text on the badge PDF**. The QR itself contains that badge code only.

PDF generation uses `pdf-lib` 1.17.1 on the server. Badge generation no longer depends on `PUBLIC_APP_URL`.

### CSV role import

Preferred CSV header:

```csv
name,region,role_1,role_2
Jane Example,Working Group A,DELEGATE,FACILITATOR
Alex Example,Global Team,GLOBAL_SUPPORT,
```

The older `name,region` format remains accepted and defaults imported guests to Delegate.

### Upgrade

Run the database migration before opening the upgraded guest/badge pages:

```bash
npm install
npm run db:migrate
npm run typecheck
npm run build
```

The migration creates `roles` and `guest_roles`, installs deferred database checks for the one/two-role and Support-conflict rules, and assigns Delegate to existing guests.

## v1.5.3 badge fidelity fix

The badge renderer now follows the supplied Figma layout metrics rather than approximate overlay coordinates:

- artboard: 150.15 x 243.64
- content left: 15
- role top: 72.8/73, 12px, 90% line-height
- guest name top: 105.48, 16px, 100% line-height, 120px width
- QR: x=15, y=145, 56 x 56

The four supplied 601 x 975 PNGs are used as high-resolution pattern/logo backgrounds. Their sample role, sample name and sample QR are removed from the stored template itself, so only one generated QR can appear and the black frame is never covered by a runtime mask.

The browser requests the original Figma font family `NaN SuperX Sans Display`. The font file was not supplied with the project, so the CSS falls back to Arial when that family is unavailable. Server-generated PDFs use Helvetica Bold at the exact Figma sizes. For pixel-identical typography, supply a licensed web/PDF font file for NaN SuperX Sans Display.


## v1.5.4 changes

- Guest grouping is now **Region** throughout the app and database. The migration copies existing legacy Region/Company values into the new `region` column before removing the old field.
- Staff can delete a guest from the Guest directory. The confirmation warns that related event registrations, attendance logs, poll registrations, votes and role records are removed through database cascades.
- The supplied Global Sumud Flotilla logo is used in the staff header and public portal headers.
- Badge role labels now have equal top/bottom padding, vertically centered text and a small gap when a guest has two roles.
- Badge role/name CSS requests `SuperX Sans` first. The font itself is not bundled in this repository; production environments need a licensed SuperX Sans web/font asset if exact glyph rendering is required.
