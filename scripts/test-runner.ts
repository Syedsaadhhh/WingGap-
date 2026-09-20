/**
 * WingGap Full Test & Verification Runner
 * Runs all unit, property, adversarial, and mathematical invariance tests.
 */

import assert from "node:assert/strict";
import {
  toMm,
  fromMm,
  validatePaneDimensions,
  validateSingleDimension,
} from "../lib/units/index.ts";
import {
  DOT_DIAMETER_MM,
  GUIDANCE_CLEAR_GAP_MM,
  MAX_PANE_DIMENSION_MM,
  MIN_PANE_DIMENSION_MM,
  TARGET_PITCH_MM,
} from "../lib/grid/spec.ts";
import type { Marker } from "../lib/grid/spec.ts";
import { generatePlan } from "../lib/grid/generate.ts";
import { validatePlan } from "../lib/grid/validate.ts";
import { removeMarker, repairPlan } from "../lib/grid/repair.ts";
import {
  computeDisplayFit,
  containerToIntrinsic,
  intrinsicToContainer,
} from "../lib/camera/displayTransform.ts";
import {
  computeQuadArea,
  isConvexQuad,
  orderQuadPoints,
  validateQuad,
} from "../lib/geometry/quad.ts";
import type { Quad } from "../lib/geometry/quad.ts";
import {
  applyHomography,
  computePaneHomography,
  invertHomography,
} from "../lib/geometry/homography.ts";

let totalTests = 0;
let passedTests = 0;

function test(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err: unknown) {
    console.error(`  ✕ ${name}`);
    console.error(err);
    throw err;
  }
}

function describe(suiteName: string, fn: () => void) {
  console.log(`\n=== ${suiteName} ===`);
  fn();
}

console.log("Starting WingGap RUN 1 Verification Suite...\n");

// 1. Units & Dimensions
describe("1. Units & Dimension Validation", () => {
  test("converts cm to mm accurately", () => {
    assert.equal(toMm(60, "cm"), 600);
    assert.equal(toMm(90, "cm"), 900);
    assert.equal(fromMm(600, "cm"), 60);
  });

  test("converts inches to mm accurately", () => {
    assert.equal(toMm(1, "in"), 25.4);
    assert.equal(toMm(2, "in"), 50.8);
    assert.ok(Math.abs(fromMm(50.8, "in") - 2.0) < 1e-6);
  });

  test("handles mm identity conversion", () => {
    assert.equal(toMm(45, "mm"), 45);
    assert.equal(fromMm(45, "mm"), 45);
  });

  test("rejects non-finite conversions with NaN", () => {
    assert.ok(Number.isNaN(toMm(NaN, "mm")));
    assert.ok(Number.isNaN(toMm(Infinity, "cm")));
    assert.ok(Number.isNaN(fromMm(NaN, "in")));
  });

  test("validates dimensions within supported range [100, 3000] mm", () => {
    assert.equal(validateSingleDimension(100, "Width").valid, true);
    assert.equal(validateSingleDimension(3000, "Height").valid, true);
    assert.equal(validateSingleDimension(600, "Width").valid, true);
    assert.equal(validateSingleDimension(99.9, "Width").valid, false);
    assert.equal(validateSingleDimension(3000.1, "Height").valid, false);
    assert.equal(validateSingleDimension(0, "Width").valid, false);
    assert.equal(validateSingleDimension(-10, "Height").valid, false);
    assert.equal(validateSingleDimension(NaN, "Width").valid, false);
    assert.equal(validateSingleDimension(Infinity, "Height").valid, false);
  });

  test("validates full pane dimensions (width and height)", () => {
    assert.equal(validatePaneDimensions(600, 900).valid, true);
    assert.equal(validatePaneDimensions(50, 900).valid, false);
    assert.equal(validatePaneDimensions(600, 3500).valid, false);
    assert.equal(validatePaneDimensions(NaN, 900).valid, false);
  });
});

