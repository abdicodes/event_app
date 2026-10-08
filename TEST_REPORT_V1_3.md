# v1.3 refactor test report

Checks performed in the build workspace:

- PASS: all 61 TypeScript/TSX files parse with the TypeScript compiler API (0 syntax diagnostics).
- PASS: Node syntax checks for migration, seed and QR-generation scripts.
- PASS: active app source contains no `BREAK_OUT`, `BREAK_IN`, `ENTRY_RETURN` or `ON_BREAK` scan/state references.
- PASS: GMT+8 conversion test: `2026-10-07T10:00` local -> `2026-10-07T02:00:00.000Z`.
- PASS: QR URL token extraction still works for staff scanning.
- PASS: single-answer and multi-answer poll selection validation tests.
- PASS: static integration assertions for event bulk registration, poll bulk registration, protected auto-checkout, congress poll eligibility gating and GMT+8 labels.

Not completed in this workspace:

- `npm install`, `npm audit`, full `npm run typecheck`, and `npm run build` could not be completed because npm registry access timed out. Direct dependency versions were separately reviewed against current npm metadata and official Next.js/React security advisories. Run the commands in README on your local machine/CI before deployment.
