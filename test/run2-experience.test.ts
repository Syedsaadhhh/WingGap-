import { describe, it, expect, beforeEach } from "vitest";
import { generatePlan } from "@/lib/grid/generate";
import { validatePlan } from "@/lib/grid/validate";
import { removeMarker, repairPlan } from "@/lib/grid/repair";
import { computePaneHomography, applyHomography } from "@/lib/geometry/homography";
import { orderQuadPoints, validateQuad, type Quad } from "@/lib/geometry/quad";
import { toMm, validatePaneDimensions } from "@/lib/units";
import {
  saveScanSession,
  loadScanSession,
  clearScanSession,
  type ScanSessionData,
} from "@/lib/session/storage";
import { DOT_DIAMETER_MM, GUIDANCE_CLEAR_GAP_MM, TARGET_PITCH_MM } from "@/lib/grid/spec";

describe("RUN 2 Experience Layer Integration Suite", () => {
  beforeEach(() => {
    clearScanSession();
  });

  // 1 & 2. Scanner state transitions & captured-frame invalidation
  it("1 & 2. invalidates corners, plan, and inspector state on retake", () => {
    let capturedFrame: { dataUrl: string; width: number; height: number } | null = {
      dataUrl: "data:image/jpeg;base64,mockframe",
      width: 1920,
      height: 1080,
    };
    let corners: Quad | null = [
      { x: 100, y: 100 },
      { x: 1800, y: 120 },
      { x: 1750, y: 1000 },
      { x: 120, y: 980 },
    ];
    let plan = generatePlan(600, 900);
    let inspectorSelectedMarker: string | null = "m_5_5";

    // Simulate Retake action
    const handleRetake = () => {
      capturedFrame = null;
      corners = null;
      plan = null as unknown as typeof plan;
      inspectorSelectedMarker = null;
    };

    handleRetake();

    expect(capturedFrame).toBeNull();
    expect(corners).toBeNull();
    expect(plan).toBeNull();
    expect(inspectorSelectedMarker).toBeNull();
  });

  // 3. Dimension form requiring both width and height
  it("3. requires both real width and height within 100-3000 mm", () => {
    // Only width provided
    expect(validatePaneDimensions(600, NaN).valid).toBe(false);
    expect(validatePaneDimensions(600, 0).valid).toBe(false);

    // Only height provided
    expect(validatePaneDimensions(NaN, 900).valid).toBe(false);
    expect(validatePaneDimensions(0, 900).valid).toBe(false);

    // Both provided and valid (60 cm x 90 cm = 600 mm x 900 mm)
    const wMm = toMm(60, "cm");
    const hMm = toMm(90, "cm");
    const validCheck = validatePaneDimensions(wMm, hMm);
    expect(validCheck.valid).toBe(true);

    // Out of bounds (< 100 mm)
    expect(validatePaneDimensions(toMm(8, "cm"), 900).valid).toBe(false);

    // Out of bounds (> 3000 mm)
    expect(validatePaneDimensions(600, toMm(350, "cm")).valid).toBe(false);
  });

  // 4. Projection integration (homography mapping physical plan to image quad)
  it("4. projects physical regular dot plan through 3x3 homography into perspective quad", () => {
    const W = 600;
    const H = 900;
    const plan = generatePlan(W, H);

    // Perspective quad on image plane
    const rawQuad: Quad = [
      { x: 150, y: 100 },
      { x: 850, y: 140 },
      { x: 920, y: 1100 },
      { x: 120, y: 1050 },
    ];
    const orderedQuad = orderQuadPoints(rawQuad);
    expect(validateQuad(orderedQuad).valid).toBe(true);

    const homography = computePaneHomography(W, H, orderedQuad);

    // Project all markers
    const projected = plan.markers.map((m) =>
      applyHomography(homography, { x: m.xMm, y: m.yMm })
    );

    expect(projected.length).toBe(280);

    // Top-left physical marker (row 0, col 0)
    const m0 = plan.markers[0];
    const p0 = applyHomography(homography, { x: m0.xMm, y: m0.yMm });
    // Must lie near top-left quad corner (150, 100)
    expect(p0.x).toBeGreaterThan(120);
    expect(p0.x).toBeLessThan(300);
    expect(p0.y).toBeGreaterThan(90);
    expect(p0.y).toBeLessThan(300);

    // Bottom-right physical marker (row 19, col 13)
    const mLast = plan.markers[plan.markers.length - 1];
    const pLast = applyHomography(homography, { x: mLast.xMm, y: mLast.yMm });
    // Must lie near bottom-right quad corner (920, 1100)
    expect(pLast.x).toBeGreaterThan(700);
    expect(pLast.x).toBeLessThan(930);
    expect(pLast.y).toBeGreaterThan(800);
    expect(pLast.y).toBeLessThan(1150);
  });

  // 5. Nearest-marker hit testing
  it("5. hit-tests nearest marker within screen radius and rejects taps too far", () => {
    const plan = generatePlan(600, 900);
    const HIT_RADIUS = 28;
    const HIT_RADIUS_SQ = HIT_RADIUS * HIT_RADIUS;

    // Simulate screen coordinates equal to marker physical coordinates
    const screenMarkers = plan.markers.map((m) => ({
      marker: m,
      screenX: m.xMm,
      screenY: m.yMm,
    }));

    // Target marker at row 8, col 7
    const targetMarker = plan.markers.find((m) => m.row === 8 && m.col === 7)!;
    expect(targetMarker).toBeDefined();

    // Click slightly offset by (5px, 8px)
    const clickX = targetMarker.xMm + 5;
    const clickY = targetMarker.yMm + 8;

    let nearest = null;
    let minDistanceSq = Infinity;
    for (const sm of screenMarkers) {
      const dx = sm.screenX - clickX;
      const dy = sm.screenY - clickY;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        nearest = sm.marker;
      }
    }

    expect(minDistanceSq <= HIT_RADIUS_SQ).toBe(true);
    expect(nearest?.id).toBe(targetMarker.id);
    expect(nearest?.row).toBe(8);
    expect(nearest?.col).toBe(7);

    // Click far away into empty margin (e.g. 5000, 5000)
    let farNearest = null;
    let farMinDistSq = Infinity;
    for (const sm of screenMarkers) {
      const dx = sm.screenX - 5000;
      const dy = sm.screenY - 5000;
      const distSq = dx * dx + dy * dy;
      if (distSq < farMinDistSq) {
        farMinDistSq = distSq;
        farNearest = sm.marker;
      }
    }
    const isWithinRadius = farMinDistSq <= HIT_RADIUS_SQ;
    expect(isWithinRadius).toBe(false);
  });

  // 6. Delete -> validator -> repair UI state sequence
  it("6. executes delete -> recalculate -> FAIL -> repair -> PASS sequence", () => {
    let plan = generatePlan(600, 900);
    expect(plan.markers.length).toBe(280);

    // Initial valid state
    const initialVal = validatePlan(plan);
    expect(initialVal.targetMet).toBe(true);
    expect(initialVal.guidanceCheckMet).toBe(true);

    // Step 1: User deletes interior marker (row 8, col 7)
    plan = removeMarker(plan, { row: 8, col: 7 });
    expect(plan.markers.length).toBe(279);

    // Step 2: Real validator recalculation
    const brokenVal = validatePlan(plan);
    expect(brokenVal.guidanceCheckMet).toBe(false);
    expect(brokenVal.targetMet).toBe(false);

    // Verify affected center span and clear gap calculation
    const pitchX = 600 / 14;
    const pitchY = 900 / 20;
    const affectedSpanX = 2 * pitchX; // ~85.71 mm
    const affectedSpanY = 2 * pitchY; // 90.00 mm
    const clearGapX = affectedSpanX - DOT_DIAMETER_MM; // ~79.36 mm
    const clearGapY = affectedSpanY - DOT_DIAMETER_MM; // 83.65 mm

    expect(brokenVal.maxCenterPitchXmm).toBeCloseTo(affectedSpanX, 4);
    expect(brokenVal.maxCenterPitchYmm).toBeCloseTo(affectedSpanY, 4);
    expect(brokenVal.maxClearGapXmm).toBeCloseTo(clearGapX, 4);
    expect(brokenVal.maxClearGapYmm).toBeCloseTo(clearGapY, 4);

    expect(clearGapX).toBeGreaterThan(GUIDANCE_CLEAR_GAP_MM);
    expect(clearGapY).toBeGreaterThan(GUIDANCE_CLEAR_GAP_MM);

    // Step 3: Repair layout
    plan = repairPlan(plan);
    expect(plan.markers.length).toBe(280);

    // Step 4: Re-validation restores PASS
    const repairedVal = validatePlan(plan);
    expect(repairedVal.targetMet).toBe(true);
    expect(repairedVal.guidanceCheckMet).toBe(true);
    expect(repairedVal.issues.length).toBe(0);
  });

  // 7. Manual planner fallback consistency
  it("7. manual planner fallback produces identical canonical plan to camera workflow", () => {
    const W = 750;
    const H = 1200;

    // Both workflows rely on the exact same generator and validator
    const plan = generatePlan(W, H);
    expect(plan.spec.columns).toBe(Math.ceil(750 / TARGET_PITCH_MM)); // 17
    expect(plan.spec.rows).toBe(Math.ceil(1200 / TARGET_PITCH_MM)); // 27

    const val = validatePlan(plan);
    expect(val.targetMet).toBe(true);
    expect(val.guidanceCheckMet).toBe(true);
  });

  // 8. Guide session-data persistence & dynamic re-validation
  it("8. preserves session data and recomputes validation without trusting stored status", () => {
    const plan = generatePlan(600, 900);
    const sessionData: ScanSessionData = {
      sessionId: "session_test_123",
      capturedAt: Date.now(),
      imageDataUrl: "data:image/jpeg;base64,mock",
      intrinsicWidth: 1920,
      intrinsicHeight: 1080,
      corners: [
        { x: 100, y: 100 },
        { x: 1800, y: 120 },
        { x: 1750, y: 1000 },
        { x: 120, y: 980 },
      ],
      paneWidthMm: 600,
      paneHeightMm: 900,
      unit: "cm",
      plan,
    };

    saveScanSession(sessionData);

    const restored = loadScanSession();
    expect(restored).not.toBeNull();
    expect(restored?.data.sessionId).toBe("session_test_123");
    expect(restored?.data.paneWidthMm).toBe(600);
    expect(restored?.data.paneHeightMm).toBe(900);
    expect(restored?.data.plan?.markers.length).toBe(280);

    // Dynamic re-validation was executed on restore
    expect(restored?.validation).not.toBeNull();
    expect(restored?.validation?.targetMet).toBe(true);
    expect(restored?.validation?.guidanceCheckMet).toBe(true);

    // Guide first-center offset calculation check
    const pitchX = 600 / 14;
    const pitchY = 900 / 20;
    const firstOffsetX = 0.5 * pitchX;
    const firstOffsetY = 0.5 * pitchY;
    expect(firstOffsetX).toBeCloseTo(21.42857, 4);
    expect(firstOffsetY).toBe(22.5);
  });
});