// 2. Canonical Grid Generator
describe("2. Canonical Grid Generator", () => {
  test("generates exact 600 x 900 mm reference fixture", () => {
    const plan = generatePlan(600, 900);
    assert.equal(plan.spec.paneWidthMm, 600);
    assert.equal(plan.spec.paneHeightMm, 900);
    assert.equal(plan.spec.columns, 14);
    assert.equal(plan.spec.rows, 20);
    assert.equal(plan.markers.length, 280);

    const pitchX = 600 / 14;
    const pitchY = 900 / 20;
    assert.ok(Math.abs(pitchX - 42.857143) < 1e-4);
    assert.equal(pitchY, 45.0);

    const first = plan.markers[0];
    assert.equal(first.row, 0);
    assert.equal(first.col, 0);
    assert.equal(first.diameterMm, 6.35);
    assert.ok(Math.abs(first.xMm - 0.5 * pitchX) < 1e-4);
    assert.ok(Math.abs(first.yMm - 0.5 * pitchY) < 1e-4);

    const last = plan.markers[plan.markers.length - 1];
    assert.equal(last.row, 19);
    assert.equal(last.col, 13);
    assert.equal(last.diameterMm, 6.35);
    assert.ok(Math.abs(last.xMm - 13.5 * pitchX) < 1e-4);
    assert.ok(Math.abs(last.yMm - 19.5 * pitchY) < 1e-4);
  });

  test("never exceeds 45.0 mm center pitch for intact panes", () => {
    const panes = [
      [100, 100],
      [450, 450],
      [500, 800],
      [1000, 1500],
      [1200, 2000],
      [3000, 3000],
    ];
    for (const [w, h] of panes) {
      const plan = generatePlan(w, h);
      const px = w / plan.spec.columns;
      const py = h / plan.spec.rows;
      assert.ok(px <= 45.0 + 1e-9);
      assert.ok(py <= 45.0 + 1e-9);
      assert.equal(plan.markers.length, plan.spec.rows * plan.spec.columns);
    }
  });

  test("throws error for out-of-range dimensions", () => {
    assert.throws(() => generatePlan(50, 900), /outside the supported range/);
    assert.throws(() => generatePlan(600, 3500), /outside the supported range/);
    assert.throws(() => generatePlan(NaN, 900), /finite/);
  });
});

// 3. Independent Validator
describe("3. Independent Validator", () => {
  test("validates exact 600 x 900 mm reference fixture as PASS", () => {
    const plan = generatePlan(600, 900);
    const result = validatePlan(plan);

    assert.equal(result.supported, true);
    assert.equal(result.targetMet, true);
    assert.equal(result.guidanceCheckMet, true);
    assert.equal(result.issues.length, 0);

    const pitchX = 600 / 14;
    const pitchY = 900 / 20;

    assert.ok(Math.abs(result.maxCenterPitchXmm - pitchX) < 1e-4);
    assert.equal(result.maxCenterPitchYmm, 45.0);
    assert.ok(Math.abs(result.maxClearGapXmm - (pitchX - 6.35)) < 1e-4);
    assert.ok(Math.abs(result.maxClearGapYmm - 38.65) < 1e-4);

    const expBoundX = 0.5 * pitchX - 3.175;
    const expBoundY = 0.5 * pitchY - 3.175;
    assert.ok(Math.abs(result.maxBoundaryClearanceXmm - expBoundX) < 1e-4);
    assert.ok(Math.abs(result.maxBoundaryClearanceYmm - expBoundY) < 1e-4);
  });

  test("detects interior marker deletion and recalculates affected gaps accurately", () => {
    const plan = generatePlan(600, 900);
    const planWithHole = removeMarker(plan, { row: 8, col: 7 });
    assert.equal(planWithHole.markers.length, 279);

    const result = validatePlan(planWithHole);
    assert.equal(result.targetMet, false);
    assert.equal(result.guidanceCheckMet, false);

    const pitchX = 600 / 14;
    const pitchY = 900 / 20;
    const expSpanX = 2 * pitchX;
    const expSpanY = 2 * pitchY;
    const expGapX = expSpanX - 6.35;
    const expGapY = expSpanY - 6.35;

    assert.ok(Math.abs(result.maxCenterPitchXmm - expSpanX) < 1e-4);
    assert.ok(Math.abs(result.maxCenterPitchYmm - expSpanY) < 1e-4);
    assert.ok(Math.abs(result.maxClearGapXmm - expGapX) < 1e-4);
    assert.ok(Math.abs(result.maxClearGapYmm - expGapY) < 1e-4);

    assert.ok(result.issues.some((i) => i.code === "MISSING_CELL" && i.row === 8 && i.col === 7));
    assert.ok(result.issues.some((i) => i.code === "GUIDANCE_CLEAR_GAP_EXCEEDED" && i.row === 8));
    assert.ok(result.issues.some((i) => i.code === "GUIDANCE_CLEAR_GAP_EXCEEDED" && i.col === 7));
  });

  test("detects edge marker deletion and recalculates boundary clearance", () => {
    const plan = generatePlan(600, 900);
    const planEdgeMissing = removeMarker(plan, { row: 5, col: 0 });
    const result = validatePlan(planEdgeMissing);

    assert.equal(result.targetMet, false);
    assert.equal(result.guidanceCheckMet, false);

    const pitchX = 600 / 14;
    const expBound = 1.5 * pitchX - 3.175;
    assert.ok(Math.abs(result.maxBoundaryClearanceXmm - expBound) < 1e-4);
    assert.ok(result.maxBoundaryClearanceXmm > 50.8);
    assert.ok(result.issues.some((i) => i.code === "GUIDANCE_BOUNDARY_CLEARANCE_EXCEEDED" && i.row === 5));
  });
});

