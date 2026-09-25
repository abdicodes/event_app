# GuestFlow — QR event attendance MVP

A small, modular Next.js application for event badge scanning. Staff scan a guest's QR code to record entry, breaks/returns and final exit, while the dashboard calculates time away and effective attendance.

## Included

- Staff-only scanner with mobile camera support
- Immediate duplicate/state feedback, including **Already checked in — no new record was created**
- Multi-event support with an **Events** page and event selector on the scanner
- Global guest directory: one guest and one persistent QR badge can be registered for many events
- Per-event registration page with independent attendance status for each guest/event pair
- Three clear scanner modes: **Entry / return**, **Break out**, **Final exit**
- PostgreSQL transaction + row locking to reduce conflicting scans from multiple devices
- 3-second server-side scan cooldown
- Random opaque QR tokens (no personal details stored in the QR)
- Global guest directory, manual guest creation and small CSV importer
- Persistent printable badge page independent of events
- Live multi-event dashboard ordered by most recent check-in activity
- Expandable event guest lists with currently attending guests first
- Arrival, away-time, effective attendance and final exit calculations
- Six seeded mock guests and matching test QR PNGs
- Signed HttpOnly staff session cookie, same-origin checks and DB-backed login throttling
- Vercel-ready build migration

## Stack

- Next.js 16 / React 19 / TypeScript
- PostgreSQL (Neon is convenient on Vercel; any normal PostgreSQL URL works)
- `postgres` for parameterized SQL
- `html5-qrcode` for browser camera scanning
- `qrcode` for badge generation
- Plain responsive CSS (no UI framework required)

## Project structure

```text
app/
  (staff)/
    dashboard/       multi-event live attendance
    events/          event creation/management
    scanner/         camera scanner + event selector
    guests/          global guest directory/import
    badges/          persistent printable guest badges
    events/[id]/guests/ per-event guest registrations
  api/
    auth/            login/logout
    attendance/scan  protected scan endpoint
    events/           create events + registration API
    guests/           add/import guests
    qr/              protected QR rendering
components/          reusable UI/client components
lib/
  attendance.ts      attendance state machine + transaction
  auth.ts            staff session/security helpers
  db.ts              PostgreSQL connection
  qr.ts              QR token extraction/validation
scripts/
  schema.sql         idempotent schema migration
  migrate.mjs        migration runner
  seed.mjs           demo guest seed
  generate-mock-qr.mjs
public/mock-qr/       generated test QR images
```


## Guest and event data model

Guests and QR badges are deliberately independent from events. `guests.qr_token` is persistent and unique. The many-to-many `event_guests` table registers an existing guest for an event and stores that guest's status for that event.

```text
guests
  id, name, delegation_wg, qr_token
       │
       └──── event_guests ──── events
             event_id
             guest_id
             status
```

A guest can therefore use the **same badge** at Event A, Event B and Event C. Scanning only succeeds when the guest is registered for the event selected on the scanner.

## 1. Local installation

Prerequisites: Node.js 20+ recommended, npm, Git and a PostgreSQL database.

```bash
git clone YOUR_REPOSITORY_URL
cd event-qr-attendance-mvp
npm install
cp .env.example .env.local
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
STAFF_PASSWORD=use-a-long-unique-password
SESSION_SECRET=put-a-long-random-secret-here
SESSION_COOKIE_SECURE=false
NEXT_PUBLIC_APP_NAME=GuestFlow
```

Generate a secret on macOS/Linux/Git Bash:

```bash
openssl rand -hex 32
```

Then initialize the database and mock data:

```bash
npm run db:migrate
npm run db:seed
npm run qr:generate
npm run dev
```

Open `http://localhost:3000` and sign in with `STAFF_PASSWORD`.

## 2. Test the scanner

The demo seed creates these badges:

- Amina Noor — `public/mock-qr/amina-noor.png`
- Leo Martin — `public/mock-qr/leo-martin.png`
- Sara Chen — `public/mock-qr/sara-chen.png`
- Omar Hassan — `public/mock-qr/omar-hassan.png`
- Maya Singh — `public/mock-qr/maya-singh.png`
- Daniel Kim — `public/mock-qr/daniel-kim.png`

A simple test sequence:

1. Open `/scanner` on a phone/tablet, select **Demo Event**, then select **Entry / return**.
2. Display `amina-noor.png` on another screen and scan it.
3. Expected: **Amina Noor — Checked in successfully**.
4. Scan Amina again while still in Entry / return mode.
5. Expected: **Amina Noor — Already checked in — no new record was created**.
6. Select **Break out**, scan Amina → **Break started**.
7. Select **Entry / return**, scan Amina → **Returned from break**.
8. Select **Final exit**, scan Amina → **Final checkout recorded**.
9. Open `/dashboard` to see arrival, away time and effective attendance.

