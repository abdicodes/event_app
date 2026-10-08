# GuestFlow v1.5.3 badge fidelity checks

## Fixes

- Replaced approximate badge overlays with exact Figma artboard coordinates.
- Rebuilt all four background templates from the user-supplied 601 x 975 PNGs.
- Removed the sample role/name/QR from the stored backgrounds before runtime.
- Removed runtime white masks that previously covered/corrupted parts of the frame.
- QR position and dimensions are exactly x=15, y=145, 56x56 in design units.
- Name uses the Figma 16px / 100% / -0.02em metrics at x=15, y=105.48.
- Role uses the Figma 12px / 90% / -0.02em metrics at x=15, y=72.8/73.
- Two-role badges stack two role labels above the name while preserving the fixed name and QR positions.

## Checks run

- 71 TS/TSX files parsed with TypeScript parser: 0 syntax diagnostics.
- All four template PNGs are exactly 601 x 975.
- Dynamic-content regions in each stored template are white/clean (no sample QR underneath).
- Bottom frame pixels remain intact on all four templates.
- A reference PDF was rendered at 200 DPI to verify one QR only, intact bottom frame, and restored vertical spacing.

## Remaining font caveat

Figma specifies `NaN SuperX Sans Display`, weight 700. No licensed font file was supplied. Browser CSS requests that exact family first and falls back to Arial; PDF output uses Helvetica Bold. Exact glyph-shape matching requires the licensed font file to be supplied separately.