// 4. Inspector Operations & Plan Repair
describe("4. Inspector Operations & Plan Repair", () => {
  test("removes marker immutably without mutating original plan", () => {
    const original = generatePlan(600, 900);
    const updated = removeMarker(original, "m_4_4");
    assert.equal(original.markers.length, 280);
    assert.equal(updated.markers.length, 279);
    assert.equal(updated.markers.some((m) => m.id === "m_4_4"), false);
    assert.equal(original.markers.some((m) => m.id === "m_4_4"), true);
  });

  test("repairs a plan after interior deletion and restores 100% compliance", () => {
    const original = generatePlan(600, 900);
    const withHole = removeMarker(original, { row: 8, col: 7 });
    assert.equal(validatePlan(withHole).guidanceCheckMet, false);

    const repaired = repairPlan(withHole);
    assert.equal(repaired.markers.length, 280);

    const repairedVal = validatePlan(repaired);
    assert.equal(repairedVal.supported, true);
    assert.equal(repairedVal.targetMet, true);
    assert.equal(repairedVal.guidanceCheckMet, true);
    assert.equal(repairedVal.issues.length, 0);
  });

  test("is idempotent: repairing twice produces identical plan", () => {
    const original = generatePlan(600, 900);
    let broken = removeMarker(original, "m_2_3");
    broken = removeMarker(broken, "m_10_8");
    broken = removeMarker(broken, "m_0_0");
    assert.equal(broken.markers.length, 277);

    const repairOnce = repairPlan(broken);
    const repairTwice = repairPlan(repairOnce);

    assert.equal(repairOnce.markers.length, 280);
    assert.equal(repairTwice.markers.length, 280);
    assert.deepEqual(repairTwice.markers, repairOnce.markers);

    assert.equal(validatePlan(repairOnce).guidanceCheckMet, true);
    assert.equal(validatePlan(repairTwice).guidanceCheckMet, true);
  });

  test("repairs multiple missing cells and edge deletions", () => {
    const original = generatePlan(500, 500);
    let plan = original;
    plan = removeMarker(plan, { row: 0, col: 0 });
    plan = removeMarker(plan, { row: 0, col: plan.spec.columns - 1 });
    plan = removeMarker(plan, { row: plan.spec.rows - 1, col: 0 });
    plan = removeMarker(plan, { row: 3, col: 3 });

    assert.equal(validatePlan(plan).guidanceCheckMet, false);
    const repaired = repairPlan(plan);
    const val = validatePlan(repaired);
    assert.equal(val.guidanceCheckMet, true);
    assert.equal(val.targetMet, true);
    assert.equal(val.issues.length, 0);
  });
});

