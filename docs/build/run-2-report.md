# WingGap RUN 2 — EXPERIENCE LAYER Report

## Status
RUN 2 PASSED

## Architecture & Real Frontend Behavior Implemented
- **Navigation & Structure**: Next.js App Router with 4 canonical routes:
  - `/`: Clean landing page with `BIRD-SAFE WINDOW PLANNING` headline, 3-step physical narrative (Capture, Measure, Plan), science link, and desktop field handoff.
  - `/scan`: Field workflow orchestrating camera framing, frame freezing, 4-corner quad definition, dimension entry, homography plan projection, nearest-marker inspection, defect injection, and canonical repair.
  - `/guide`: Practical field installation guide consuming real session plan data, showing pane dimensions, 6.35 mm dot size, columns × rows, pitch, first-center offsets, 4-step installation sequence, and disclaimer. Optional PNG export stamped `NOT TO SCALE`.
  - `/science`: Scientific justification separating what WingGap checks from what it does not claim, with source citations.
- **Camera & Capture (`components/scanner/CameraCapture.tsx`)**:
  - Explains camera permission before requesting.
  - Real browser camera access via `getUserMedia` (`facingMode: { ideal: "environment" }`, `audio: false`).
  - Live video framing feed with `LIVE` indicator.
  - Non-zero intrinsic dimension verification before capture.
  - `Capture pane` draws intrinsic video frame onto an offscreen canvas and transitions to a frozen still image labeled `CAPTURED FRAME`.
  - Stops stream tracks upon capture.
  - Handles permission denial, unavailable hardware, and playback errors with clear fallback to manual planner.
- **Display Coordinates & Corner Selection (`components/scanner/CornerSelector.tsx`)**:
  - Uses `object-fit: contain` display mapping helper (`computeDisplayFit`, `containerToIntrinsic`, `intrinsicToContainer`).
  - Handles letterboxing and resize cleanly via `ResizeObserver`.
  - Amber draggable corner handles with large ≥52 px touch hit targets.
  - Validates quadrilateral convexity, area, degeneracy, and self-intersection via `validateQuad` from RUN 1.
  - `Retake` invalidates all derived geometry (capture ID, corners, dimensions, plan, inspector state).
- **Physical Dimensions (`components/scanner/DimensionForm.tsx`)**:
  - Requires both Width and Height (10 cm to 300 cm per side).
  - Explicit copy: "Use a tape measure. WingGap does not infer real-world size from pixels."
  - Displays locked treatment model (6.35 mm dot diameter, ≤45 mm pitch target, ≤50.8 mm clear-gap check, exterior surface).
- **Perspective Homography & Plan Inspector (`components/scanner/PlanInspector.tsx`)**:
  - Projects physical dot centers onto the captured pane using 3x3 projective homography (`computePaneHomography`).
  - Nearest-marker hit testing within screen radius; displays Row/Column candidate sheet.
  - `Remove marker from plan` mutates plan state and triggers independent validator recalculation.
  - Displays actual affected center span and clear glass gap between surviving dots.
  - Exposes `Guidance spacing check not met` when clear gap exceeds 50.8 mm.
  - `Repair layout` invokes canonical repair (`repairPlan`), restoring canonical geometry and returning status to `Planning target met` and `Guidance spacing check met`.
- **Manual Planner Fallback (`components/scanner/ManualPlanner.tsx`)**:
  - Provides complete 2D pane elevation workflow when camera is unavailable or denied, using identical generator, validator, inspector, and repair core.
- **Session State (`lib/session/storage.ts`)**:
  - Ephemeral sessionStorage keeping capture ID, dimensions, corners, and plan.
  - Never trusts stored validation status; always recomputes `validatePlan` upon restore.

## Verification Gate Results
- **ESLint (`npm run lint`)**: `✔ No ESLint warnings or errors`
- **TypeScript (`npm run typecheck`)**: `tsc --noEmit` exited with 0 errors
- **Vitest (`npm run test`)**: 10 test files passed, 53 tests passed (0 failures)
  - `test/run2-experience.test.ts` (7 tests)
  - `test/homography.test.ts` (7 tests)
  - `test/adversarial.test.ts` (10 tests)
  - `test/hostile-policy.test.ts` (6 tests)
  - `test/validator.test.ts` (3 tests)
  - `test/property.test.ts` (2 tests)
  - `test/displayTransform.test.ts` (5 tests)
  - `test/inspector-repair.test.ts` (4 tests)
  - `test/generator.test.ts` (3 tests)
  - `test/units.test.ts` (6 tests)
- **Standalone Verification (`scripts/test-runner.ts`)**: 47 tests passed (0 failures)
- **Production Build (`npm run build`)**: Next.js 14.2.35 compiled successfully; all 7 routes statically prerendered without errors or warnings.

## NextStep Alignment & RUN 3 Readiness
- RUN 2 Experience Layer is fully built, tested, and verified.
- Prepared for RUN 3 — REALITY LAYER (preflight audit, production hardening, Vercel deployment verification).
