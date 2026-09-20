# WingGap Physical Window Verification Record

STATUS: MANUAL PHONE TEST REQUIRED

This record documents the physical verification gate on a real mobile device at a physical glass window pane.

> [!IMPORTANT]
> The automated suite and build pipeline are fully verified. However, physical real-world verification requires an operator to physically point a mobile phone camera at a real glass window pane, select the pane corners, input tape-measured dimensions, and observe the live projection and marker inspector in the field.
>
> Values must NEVER be fabricated or guessed without physical observation.

## Physical Test Protocol

```text
Device: [Pending Human Phone Test]
Browser: [Pending Mobile Browser]
Production URL: [Pending Deployment URL]
Pane width: [Pending Tape Measure Measurement]
Pane height: [Pending Tape Measure Measurement]

Columns:
Rows:
Marker count:
Dot diameter: 6.35 mm
Pitch X:
Pitch Y:
Clear gap X:
Clear gap Y:
Boundary clearance X:
Boundary clearance Y:

Removed marker row/col:
Affected metric label:
Affected center span (if applicable):
Affected clear gap/boundary clearance:
Fail status:

Repaired status:
```

## Phone Verification Checklist
1. Open camera scanner on mobile device.
2. Observe permission explainer card prior to browser `getUserMedia` prompt.
3. Grant camera permission; verify environment/rear camera stream starts.
4. Align window pane and tap `Capture pane` to freeze frame.
5. Verify live tracks cleanly stop upon freeze.
6. Drag corner handles (minimum 52×52 px hit area) to align with rectangular pane frame.
7. Enter width and height measured with physical tape measure.
8. Toggle units (cm ↔ in) to ensure physical dimensions remain invariant.
9. Tap `Generate plan` to project homography grid onto frozen pane.
10. Verify dot diameter displays as 6.35 mm (1/4 in).
11. Inspect layout: tap any marker, tap `Remove marker from plan`.
12. Verify affected metric label and clear opening dynamically recalculate and fail guidance check when threshold (>50.8 mm) is exceeded.
13. Tap `Repair layout` and verify canonical layout and passing guidance status are restored.
14. Navigate to `/guide` and confirm dimensions match and no raw camera frames are leaked.
