import { describe, it, expect } from "vitest";
import { generatePlan } from "@/lib/grid/generate";
import { validatePlan } from "@/lib/grid/validate";
import { removeMarker } from "@/lib/grid/repair";

describe("Independent Plan Validator", () => {
  it("validates exact 600 x 900 mm reference fixture as PASS", () => {
    const plan = generatePlan(600, 900);
    const result = validatePlan(plan);

    expect(result.supported).toBe(true);
    expect(result.targetMet).toBe(true);
    expect(result.guidanceCheckMet).toBe(true);
    expect(result.issues.length).toBe(0);

    const pitchX = 600 / 14;
    const pitchY = 900 / 20;

    // Center pitch
    expect(result.maxCenterPitchXmm).toBeCloseTo(pitchX, 5); // ≈ 42.857143 mm
    expect(result.maxCenterPitchYmm).toBeCloseTo(pitchY, 5); // 45.0 mm

    // Clear axial gap (pitch - dot diameter 6.35)
    expect(result.maxClearGapXmm).toBeCloseTo(pitchX - 6.35, 5); // ≈ 36.507143 mm
    expect(result.maxClearGapYmm).toBeCloseTo(pitchY - 6.35, 5); // 38.650 mm

    // Boundary clearances (first/last center - diameter / 2)
    // first center = 0.5 * pitchX
    // boundary clearance = 0.5 * pitchX - 3.175
    const expectedBoundX = 0.5 * pitchX - 3.175;
    const expectedBoundY = 0.5 * pitchY - 3.175;
    expect(result.maxBoundaryClearanceXmm).toBeCloseTo(expectedBoundX, 5); // ≈ 18.253571 mm
    expect(result.maxBoundaryClearanceYmm).toBeCloseTo(expectedBoundY, 5); // 19.325 mm
  });

  it("detects interior marker deletion and recalculates affected gaps accurately", () => {
    const plan = generatePlan(600, 900);

    // Remove interior marker at row 8, col 7
    const planWithHole = removeMarker(plan, { row: 8, col: 7 });
    expect(planWithHole.markers.length).toBe(279);

    const result = validatePlan(planWithHole);

    // Both target and guidance check must fail
    expect(result.targetMet).toBe(false);
    expect(result.guidanceCheckMet).toBe(false);

    const pitchX = 600 / 14;
    const pitchY = 900 / 20;

    // Center span doubles along affected axis
    const expectedAffectedSpanX = 2 * pitchX; // ≈ 85.714286 mm
    const expectedAffectedSpanY = 2 * pitchY; // 90.0 mm
    const expectedAffectedGapX = expectedAffectedSpanX - 6.35; // ≈ 79.364286 mm
    const expectedAffectedGapY = expectedAffectedSpanY - 6.35; // 83.650 mm

    expect(result.maxCenterPitchXmm).toBeCloseTo(expectedAffectedSpanX, 5);
    expect(result.maxCenterPitchYmm).toBeCloseTo(expectedAffectedSpanY, 5);
    expect(result.maxClearGapXmm).toBeCloseTo(expectedAffectedGapX, 5);
    expect(result.maxClearGapYmm).toBeCloseTo(expectedAffectedGapY, 5);

    // Issues must record missing cell and exceeded guidance clear gap
    const missingIssue = result.issues.find(
      (i) => i.code === "MISSING_CELL" && i.row === 8 && i.col === 7
    );
    expect(missingIssue).toBeDefined();

    const exceededGapX = result.issues.find(
      (i) => i.code === "GUIDANCE_CLEAR_GAP_EXCEEDED" && i.row === 8
    );
    expect(exceededGapX).toBeDefined();
    expect(exceededGapX?.value).toBeCloseTo(expectedAffectedGapX, 4);

    const exceededGapY = result.issues.find(
      (i) => i.code === "GUIDANCE_CLEAR_GAP_EXCEEDED" && i.col === 7
    );
    expect(exceededGapY).toBeDefined();
    expect(exceededGapY?.value).toBeCloseTo(expectedAffectedGapY, 4);
  });

  it("detects edge marker deletion and recalculates boundary clearance", () => {
    const plan = generatePlan(600, 900);

    // Remove left edge marker at row 5, col 0
    const planEdgeMissing = removeMarker(plan, { row: 5, col: 0 });
    const result = validatePlan(planEdgeMissing);

    expect(result.targetMet).toBe(false);
    expect(result.guidanceCheckMet).toBe(false);

    const pitchX = 600 / 14;
    // Left boundary clearance becomes distance from 0 to col 1 marker's edge:
    // col 1 x = 1.5 * pitchX
    // boundary clearance = 1.5 * pitchX - 3.175
    const expectedBoundaryClearance = 1.5 * pitchX - 3.175; // ≈ 61.110714 mm
    expect(result.maxBoundaryClearanceXmm).toBeCloseTo(expectedBoundaryClearance, 4);
    expect(result.maxBoundaryClearanceXmm).toBeGreaterThan(50.8);

    const boundaryIssue = result.issues.find(
      (i) => i.code === "GUIDANCE_BOUNDARY_CLEARANCE_EXCEEDED" && i.row === 5
    );
    expect(boundaryIssue).toBeDefined();
  });
});