// 5. Adversarial Fixtures
describe("5. Adversarial Fixtures Suite", () => {
  test("fixture 1: complete row deletion fails with FULL_ROW_MISSING and full width gap", () => {
    const plan = generatePlan(600, 900);
    const surviving = plan.markers.filter((m) => m.row !== 5);
    const result = validatePlan({ ...plan, markers: surviving });
    assert.equal(result.guidanceCheckMet, false);
    assert.ok(result.issues.some((i) => i.code === "FULL_ROW_MISSING" && i.row === 5));
    assert.equal(result.maxClearGapXmm, 600);
  });

  test("fixture 2: complete column deletion fails with FULL_COLUMN_MISSING and full height gap", () => {
    const plan = generatePlan(600, 900);
    const surviving = plan.markers.filter((m) => m.col !== 7);
    const result = validatePlan({ ...plan, markers: surviving });
    assert.equal(result.guidanceCheckMet, false);
    assert.ok(result.issues.some((i) => i.code === "FULL_COLUMN_MISSING" && i.col === 7));
    assert.equal(result.maxClearGapYmm, 900);
  });

  test("fixture 3: duplicate cell in plan is caught and rejected", () => {
    const plan = generatePlan(600, 900);
    const dup: Marker = {
      ...plan.markers[0],
      id: "duplicate_clone",
      row: 2,
      col: 2,
      xMm: (2 + 0.5) * (600 / 14),
      yMm: (2 + 0.5) * (900 / 20),
    };
    const result = validatePlan({ ...plan, markers: [...plan.markers, dup] });
    assert.equal(result.targetMet, false);
    assert.equal(result.guidanceCheckMet, false);
    assert.ok(result.issues.some((i) => i.code === "DUPLICATE_CELL"));
  });

  test("fixture 4: marker outside pane boundary footprint is caught and rejected", () => {
    const plan = generatePlan(600, 900);
    const corrupted = plan.markers.map((m) =>
      m.id === "m_0_0" ? { ...m, xMm: 2.0 } : m
    );
    const result = validatePlan({ ...plan, markers: corrupted });
    assert.equal(result.guidanceCheckMet, false);
    assert.ok(result.issues.some((i) => i.code === "MARKER_OUT_OF_PANE"));
  });

  test("fixture 5: undersized dot diameter (< 6.35 mm) is rejected", () => {
    const plan = generatePlan(600, 900);
    const corrupted = plan.markers.map((m) =>
      m.id === "m_3_3" ? { ...m, diameterMm: 5.0 } : m
    );
    const result = validatePlan({ ...plan, markers: corrupted });
    assert.equal(result.targetMet, false);
    assert.equal(result.guidanceCheckMet, false);
    assert.ok(result.issues.some((i) => i.code === "UNDERSIZED_MARKER"));
  });

  test("fixture 6: off-grid shifted marker is detected", () => {
    const plan = generatePlan(600, 900);
    const corrupted = plan.markers.map((m) =>
      m.id === "m_4_4" ? { ...m, xMm: m.xMm + 5.0 } : m
    );
    const result = validatePlan({ ...plan, markers: corrupted });
    assert.equal(result.targetMet, false);
    assert.equal(result.guidanceCheckMet, false);
    assert.ok(result.issues.some((i) => i.code === "OFF_GRID_MARKER"));
  });

  test("fixture 7: empty plan is rejected with full untreated opening", () => {
    const emptyPlan = {
      paneWidthMm: 600,
      paneHeightMm: 900,
      markers: [],
    };
    const result = validatePlan(emptyPlan);
    assert.equal(result.supported, true);
    assert.equal(result.guidanceCheckMet, false);
    assert.ok(result.issues.some((i) => i.code === "EMPTY_PLAN"));
    assert.equal(result.maxClearGapXmm, 600);
    assert.equal(result.maxClearGapYmm, 900);
  });

  test("fixture 8: non-finite input dimensions (NaN, Infinity) return unsupported", () => {
    const nanRes = validatePlan({ paneWidthMm: NaN, paneHeightMm: 900, markers: [] });
    assert.equal(nanRes.supported, false);
    assert.ok(nanRes.issues.some((i) => i.code === "NON_FINITE_INPUT"));

    const infRes = validatePlan({ paneWidthMm: 600, paneHeightMm: Infinity, markers: [] });
    assert.equal(infRes.supported, false);
  });

  test("fixture 9: out-of-bounds dimensions return unsupported", () => {
    const smallRes = validatePlan({ paneWidthMm: 80, paneHeightMm: 900, markers: [] });
    assert.equal(smallRes.supported, false);
    assert.ok(smallRes.issues.some((i) => i.code === "INVALID_DIMENSIONS"));

    const bigRes = validatePlan({ paneWidthMm: 600, paneHeightMm: 3500, markers: [] });
    assert.equal(bigRes.supported, false);
  });

  test("fixture 10: non-finite marker coordinates are caught", () => {
    const plan = generatePlan(600, 900);
    const corrupted = plan.markers.map((m) =>
      m.id === "m_1_1" ? { ...m, xMm: NaN } : m
    );
    const result = validatePlan({ ...plan, markers: corrupted });
    assert.equal(result.guidanceCheckMet, false);
    assert.ok(result.issues.some((i) => i.code === "NON_FINITE_INPUT"));
  });
});

