# WingGap Final Black-Judge Adversarial Pass

This document evaluates the production codebase under rigorous adversarial criteria prior to release.

---

### 1. Are any physical values hardcoded?
**NO.**
Every plan's columns, rows, marker coordinates, pitches, clear gaps, and boundary clearances are dynamically derived from the measured pane dimensions ($W, H$) passed into `generatePlan(w, h)`:
$$\text{cols} = \lceil W / 45 \rceil, \quad \text{rows} = \lceil H / 45 \rceil$$
$$\text{pitchX} = W / \text{cols}, \quad \text{pitchY} = H / \text{rows}$$
Synthetic 600×900 fallback plans have been completely removed from production UI components (`app/guide/page.tsx` and `components/scanner/ManualPlanner.tsx`).

### 2. Can dimension changes alter output?
**YES.**
Verified both analytically and via automated test suite (`test/anti-hardcode.test.ts`):
- Input A ($480 \times 720\text{ mm}$) produces $11 \times 16 = 176$ markers with pitch $43.64\text{ mm} \times 45.00\text{ mm}$.
- Input B ($1250 \times 1850\text{ mm}$) produces $28 \times 42 = 1176$ markers with pitch $44.64\text{ mm} \times 44.05\text{ mm}$.

### 3. Can a deleted edge marker show the correct boundary metric?
**YES.**
`analyzeMarkerRemoval` in `lib/grid/analyzeRemoval.ts` inspects adjacency to pane boundaries. If an edge marker is removed, it identifies the affected edge (`left`, `right`, `top`, `bottom`) and measures distance directly to the glass frame boundary. `PlanInspector` and `ManualPlanner` label this dynamically as `"Affected boundary clearance"` rather than a center-to-center span.

### 4. Can a deleted interior marker show the correct center/clear gap?
**YES.**
When an interior marker is removed, `analyzeMarkerRemoval` identifies the surrounding surviving markers along row and column axes, computing the new center span across the void ($2 \times \text{pitch}$) and subtracting the physical dot diameter ($6.35\text{ mm}$) to determine the actual clear glass opening between surviving dots.

### 5. Can malformed session data produce a fake guide?
**NO.**
`loadScanSession` in `lib/session/storage.ts` parses `sessionStorage`, validates dimensions using `validatePaneDimensions(w, h)`, verifies plan structure and markers array integrity, and safely returns `null` on corrupt or tampered payloads without crashing. If `plan` is null, `/guide` renders a clean "No active WingGap plan" empty state with a direct CTA to `/scan`.

### 6. Can a plan weaken the validator policy?
**NO.**
Hardened in RUN 1 fix (`0d4b0f4`). `validatePlan` in `lib/grid/validate.ts` enforces locked physical constants imported directly from `lib/grid/spec.ts`:
- `TARGET_PITCH_MM = 45.0`
- `GUIDANCE_CLEAR_GAP_MM = 50.8`
- `DOT_DIAMETER_MM = 6.35`
Corrupted or tampered plan properties (`targetPitchMm`, `dotDiameterMm`, `guidanceClearGapMm`) are flagged with `SPEC_MISMATCH` errors and cannot weaken validation.

### 7. Can QR point at the wrong domain?
**NO.**
Hardened in RUN 3 pre-deployment fix. `buildScannerUrl` in `lib/handoff/url.ts`:
- Rejects unowned fallback domains (e.g. `winggap.app` removed).
- Rejects `localhost` and loopback in production.
- Strictly validates configured `NEXT_PUBLIC_APP_URL` or secure browser `window.location.origin`.
- If neither valid configured HTTPS nor runtime HTTPS exists, returns `null` and suppresses QR generation in favor of a direct internal navigation button.

### 8. Does camera state leak after failure/retry?
**NO.**
`stopMediaStream` in `lib/camera/stream.ts` stops every active `MediaStreamTrack`. `CameraCapture.tsx` invokes `stopMediaStream` on:
- Successful frame freeze/capture.
- Retake button press.
- Component unmount.
- Transition to manual planner fallback.
- Unhandled `video.play()` promise rejection.

### 9. Does any page imply physical certification?
**NO.**
Clear disclaimers appear across the entire application:
- Footer: `"Planning tool — not a certified installation tolerance or collision probability score."`
- Science page: `"WingGap uses a 45 mm center-pitch target, which creates planning headroom below the selected 50.8 mm clear-spacing check when 6.35 mm dots are used. This is an engineering convention, not a certified installation tolerance."`
- Guide export: PNG canvas stamps `"NOT TO SCALE"` in bold 44px type across the center and declares `"WingGap generates a plan. It does not detect or certify the finished physical installation."`

### 10. Does any page claim collision probability?
**NO.**
`app/science/page.tsx` and `app/page.tsx` explicitly state that WingGap is a physical planning tool and does not produce statistical collision risk percentages.

### 11. Does export imply 1:1 scale?
**NO.**
The exported schematic PNG explicitly stamps `"NOT TO SCALE"` in high-contrast red across the center of the drawing area.

### 12. Can a fresh phone actually complete the intended flow?
**PENDING PHYSICAL HUMAN RUN.**
The code is fully automated, responsive, and unit-tested across touch targets, display container transforms, and units. However, physical real-world execution requires a person with a mobile phone at a physical window pane. Status is truthfully tracked as `MANUAL PHONE TEST REQUIRED`.

### 13. Is code/repo going to be judge-accessible before submission?
**YES.**
The repository `Syedsaadhhh/WingGap-` is ready for release. Visibility will be made public prior to submission so judges have full access to inspect commit history, tests, and documentation.

### 14. Is the demo compliant with the event's 3–5 minute rule?
**YES.**
The demo script in `docs/demo/final-demo.md` is strictly calibrated for **3:05–3:15**, within the 3:00 to 5:00 window required by hackathon rules.
