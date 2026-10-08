# GuestFlow v1.5.5 manual patch

This patch does **not** change the database schema and does not require `db:migrate`.

## 1. Replace three components

Copy these files into your project, replacing the files with the same names:

- `components/ScheduleTimeline.tsx`
- `components/Nav.tsx`
- `components/ScannerClient.tsx`

## 2. Append the CSS

Open:

`app/globals.css`

Copy the complete contents of `styles-to-append.css` and paste it at the **very end** of `app/globals.css`.

Putting it at the end is important because it intentionally overrides some of the older mobile navigation and timeline rules.

## 3. What changes

### Schedule
- Past programme: grey.
- Programme happening now: green.
- Upcoming programme: blue.
- The green current dot pulses/expands and contracts.
- `prefers-reduced-motion` is respected.
- Schedule state is calculated in GMT+8 (`Asia/Singapore`).
- If an item has no end time, it is considered current until the next item starts. The final item without an end time stays current until midnight GMT+8.

### Staff navigation
- Above 900px: existing full navigation remains.
- 900px and below: full navigation is hidden and replaced by a compact logo + Menu button.
- The Menu button opens a dropdown containing all staff navigation items.

### Scanner
- After a successful scan, warning, or error, scanning is locked/paused.
- The page smoothly scrolls to the result panel.
- Staff must press `OK — next scan`.
- The scanner resumes and the page scrolls back to the camera.
- Event/mode/manual-input controls are disabled while confirmation is pending.
- A two-second same-QR guard prevents the badge still in front of the camera from immediately scanning again after OK.

## 4. Run checks

From the project root:

```bash
npm run typecheck
npm run build
```

Then run locally:

```bash
npm run dev -- --hostname 0.0.0.0
```

## 5. Quick functional test

1. Open `/schedule` and create one past, one currently active, and one future activity. Verify grey / pulsing green / blue states.
2. Resize the staff interface below 900px. Verify the normal nav disappears and the Menu dropdown appears.
3. Open `/scanner` on a phone over HTTPS. Scan a badge. Verify the browser scrolls to the result and refuses another scan until you press OK. Press OK and verify it returns to the camera.

No environment-variable or database changes are required.