// 5b. Hostile Policy Tampering Suite
describe("5b. Hostile Policy Tampering Suite", () => {
  test("tampered dot diameter (5.0 mm) is rejected and SPEC_MISMATCH is caught", () => {
    const plan = generatePlan(600, 900);
    const tampered = {
      spec: { ...plan.spec, dotDiameterMm: 5.0 },
      markers: plan.markers.map((m) => ({ ...m, diameterMm: 5.0 })),
    };
    const res = validatePlan(tampered);
    assert.equal(res.guidanceCheckMet, false);
    assert.equal(res.targetMet, false);
    assert.ok(res.issues.some((i) => i.code === "UNDERSIZED_MARKER"));
    assert.ok(res.issues.some((i) => i.code === "SPEC_MISMATCH"));
  });

  test("tampered target pitch (60 mm) cannot pass validator", () => {
    const plan = generatePlan(600, 900);
    const tampered = { ...plan, spec: { ...plan.spec, targetPitchMm: 60 } };
    const res = validatePlan(tampered);
    assert.equal(res.targetMet, false);
    assert.equal(res.guidanceCheckMet, false);
    assert.ok(res.issues.some((i) => i.code === "SPEC_MISMATCH"));
  });

  test("tampered guidance clear gap (999 mm) still enforces 50.8 mm threshold", () => {
    const plan = generatePlan(600, 900);
    const withHole = removeMarker(plan, { row: 8, col: 7 });
    const tampered = { ...withHole, spec: { ...withHole.spec, guidanceClearGapMm: 999 } };
    const res = validatePlan(tampered);
    assert.equal(res.guidanceCheckMet, false);
    assert.ok(res.issues.some((i) => i.code === "SPEC_MISMATCH"));
    assert.ok(res.issues.some((i) => i.code === "GUIDANCE_CLEAR_GAP_EXCEEDED"));
  });

  test("corrupted rows/columns in spec are caught as SPEC_MISMATCH", () => {
    const plan = generatePlan(600, 900);
    const tampered = { ...plan, spec: { ...plan.spec, rows: 10, columns: 7 } };
    const res = validatePlan(tampered);
    assert.equal(res.targetMet, false);
    assert.equal(res.guidanceCheckMet, false);
    assert.ok(res.issues.some((i) => i.code === "SPEC_MISMATCH"));
  });

  test("repairPlan restores canonical plan from corrupted input and is idempotent", () => {
    const corrupted = {
      spec: {
        paneWidthMm: 600,
        paneHeightMm: 900,
        targetPitchMm: 60,
        guidanceClearGapMm: 999,
        dotDiameterMm: 5.0,
        rows: 5,
        columns: 5,
      },
      markers: [{ id: "bad", row: 0, col: 0, xMm: 12.3, yMm: 45.6, diameterMm: 5.0 }],
    };
    const rep1 = repairPlan(corrupted);
    assert.equal(rep1.spec.targetPitchMm, 45);
    assert.equal(rep1.spec.guidanceClearGapMm, 50.8);
    assert.equal(rep1.spec.dotDiameterMm, 6.35);
    assert.equal(rep1.spec.rows, 20);
    assert.equal(rep1.spec.columns, 14);
    assert.equal(rep1.markers.length, 280);

    const val1 = validatePlan(rep1);
    assert.equal(val1.targetMet, true);
    assert.equal(val1.guidanceCheckMet, true);
    assert.equal(val1.issues.length, 0);

    const rep2 = repairPlan(rep1);
    assert.deepEqual(rep2, rep1);
  });
});

