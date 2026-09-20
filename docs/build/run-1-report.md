# WingGap RUN 1 — TRUTH LAYER Report

## Status
RUN 1 PASSED

## Geometry Semantics Implemented
- **Planar Rectangular Pane Domain**: Strict validation of width $W$ and height $H$ ($100\text{ mm} \le W, H \le 3000\text{ mm}$). Non-finite, negative, zero, or out-of-bounds values are rejected.
- **Marker Specification**: Circular visual markers on exterior glass with physical diameter $d = 6.35\text{ mm}$ ($1/4\text{ inch}$). Footprints strictly validated to lie within the pane boundaries.
- **Canonical Cell-Centered Grid**:
  $$\text{cols} = \lceil W / 45 \rceil, \quad \text{rows} = \lceil H / 45 \rceil$$
  $$\text{pitchX} = W / \text{cols}, \quad \text{pitchY} = H / \text{rows}$$
  $$x_i = (i + 0.5) \cdot \text{pitchX}, \quad y_j = (j + 0.5) \cdot \text{pitchY}$$
- **Engineering Pitch Target**: Maximum adjacent center pitch $\le 45.0\text{ mm}$.
- **Published-Guidance Spacing Check**: Maximum clear axial gap and maximum boundary clearance $\le 50.8\text{ mm}$ ($2\text{ inches}$).
- **Strictly Separated Spacing Quantities**:
  - Horizontal & Vertical Center Pitch: $\Delta x$, $\Delta y$
  - Clear Axial Gaps: $\Delta x - d$, $\Delta y - d$
  - Boundary Clearances: $x_0 - d/2$, $W - x_{\text{last}} - d/2$, $y_0 - d/2$, $H - y_{\text{last}} - d/2$
  - Center distance is never labeled an "untreated opening".
- **Independent Validator**: Recomputes topology from scratch; checks every expected row and column; detects missing cells, full row/col deletions, edge deletions, duplicate cells, off-grid markers, undersized markers, and boundary violations.
- **Inspector Core & Plan Repair**: Implements pure marker deletion from plan, affected span/gap recalculation, and idempotent canonical plan repair.
- **Display Transform & Homography**: `object-fit: contain` coordinate transform (pointer CSS $\to$ container rect $\to$ intrinsic image) and 3x3 projective homography mapping physical pane rectangle to 4 selected image quad corners with interior correspondence verification.

## Exact 600 × 900 mm Reference-Fixture Result
- Pane Dimensions: $600\text{ mm} \times 900\text{ mm}$
- Grid Topology: $14\text{ columns} \times 20\text{ rows} = 280\text{ markers}$
- Horizontal Center Pitch: $42.857143\text{ mm}$ ($\le 45\text{ mm}$)
- Vertical Center Pitch: $45.000000\text{ mm}$ ($\le 45\text{ mm}$)
- Maximum Horizontal Clear Gap: $36.507143\text{ mm}$ ($\le 50.8\text{ mm}$)
- Maximum Vertical Clear Gap: $38.650000\text{ mm}$ ($\le 50.8\text{ mm}$)
- Maximum Horizontal Boundary Clearance: $18.253571\text{ mm}$ ($\le 50.8\text{ mm}$)
- Maximum Vertical Boundary Clearance: $19.325000\text{ mm}$ ($\le 50.8\text{ mm}$)
- Statuses:
  - Planning target met: `TRUE`
  - Guidance spacing check met: `TRUE`
- Interior Deletion (Row 8, Col 7 removed):
  - Affected Horizontal Center Span: $85.714286\text{ mm}$
  - Affected Vertical Center Span: $90.000000\text{ mm}$
  - Recalculated Horizontal Clear Gap: $79.364286\text{ mm}$ ($> 50.8\text{ mm}$)
  - Recalculated Vertical Clear Gap: $83.650000\text{ mm}$ ($> 50.8\text{ mm}$)
  - Guidance spacing check: `FAILED` (`NOT MET`)
  - Issues detected: `MISSING_CELL`, `GUIDANCE_CLEAR_GAP_EXCEEDED`
- Plan Repair:
  - Canonical marker restored at (row 8, col 7)
  - Marker count restored to 280
  - Guidance spacing check: `PASSED`
  - Idempotent: repeated repair yields identical plan

## Adversarial & Hostile Policy Fixtures Tested
1. Interior deletion (exposes affected clear gap $> 50.8\text{ mm}$)
2. Edge deletion (exposes boundary clearance $> 50.8\text{ mm}$)
3. Complete row deletion (caught as `FULL_ROW_MISSING`, gap $= W$)
4. Complete column deletion (caught as `FULL_COLUMN_MISSING`, gap $= H$)
5. Multiple missing cells (all reported and caught)
6. Duplicate cell (caught as `DUPLICATE_CELL`)
7. Off-grid marker (caught as `OFF_GRID_MARKER`)
8. Marker outside pane footprint (caught as `MARKER_OUT_OF_PANE`)
9. Undersized dot diameter ($5.0\text{ mm} < 6.35\text{ mm}$, caught as `UNDERSIZED_MARKER`)
10. Empty plan ($0\text{ markers}$, caught as `EMPTY_PLAN`)
11. Non-finite input ($NaN$, $\infty$, caught as `NON_FINITE_INPUT`)
12. Invalid dimensions ($< 100\text{ mm}$, $> 3000\text{ mm}$, negative, zero)
13. Repeated repair (verified idempotent)
14. Hostile spec dot diameter weakening ($5.0\text{ mm}$, caught as `UNDERSIZED_MARKER` and `SPEC_MISMATCH`)
15. Hostile spec target pitch weakening ($60\text{ mm}$, caught as `SPEC_MISMATCH` and `TARGET_PITCH_EXCEEDED`)
16. Hostile spec guidance clear gap loosening ($999\text{ mm}$, caught as `SPEC_MISMATCH` and `GUIDANCE_CLEAR_GAP_EXCEEDED`)
17. Hostile spec row/col corruption (caught as `SPEC_MISMATCH`)
18. Hostile plan repair canonical restoration (tampered pitch/gap/diameter/topology restored to locked constants; idempotent)

## Property Testing
- **100,000 Seeded Scalar Sweep**: Verified pitch $\le 45\text{ mm}$, clear axial gaps $\le 50.8\text{ mm}$, boundary clearances $\le 50.8\text{ mm}$ across continuous $[100, 3000]\text{ mm}$ range.
- **200 Bounded Randomized Plans**: Verified generation $\to$ validation $\to$ deletion $\to$ rejection $\to$ repair $\to$ pass roundtrip.

## Verification Gate
- **ESLint**: Passed (`✔ No ESLint warnings or errors`)
- **TypeScript**: Passed (`tsc --noEmit` 0 errors)
- **Vitest**: 9 test files, 46 tests passed (0 failures)
- **Next.js Production Build**: Compiled successfully, all 4 static routes prerendered

## NextStep Hacks Alignment & RUN 2 Readiness
- RUN 1 Truth Layer is hardened, fully tested, policy-independent, and locked.
- Ready for RUN 2 — EXPERIENCE LAYER (camera capture, frozen frame, corner selection, interactive inspector, guide, science).
