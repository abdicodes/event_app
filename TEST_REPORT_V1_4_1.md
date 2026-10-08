# v1.4.1 status compatibility fix

## Root cause
Older databases may retain `event_guests.status = 'ON_BREAK'` from versions before the scanner was simplified to CHECK_IN/CHECK_OUT. `StatusPill` indexed a three-state map with this legacy value, returned `undefined`, then attempted to read `.cls`, causing the dashboard SSR crash.

## Fixes
- Added `normalizeGuestStatus()` with `ON_BREAK -> INSIDE` compatibility.
- Made `StatusPill` accept runtime/legacy values safely instead of blindly indexing the status map.
- Normalized database status before scan transition logic.
- Normalized dashboard attendance rows before sorting/rendering.
- Whole-event and expired-event checkout queries include legacy `ON_BREAK` rows.
- Existing schema migration still permanently converts `ON_BREAK` rows to `INSIDE`.

## Verification
- Confirmed all `.cls` access now follows normalization.
- Confirmed legacy `ON_BREAK` is handled in UI, scan transition, attendance listing, automatic reconciliation, and whole-event checkout.
- Confirmed migration includes permanent `ON_BREAK -> INSIDE` repair.
- Full dependency-aware TypeScript/Next build could not be run in the artifact environment because `npm install` timed out before dependencies were available.