// 6. Property-Based Testing
describe("6. Property-Based Testing", () => {
  test("verifies mathematical invariants across 100,000 seeded dimension pairs (scalar sweep)", () => {
    let state = 42;
    const nextRng = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
    const range = (min: number, max: number) => min + nextRng() * (max - min);

    const sampleSize = 100_000;
    for (let i = 0; i < sampleSize; i++) {
      const w = range(MIN_PANE_DIMENSION_MM, MAX_PANE_DIMENSION_MM);
      const h = range(MIN_PANE_DIMENSION_MM, MAX_PANE_DIMENSION_MM);

      const cols = Math.ceil(w / TARGET_PITCH_MM);
      const rows = Math.ceil(h / TARGET_PITCH_MM);

      const pitchX = w / cols;
      const pitchY = h / rows;

      assert.ok(pitchX <= TARGET_PITCH_MM + 1e-9);
      assert.ok(pitchY <= TARGET_PITCH_MM + 1e-9);

      const clearGapX = pitchX - DOT_DIAMETER_MM;
      const clearGapY = pitchY - DOT_DIAMETER_MM;
      assert.ok(clearGapX <= GUIDANCE_CLEAR_GAP_MM);
      assert.ok(clearGapY <= GUIDANCE_CLEAR_GAP_MM);

      const boundX = 0.5 * pitchX - DOT_DIAMETER_MM / 2;
      const boundY = 0.5 * pitchY - DOT_DIAMETER_MM / 2;
      assert.ok(boundX <= GUIDANCE_CLEAR_GAP_MM);
      assert.ok(boundY <= GUIDANCE_CLEAR_GAP_MM);

      assert.ok(cols >= 3);
      assert.ok(rows >= 3);
    }
  });

  test("verifies generator-validator-repair roundtrip across 200 bounded randomized plans", () => {
    let state = 2026;
    const nextRng = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
    const range = (min: number, max: number) => min + nextRng() * (max - min);
    const intRng = (min: number, max: number) => Math.floor(range(min, max + 1));

    const sampleSize = 200;
    for (let i = 0; i < sampleSize; i++) {
      const w = range(100, 1000);
      const h = range(100, 1000);

      const plan = generatePlan(w, h);
      const total = plan.spec.rows * plan.spec.columns;
      assert.equal(plan.markers.length, total);

      const intactVal = validatePlan(plan);
      assert.equal(intactVal.supported, true);
      assert.equal(intactVal.targetMet, true);
      assert.equal(intactVal.guidanceCheckMet, true);
      assert.equal(intactVal.issues.length, 0);

      const idx = intRng(0, plan.markers.length - 1);
      const target = plan.markers[idx];
      const broken = removeMarker(plan, target.id);
      assert.equal(broken.markers.length, total - 1);

      const brokenVal = validatePlan(broken);
      assert.equal(brokenVal.targetMet, false);
      assert.equal(brokenVal.guidanceCheckMet, false);
      assert.ok(brokenVal.issues.some((iss) => iss.code === "MISSING_CELL"));

      const repaired = repairPlan(broken);
      assert.equal(repaired.markers.length, total);
      const repVal = validatePlan(repaired);
      assert.equal(repVal.supported, true);
      assert.equal(repVal.targetMet, true);
      assert.equal(repVal.guidanceCheckMet, true);
      assert.equal(repVal.issues.length, 0);
    }
  });
});

