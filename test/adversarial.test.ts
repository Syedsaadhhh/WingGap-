import { describe, it, expect } from "vitest";
import { generatePlan } from "@/lib/grid/generate";
import { validatePlan } from "@/lib/grid/validate";
import { removeMarker, repairPlan } from "@/lib/grid/repair";
import { Marker } from "@/lib/grid/spec";

describe("Adversarial Fixtures & Hostile Attack Suite", () => {
  it("fixture 1: complete row deletion fails with FULL_ROW_MISSING and full width gap", () => {
    const plan = generatePlan(600, 900);
    // Delete all markers in row 5
    const surviving = plan.markers.filter((m) => m.row !== 5);
    const brokenPlan = { ...plan, markers: surviving };

    const result = validatePlan(brokenPlan);
    expect(result.targetMet).toBe(false);
    expect(result.guidanceCheckMet).toBe(false);

    const rowIssue = result.issues.find(
      (i) => i.code === "FULL_ROW_MISSING" && i.row === 5
    );
    expect(rowIssue).toBeDefined();
    expect(result.maxClearGapXmm).toBe(600);
    expect(result.maxBoundaryClearanceXmm).toBe(600);
  });

  it("fixture 2: complete column deletion fails with FULL_COLUMN_MISSING and full height gap", () => {
    const plan = generatePlan(600, 900);
    // Delete all markers in column 7
    const surviving = plan.markers.filter((m) => m.col !== 7);
    const brokenPlan = { ...plan, markers: surviving };

    const result = validatePlan(brokenPlan);
    expect(result.targetMet).toBe(false);
    expect(result.guidanceCheckMet).toBe(false);

    const colIssue = result.issues.find(
      (i) => i.code === "FULL_COLUMN_MISSING" && i.col === 7
    );
    expect(colIssue).toBeDefined();
    expect(result.maxClearGapYmm).toBe(900);
    expect(result.maxBoundaryClearanceYmm).toBe(900);
  });

  it("fixture 3: duplicate cell in plan is caught and rejected", () => {
    const plan = generatePlan(600, 900);
    // Duplicate marker at row 2, col 2
    const duplicateMarker: Marker = {
      ...plan.markers[0],
      id: "duplicate_clone",
      row: 2,
      col: 2,
      xMm: (2 + 0.5) * (600 / 14),
      yMm: (2 + 0.5) * (900 / 20),
    };

    const corrupted = {
      ...plan,
      markers: [...plan.markers, duplicateMarker],
    };

    const result = validatePlan(corrupted);
    expect(result.targetMet).toBe(false);
    expect(result.guidanceCheckMet).toBe(false);

    const dupIssue = result.issues.find((i) => i.code === "DUPLICATE_CELL");
    expect(dupIssue).toBeDefined();
    expect(dupIssue?.row).toBe(2);
    expect(dupIssue?.col).toBe(2);
  });

  it("fixture 4: marker outside pane boundary footprint is caught and rejected", () => {
    const plan = generatePlan(600, 900);
    // Move first marker so its left edge goes past pane boundary (xMm = 2.0 mm, diameter = 6.35 mm -> left edge = -1.175 mm)
    const corruptedMarkers = plan.markers.map((m) =>
      m.id === "m_0_0" ? { ...m, xMm: 2.0 } : m
    );

    const result = validatePlan({ ...plan, markers: corruptedMarkers });
    expect(result.guidanceCheckMet).toBe(false);

    const oobIssue = result.issues.find((i) => i.code === "MARKER_OUT_OF_PANE");
    expect(oobIssue).toBeDefined();
  });

  it("fixture 5: undersized dot diameter (< 6.35 mm) is rejected", () => {
    const plan = generatePlan(600, 900);
    // Set one marker's diameter to 5.0 mm
    const corruptedMarkers = plan.markers.map((m) =>
      m.id === "m_3_3" ? { ...m, diameterMm: 5.0 } : m
    );

    const result = validatePlan({ ...plan, markers: corruptedMarkers });
    expect(result.targetMet).toBe(false);
    expect(result.guidanceCheckMet).toBe(false);

    const undersizedIssue = result.issues.find(
      (i) => i.code === "UNDERSIZED_MARKER"
    );
    expect(undersizedIssue).toBeDefined();
    expect(undersizedIssue?.value).toBe(5.0);
    expect(undersizedIssue?.threshold).toBe(6.35);
  });

  it("fixture 6: off-grid shifted marker is detected", () => {
    const plan = generatePlan(600, 900);
    // Shift marker by 5 mm
    const corruptedMarkers = plan.markers.map((m) =>
      m.id === "m_4_4" ? { ...m, xMm: m.xMm + 5.0 } : m
    );

    const result = validatePlan({ ...plan, markers: corruptedMarkers });
    expect(result.targetMet).toBe(false);
    expect(result.guidanceCheckMet).toBe(false);

    const offGridIssue = result.issues.find((i) => i.code === "OFF_GRID_MARKER");
    expect(offGridIssue).toBeDefined();
  });

  it("fixture 7: empty plan is rejected with full untreated opening", () => {
    const emptyPlan = {
      spec: {
        paneWidthMm: 600,
        paneHeightMm: 900,
        targetPitchMm: 45,
        guidanceClearGapMm: 50.8,
        dotDiameterMm: 6.35,
        rows: 20,
        columns: 14,
      },
      markers: [],
    };

    const result = validatePlan(emptyPlan);
    expect(result.supported).toBe(true);
    expect(result.targetMet).toBe(false);
    expect(result.guidanceCheckMet).toBe(false);

    expect(result.issues.some((i) => i.code === "EMPTY_PLAN")).toBe(true);
    expect(result.maxClearGapXmm).toBe(600);
    expect(result.maxClearGapYmm).toBe(900);
  });

  it("fixture 8: non-finite input dimensions (NaN, Infinity) return unsupported", () => {
    const nanResult = validatePlan({
      paneWidthMm: NaN,
      paneHeightMm: 900,
      markers: [],
    });
    expect(nanResult.supported).toBe(false);
    expect(nanResult.targetMet).toBe(false);
    expect(nanResult.guidanceCheckMet).toBe(false);
    expect(nanResult.issues.some((i) => i.code === "NON_FINITE_INPUT")).toBe(true);

    const infResult = validatePlan({
      paneWidthMm: 600,
      paneHeightMm: Infinity,
      markers: [],
    });
    expect(infResult.supported).toBe(false);
  });

  it("fixture 9: out-of-bounds dimensions (< 100 mm, > 3000 mm) return unsupported", () => {
    const tooSmall = validatePlan({
      paneWidthMm: 80,
      paneHeightMm: 900,
      markers: [],
    });
    expect(tooSmall.supported).toBe(false);
    expect(tooSmall.issues.some((i) => i.code === "INVALID_DIMENSIONS")).toBe(true);

    const tooBig = validatePlan({
      paneWidthMm: 600,
      paneHeightMm: 3200,
      markers: [],
    });
    expect(tooBig.supported).toBe(false);
  });

  it("fixture 10: non-finite marker coordinates are caught", () => {
    const plan = generatePlan(600, 900);
    const corruptedMarkers = plan.markers.map((m) =>
      m.id === "m_1_1" ? { ...m, xMm: NaN } : m
    );

    const result = validatePlan({ ...plan, markers: corruptedMarkers });
    expect(result.guidanceCheckMet).toBe(false);
    expect(result.issues.some((i) => i.code === "NON_FINITE_INPUT")).toBe(true);
  });
});
