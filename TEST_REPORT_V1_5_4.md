# GuestFlow v1.5.4 verification

## Requested changes

- Badge role labels use equal top/bottom padding and flex centering.
- Two role labels have an explicit small gap.
- Badge role and name CSS request `SuperX Sans` first.
- Supplied Global Sumud Flotilla logo is bundled as `/public/brand-logo.png` and used in staff/public site headers.
- Guest grouping field is now `region` in application queries, APIs, seed data and UI.
- Database migration copies legacy `delegation_wg` or `company` values into `region` before dropping the legacy columns.
- Staff guest directory includes a Delete action.
- Guest deletion API requires staff authentication and same-origin validation. Existing foreign keys use ON DELETE CASCADE for related role, event, attendance and poll records.

## Checks performed

- Parsed 73 TypeScript/TSX implementation files with the TypeScript parser: 0 syntax errors.
- `node --check` passed for all `.mjs` scripts.
- Search confirmed old `delegation_wg` references remain only in migration/import compatibility code.
- Verified the new logo asset exists in `public/brand-logo.png`.
- Verified `SuperX Sans` is the first requested family for both badge role and name CSS.
- Verified guest DELETE route has `requireStaffApi()` and `assertSameOrigin()` guards.

## Build limitation

A fresh `npm install` was attempted but the package registry did not complete within the execution timeout, so a dependency-aware `next build` could not be completed in this environment. Run `npm install && npm run db:migrate && npm run typecheck && npm run build` locally.

## Font note

The project requests `SuperX Sans` by family name in the web badge renderer. No licensed SuperX Sans font binary was supplied or bundled, so PDF generation continues to use a safe embedded fallback. Exact SuperX glyph rendering in generated PDFs requires the deployment to provide a licensed font resource through its own private font setup.