// 7. Display Transform
describe("7. Display Transform (object-fit: contain)", () => {
  test("calculates pillarboxing offsets when container is wider than image", () => {
    const fit = computeDisplayFit(
      { containerWidth: 1000, containerHeight: 500 },
      { intrinsicWidth: 500, intrinsicHeight: 500 }
    );
    assert.equal(fit.imageScale, 1.0);
    assert.equal(fit.displayWidth, 500);
    assert.equal(fit.displayHeight, 500);
    assert.equal(fit.offsetX, 250);
    assert.equal(fit.offsetY, 0);
  });

  test("calculates letterboxing offsets when container is taller than image", () => {
    const fit = computeDisplayFit(
      { containerWidth: 400, containerHeight: 800 },
      { intrinsicWidth: 1000, intrinsicHeight: 1000 }
    );
    assert.equal(fit.imageScale, 0.4);
    assert.equal(fit.displayWidth, 400);
    assert.equal(fit.displayHeight, 400);
    assert.equal(fit.offsetX, 0);
    assert.equal(fit.offsetY, 200);
  });

  test("accurately maps pointer coordinate inside image to intrinsic coordinates", () => {
    const container = { containerWidth: 1000, containerHeight: 600 };
    const intrinsic = { intrinsicWidth: 1920, intrinsicHeight: 1080 };
    const { point, isInsideImage } = containerToIntrinsic(
      { x: 500, y: 300 },
      container,
      intrinsic
    );
    assert.equal(isInsideImage, true);
    assert.ok(Math.abs(point.x - 960) < 1e-4);
    assert.ok(Math.abs(point.y - 540) < 1e-4);
  });

  test("flags clicks in letterbox margins as outside image", () => {
    const container = { containerWidth: 1000, containerHeight: 500 };
    const intrinsic = { intrinsicWidth: 500, intrinsicHeight: 500 };
    const leftClick = containerToIntrinsic({ x: 100, y: 250 }, container, intrinsic);
    assert.equal(leftClick.isInsideImage, false);
    const rightClick = containerToIntrinsic({ x: 900, y: 250 }, container, intrinsic);
    assert.equal(rightClick.isInsideImage, false);
  });

  test("preserves exact roundtrip mapping between intrinsic and container coordinates", () => {
    const container = { containerWidth: 800, containerHeight: 600 };
    const intrinsic = { intrinsicWidth: 4032, intrinsicHeight: 3024 };
    const testPoints = [
      { x: 0, y: 0 },
      { x: 4032, y: 0 },
      { x: 4032, y: 3024 },
      { x: 0, y: 3024 },
      { x: 2016, y: 1512 },
    ];
    for (const pt of testPoints) {
      const containerPt = intrinsicToContainer(pt, container, intrinsic);
      const back = containerToIntrinsic(containerPt, container, intrinsic);
      assert.equal(back.isInsideImage, true);
      assert.ok(Math.abs(back.point.x - pt.x) < 1e-4);
      assert.ok(Math.abs(back.point.y - pt.y) < 1e-4);
    }
  });
});

