# GuestFlow v1.5.1 badge-code QR test report

## Requested behavior

- Newly generated QR codes contain only `badge_code` (example: `G-A1B2C3D4E5`).
- QR codes contain no URL, hostname, `/q/` route, guest name, or other personal data.
- The human-readable badge code is not drawn on printed/PDF badges.
- Staff management pages may still display the badge code for manual entry.
- Staff scanner and guest voting accept badge-code QR scans directly.
- Previously printed token/URL QR badges remain accepted for backwards compatibility.

## Automated checks completed

- All 6 bundled mock QR PNGs were decoded with OpenCV and returned exactly their badge codes; none decoded to a URL.
- All 70 TS/TSX implementation files passed parser-level TypeScript transpilation with 0 syntax errors.
- Node syntax checks passed for migration, seed, and QR generation scripts.

## Source checks

- `/api/qr/[token]` generates QR SVGs from `guest.badge_code` only.
- `lib/badge-pdf.ts` generates QR images from `guest.badge_code` only and contains no visible `drawText(guest.badge_code)` call.
- `BadgePreview` requests QR rendering using `badgeCode` rather than `qr_token`.
- `processScan` resolves the scanned credential through the shared guest credential resolver, supporting new badge codes and legacy token URLs.
- `scripts/generate-mock-qr.mjs` writes badge-code-only mock QR PNGs.
- `PUBLIC_APP_URL` is no longer required for badge generation.

## Local final verification

Run:

```bash
npm install
npm run db:migrate
npm run typecheck
npm run build
```

Then test one generated badge by scanning it with a generic QR reader. The decoded text should be exactly the badge code, for example:

```text
G-A1B2C3D4E5
```

It should not decode to an `http://` or `https://` URL.