The scanner also has a manual token box for desktop testing without a camera. Example:

```text
demo_AMINA_7M5dRWm7vFx2K9Pt
```

## 3. Put this folder into GitHub

Create an empty repository on GitHub, then from this project folder:

```bash
git init
git add .
git commit -m "Initial GuestFlow MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Do **not** commit `.env.local`; it is ignored by `.gitignore`.

## 4. Create a PostgreSQL database

### Recommended easy path: Neon

Create a Neon project/database and copy its PostgreSQL connection string. Keep it as `DATABASE_URL`.

You may also use Supabase PostgreSQL or another hosted PostgreSQL provider. Use a connection string suitable for a serverless application and SSL in production.

## 5. Import the GitHub repository into Vercel

1. Sign in to Vercel.
2. Choose **Add New → Project**.
3. Import the GitHub repository you just pushed.
4. Vercel should detect **Next.js** automatically.
5. Before deploying, add these Environment Variables for **Production** (and Preview if you want preview deployments to work):

```text
DATABASE_URL
STAFF_PASSWORD
SESSION_SECRET
NEXT_PUBLIC_APP_NAME=GuestFlow
```

6. Deploy.

The repository defines `vercel-build`, which runs the idempotent database migration before `next build`. The migration creates the tables and a default `Demo Event`. It does **not** create mock guests in production automatically. Do not set `SESSION_COOKIE_SECURE=false` on Vercel; omit it or set it to `true`.

## 6. Add mock guests to the deployed database (optional)

If you want the exact test data on the deployed Vercel site, clone the repository locally, set `DATABASE_URL` in `.env.local` to your hosted database URL, then run:

```bash
# macOS/Linux/Git Bash: load values into your shell or set DATABASE_URL directly
npm run db:seed
npm run qr:generate
```

`db:seed` is safe to run again because the mock QR tokens are unique and duplicates are skipped.

Alternatively, once deployed, log in and use **Guests** to add real guests or paste a small CSV.

## 7. Real event preparation

Before the event:

1. Open `/events` and create the event.
2. Open `/guests`, select that event, and import your guest list.
3. Import guests using:

```csv
name,delegation_wg
Alex Example,alex@example.com,Example Oy
Jamie Example,jamie@example.com,Another Co
```

4. Open `/badges`, select the event, and print the badge sheet.
5. Sign in on each staff scanning device and select the correct event from the scanner dropdown.
6. Test one complete Entry → Break → Return → Final exit sequence.
7. Confirm phone camera permission is allowed and the Vercel production URL uses HTTPS.

## Scanner behavior / state rules

| Current state | Entry / return | Break out | Final exit |
|---|---|---|---|
| Not arrived | Check in | Reject | Reject |
| Inside | **Warn: already checked in** | Start break | Check out |
| On break | Return from break | Warn: already on break | Check out |
| Checked out | Reject | Reject | Warn: already checked out |

The state transition runs on the server inside a PostgreSQL transaction. The guest row is locked with `FOR UPDATE`, then the action is validated, status is changed and an immutable attendance log row is inserted.

## Attendance calculation

The dashboard derives attendance from logs rather than storing a mutable total:

```text
Effective attendance = (first check-in → final exit/current time) − completed/current breaks
```

If a guest is currently on break, the current break duration is included in **Away** in real time.

## Security model

See `SECURITY.md` for details. Important points:

- Never put the guest's personal details directly in the QR. The QR is an opaque random token.
- Only staff sessions can call the scanner or QR-management endpoints.
- Attendance state changes are checked server-side; the browser cannot simply tell the DB that a guest is inside.
- Cookies are HttpOnly and SameSite=Strict; production cookies are Secure.
- Mutating endpoints check the browser Origin header.
- Login attempts are throttled in PostgreSQL.
- SQL values are parameterized.
- Repeated reads within 3 seconds are ignored.

For a larger event, replace the one shared staff password with individual staff accounts/SSO and role-based access.

## Operational notes

- Camera access requires HTTPS in normal mobile browsers; Vercel production domains provide HTTPS.
- The original `html5-qrcode` package is widely used but old. The app keeps the scanner adapter isolated in `components/ScannerClient.tsx`, so it can be swapped later without changing attendance logic.
- The CSV importer intentionally supports a small, simple comma-separated format. If names/companies can contain commas or you need thousands of guests, replace it with a proper CSV parser and background import process.
- `scanner_label` currently stores a shortened browser user-agent string for basic audit context. You can replace it with named scanner stations such as `North entrance iPad`.

## Useful commands

```bash
npm run dev          # local development
npm run build        # production build test
npm run db:migrate   # create/update schema
npm run db:seed      # insert six mock guests
npm run qr:generate  # create their PNG QR files
npm run setup:demo   # migrate + seed + QR generation
```