// 8. Quad & Projective Homography
describe("8. Quadrilateral & Projective Homography", () => {
  test("accepts valid convex quadrilaterals and computes area", () => {
    const quad: Quad = [
      { x: 100, y: 100 },
      { x: 500, y: 120 },
      { x: 480, y: 400 },
      { x: 120, y: 380 },
    ];
    assert.equal(isConvexQuad(quad), true);
    assert.equal(validateQuad(quad).valid, true);
    assert.ok(computeQuadArea(quad) > 100);
  });

  test("rejects self-intersecting hourglass quadrilaterals", () => {
    const hourglass: Quad = [
      { x: 100, y: 100 },
      { x: 500, y: 400 },
      { x: 500, y: 100 },
      { x: 100, y: 400 },
    ];
    assert.equal(isConvexQuad(hourglass), false);
    assert.equal(validateQuad(hourglass).valid, false);
  });

  test("orders arbitrary quad points into canonical clockwise order starting at top-left", () => {
    const unordered = [
      { x: 450, y: 420 },
      { x: 100, y: 100 },
      { x: 80, y: 400 },
      { x: 480, y: 110 },
    ];
    const ordered = orderQuadPoints(unordered);
    assert.deepEqual(ordered[0], { x: 100, y: 100 });
    assert.deepEqual(ordered[1], { x: 480, y: 110 });
    assert.deepEqual(ordered[2], { x: 450, y: 420 });
    assert.deepEqual(ordered[3], { x: 80, y: 400 });
  });

  test("maps all 4 physical corners exactly to image quad corners", () => {
    const W = 600;
    const H = 900;
    const imageQuad: Quad = [
      { x: 150, y: 100 },
      { x: 850, y: 140 },
      { x: 920, y: 1100 },
      { x: 120, y: 1050 },
    ];
    const H_mat = computePaneHomography(W, H, imageQuad);

    const p0 = applyHomography(H_mat, { x: 0, y: 0 });
    assert.ok(Math.abs(p0.x - imageQuad[0].x) < 1e-4);
    assert.ok(Math.abs(p0.y - imageQuad[0].y) < 1e-4);

    const p1 = applyHomography(H_mat, { x: W, y: 0 });
    assert.ok(Math.abs(p1.x - imageQuad[1].x) < 1e-4);
    assert.ok(Math.abs(p1.y - imageQuad[1].y) < 1e-4);

    const p2 = applyHomography(H_mat, { x: W, y: H });
    assert.ok(Math.abs(p2.x - imageQuad[2].x) < 1e-4);
    assert.ok(Math.abs(p2.y - imageQuad[2].y) < 1e-4);

    const p3 = applyHomography(H_mat, { x: 0, y: H });
    assert.ok(Math.abs(p3.x - imageQuad[3].x) < 1e-4);
    assert.ok(Math.abs(p3.y - imageQuad[3].y) < 1e-4);
  });

  test("verifies interior correspondence mapping", () => {
    const W = 500;
    const H = 1000;
    const imageQuad: Quad = [
      { x: 100, y: 200 },
      { x: 600, y: 200 },
      { x: 600, y: 1200 },
      { x: 100, y: 1200 },
    ];
    const H_mat = computePaneHomography(W, H, imageQuad);

    const center = applyHomography(H_mat, { x: 250, y: 500 });
    assert.ok(Math.abs(center.x - 350) < 1e-4);
    assert.ok(Math.abs(center.y - 700) < 1e-4);

    const pt = applyHomography(H_mat, { x: 100, y: 200 });
    assert.ok(Math.abs(pt.x - 200) < 1e-4);
    assert.ok(Math.abs(pt.y - 400) < 1e-4);
  });

  test("verifies inverse homography accurately maps image coordinates back to physical coordinates", () => {
    const W = 800;
    const H = 1200;
    const imageQuad: Quad = [
      { x: 200, y: 150 },
      { x: 1000, y: 220 },
      { x: 1100, y: 1400 },
      { x: 150, y: 1350 },
    ];
    const H_fwd = computePaneHomography(W, H, imageQuad);
    const H_inv = invertHomography(H_fwd);

    const testPts = [
      { x: 0, y: 0 },
      { x: 800, y: 0 },
      { x: 800, y: 1200 },
      { x: 0, y: 1200 },
      { x: 400, y: 600 },
      { x: 123.45, y: 678.9 },
    ];

    for (const physPt of testPts) {
      const imgPt = applyHomography(H_fwd, physPt);
      const backPt = applyHomography(H_inv, imgPt);
      assert.ok(Math.abs(backPt.x - physPt.x) < 1e-4);
      assert.ok(Math.abs(backPt.y - physPt.y) < 1e-4);
    }
  });
});

console.log(`\n========================================`);
console.log(`WINGGAP VERIFICATION SUITE COMPLETE`);
console.log(`Total tests executed: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${totalTests - passedTests}`);
console.log(`========================================\n`);
