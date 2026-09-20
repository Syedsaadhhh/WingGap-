import { describe, it, expect } from "vitest";
import { generatePlan } from "@/lib/grid/generate";
import { validatePlan } from "@/lib/grid/validate";
import { removeMarker, repairPlan } from "@/lib/grid/repair";
import {
  DOT_DIAMETER_MM,
  GUIDANCE_CLEAR_GAP_MM,
  TARGET_PITCH_MM,
  GeneratedPlan,
  Marker,
} from "@/lib/grid/spec";

describe("Hostile Policy-Tampering & Validator Independence Tests", () => {
  it("A. rejects plan when plan.spec.dotDiameterMm and all markers are changed to 5.0 mm", () => {
    const plan = generatePlan(600, 900);

    // Tamper spec and markers to weaken dot diameter threshold to 5.0 mm
    const tamperedPlan: GeneratedPlan = {
      spec: {
        ...plan.spec,
        dotDiameterMm: 5.0,
      },
      markers: plan.markers.map((m) => ({
        ...m,
        diameterMm: 5.0,
      })),
    };

    const result = validatePlan(tamperedPlan);

    // Validator authority must reject the tampered plan
    expect(result.guidanceCheckMet).toBe(false);
    expect(result.targetMet).toBe(false);

    // Both UNDERSIZED_MARKER and SPEC_MISMATCH must be detected
    expect(result.issues.some((i) => i.code === "UNDERSIZED_MARKER")).toBe(true);
    expect(result.issues.some((i) => i.code === "SPEC_MISMATCH")).toBe(true);

    const undersizedIssue = result.issues.find((i) => i.code === "UNDERSIZED_MARKER");
    expect(undersizedIssue?.threshold).toBe(DOT_DIAMETER_MM); // 6.35 mm
    expect(undersizedIssue?.value).toBe(5.0);
  });

  it("B. enforces 45 mm canonical topology when plan.spec.targetPitchMm is changed to 60", () => {
    const plan = generatePlan(600, 900);

    // Tamper spec target pitch to 60 mm
    const tamperedSpecPlan: GeneratedPlan = {
      ...plan,
      spec: {
        ...plan.spec,
        targetPitchMm: 60,
      },
    };

    const result1 = validatePlan(tamperedSpecPlan);
    expect(result1.targetMet).toBe(false);
    expect(result1.guidanceCheckMet).toBe(false);
    expect(result1.issues.some((i) => i.code === "SPEC_MISMATCH")).toBe(true);

    // Attempt to craft a sparser 60 mm grid (10 cols x 15 rows = 150 markers)
    const sparseMarkers: Marker[] = [];
    const cols60 = Math.ceil(600 / 60); // 10
    const rows60 = Math.ceil(900 / 60); // 15
    const pitchX60 = 600 / cols60; // 60
    const pitchY60 = 900 / rows60; // 60

    for (let r = 0; r < rows60; r++) {
      for (let c = 0; c < cols60; c++) {
        sparseMarkers.push({
          id: `m_sparse_${r}_${c}`,
          row: r,
          col: c,
          xMm: (c + 0.5) * pitchX60,
          yMm: (r + 0.5) * pitchY60,
          diameterMm: DOT_DIAMETER_MM,
        });
      }
    }

    const craftedPlan: GeneratedPlan = {
      spec: {
        paneWidthMm: 600,
        paneHeightMm: 900,
        targetPitchMm: 60,
        guidanceClearGapMm: GUIDANCE_CLEAR_GAP_MM,
        dotDiameterMm: DOT_DIAMETER_MM,
        rows: rows60,
        columns: cols60,
      },
      markers: sparseMarkers,
    };

    const result2 = validatePlan(craftedPlan);

    // Sparser grid cannot pass locked 45 mm validation
    expect(result2.targetMet).toBe(false);
    expect(result2.guidanceCheckMet).toBe(false);
    expect(result2.issues.some((i) => i.code === "SPEC_MISMATCH")).toBe(true);
    // Sparser pitch (60 mm) exceeds TARGET_PITCH_MM (45 mm)
    expect(result2.issues.some((i) => i.code === "TARGET_PITCH_EXCEEDED")).toBe(true);
  });

  it("C. enforces 50.8 mm guidance gap when plan.spec.guidanceClearGapMm is changed to 999", () => {
    const plan = generatePlan(600, 900);

    // Tamper guidance clear gap to 999 mm and remove an interior marker (gap ~ 79.4 mm > 50.8 mm)
    const planWithHole = removeMarker(plan, { row: 8, col: 7 });
    const tamperedPlan: GeneratedPlan = {
      ...planWithHole,
      spec: {
        ...planWithHole.spec,
        guidanceClearGapMm: 999,
      },
    };

    const result = validatePlan(tamperedPlan);

    // Validator must reject the tampered policy and detect both the spec mismatch and the gap violation
    expect(result.guidanceCheckMet).toBe(false);
    expect(result.issues.some((i) => i.code === "SPEC_MISMATCH")).toBe(true);
    expect(result.issues.some((i) => i.code === "GUIDANCE_CLEAR_GAP_EXCEEDED")).toBe(true);

    const gapIssue = result.issues.find((i) => i.code === "GUIDANCE_CLEAR_GAP_EXCEEDED");
    expect(gapIssue?.threshold).toBe(GUIDANCE_CLEAR_GAP_MM); // 50.8 mm, NOT 999 mm
  });

  it("D. detects corrupted rows and columns in plan.spec rather than trusting them", () => {
    const plan = generatePlan(600, 900);

    // Corrupt rows to 10 (canonical is 20) and columns to 7 (canonical is 14)
    const tamperedPlan: GeneratedPlan = {
      ...plan,
      spec: {
        ...plan.spec,
        rows: 10,
        columns: 7,
      },
    };

    const result = validatePlan(tamperedPlan);

    expect(result.targetMet).toBe(false);
    expect(result.guidanceCheckMet).toBe(false);

    const rowMismatch = result.issues.find(
      (i) => i.code === "SPEC_MISMATCH" && i.message.includes("spec.rows")
    );
    expect(rowMismatch).toBeDefined();
    expect(rowMismatch?.value).toBe(10);
    expect(rowMismatch?.threshold).toBe(20);

    const colMismatch = result.issues.find(
      (i) => i.code === "SPEC_MISMATCH" && i.message.includes("spec.columns")
    );
    expect(colMismatch).toBeDefined();
    expect(colMismatch?.value).toBe(7);
    expect(colMismatch?.threshold).toBe(14);
  });

  it("E. restores canonical policy, topology, and coordinates when corrupted plan is passed to repairPlan()", () => {
    // Heavily corrupted plan with tampered policy, corrupt topology, and arbitrary bad marker
    const corruptedPlan: GeneratedPlan = {
      spec: {
        paneWidthMm: 600,
        paneHeightMm: 900,
        targetPitchMm: 60,
        guidanceClearGapMm: 999,
        dotDiameterMm: 5.0,
        rows: 5,
        columns: 5,
      },
      markers: [
        {
          id: "bogus_marker",
          row: 0,
          col: 0,
          xMm: 12.34,
          yMm: 56.78,
          diameterMm: 5.0,
        },
      ],
    };

    const repaired = repairPlan(corruptedPlan);

    // Repaired plan must reflect authoritative locked values
    expect(repaired.spec.targetPitchMm).toBe(TARGET_PITCH_MM); // 45.0
    expect(repaired.spec.guidanceClearGapMm).toBe(GUIDANCE_CLEAR_GAP_MM); // 50.8
    expect(repaired.spec.dotDiameterMm).toBe(DOT_DIAMETER_MM); // 6.35
    expect(repaired.spec.columns).toBe(14);
    expect(repaired.spec.rows).toBe(20);
    expect(repaired.markers.length).toBe(280);

    // All markers must have canonical diameter and coordinates
    const pitchX = 600 / 14;
    const pitchY = 900 / 20;
    for (const m of repaired.markers) {
      expect(m.diameterMm).toBe(DOT_DIAMETER_MM);
      const expectedX = (m.col + 0.5) * pitchX;
      const expectedY = (m.row + 0.5) * pitchY;
      expect(m.xMm).toBeCloseTo(expectedX, 5);
      expect(m.yMm).toBeCloseTo(expectedY, 5);
    }

    // Repaired plan must pass validator completely
    const valResult = validatePlan(repaired);
    expect(valResult.supported).toBe(true);
    expect(valResult.targetMet).toBe(true);
    expect(valResult.guidanceCheckMet).toBe(true);
    expect(valResult.issues.length).toBe(0);
  });

  it("F. repairing the repaired output again produces exact idempotency", () => {
    const corruptedPlan: GeneratedPlan = {
      spec: {
        paneWidthMm: 600,
        paneHeightMm: 900,
        targetPitchMm: 80,
        guidanceClearGapMm: 500,
        dotDiameterMm: 4.0,
        rows: 3,
        columns: 3,
      },
      markers: [],
    };

    const repairOnce = repairPlan(corruptedPlan);
    const repairTwice = repairPlan(repairOnce);

    expect(repairTwice).toEqual(repairOnce);
    expect(repairTwice.spec).toEqual(repairOnce.spec);
    expect(repairTwice.markers).toEqual(repairOnce.markers);

    const valTwice = validatePlan(repairTwice);
    expect(valTwice.supported).toBe(true);
    expect(valTwice.targetMet).toBe(true);
    expect(valTwice.guidanceCheckMet).toBe(true);
    expect(valTwice.issues.length).toBe(0);
  });
});
