import { describe, it, expect } from "vitest";
import { generatePlan } from "@/lib/grid/generate";
import { validatePlan } from "@/lib/grid/validate";
import { removeMarker, repairPlan } from "@/lib/grid/repair";
import {
  DOT_DIAMETER_MM,
  GUIDANCE_CLEAR_GAP_MM,
  MAX_PANE_DIMENSION_MM,
  MIN_PANE_DIMENSION_MM,
  TARGET_PITCH_MM,
} from "@/lib/grid/spec";

// Deterministic Linear Congruential Generator (LCG)
class DeterministicRNG {
  private state: number;

  constructor(seed = 1337) {
    this.state = seed;
  }

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
}

describe("Property-Based Invariant Verification", () => {
  it("verifies mathematical invariants across 100,000 seeded dimension pairs (scalar sweep)", () => {
    const rng = new DeterministicRNG(42);
    const sampleSize = 100_000;

    let checkedCount = 0;

    for (let i = 0; i < sampleSize; i++) {
      const w = rng.range(MIN_PANE_DIMENSION_MM, MAX_PANE_DIMENSION_MM);
      const h = rng.range(MIN_PANE_DIMENSION_MM, MAX_PANE_DIMENSION_MM);

      const cols = Math.ceil(w / TARGET_PITCH_MM);
      const rows = Math.ceil(h / TARGET_PITCH_MM);

      const pitchX = w / cols;
      const pitchY = h / rows;

      const clearGapX = pitchX - DOT_DIAMETER_MM;
      const clearGapY = pitchY - DOT_DIAMETER_MM;
      const boundaryX = 0.5 * pitchX - DOT_DIAMETER_MM / 2;
      const boundaryY = 0.5 * pitchY - DOT_DIAMETER_MM / 2;

      // Invariant checks
      if (pitchX > TARGET_PITCH_MM + 1e-9) {
        throw new Error(`pitchX exceeded: ${pitchX}`);
      }
      if (pitchY > TARGET_PITCH_MM + 1e-9) {
        throw new Error(`pitchY exceeded: ${pitchY}`);
      }
      if (clearGapX > GUIDANCE_CLEAR_GAP_MM) {
        throw new Error(`clearGapX exceeded: ${clearGapX}`);
      }
      if (clearGapY > GUIDANCE_CLEAR_GAP_MM) {
        throw new Error(`clearGapY exceeded: ${clearGapY}`);
      }
      if (boundaryX > GUIDANCE_CLEAR_GAP_MM) {
        throw new Error(`boundaryX exceeded: ${boundaryX}`);
      }
      if (boundaryY > GUIDANCE_CLEAR_GAP_MM) {
        throw new Error(`boundaryY exceeded: ${boundaryY}`);
      }
      if (cols < 3 || rows < 3) {
        throw new Error(`grid dimensions too small: ${cols}x${rows}`);
      }

      checkedCount++;
    }

    expect(checkedCount).toBe(sampleSize);
  });

  it("verifies generator-validator-repair roundtrip across 200 bounded randomized plans", () => {
    const rng = new DeterministicRNG(2026);
    const sampleSize = 200;

    for (let i = 0; i < sampleSize; i++) {
      // Keep pane dimension within [100, 1000] mm to bound marker counts and execution time
      const w = rng.range(100, 1000);
      const h = rng.range(100, 1000);

      // 1. Generate canonical plan
      const plan = generatePlan(w, h);
      const expectedTotal = plan.spec.rows * plan.spec.columns;
      expect(plan.markers.length).toBe(expectedTotal);

      // 2. Validate intact plan
      const intactVal = validatePlan(plan);
      expect(intactVal.supported).toBe(true);
      expect(intactVal.targetMet).toBe(true);
      expect(intactVal.guidanceCheckMet).toBe(true);
      expect(intactVal.issues.length).toBe(0);

      // 3. Randomly delete one marker
      const targetIndex = rng.int(0, plan.markers.length - 1);
      const targetMarker = plan.markers[targetIndex];
      const brokenPlan = removeMarker(plan, targetMarker.id);
      expect(brokenPlan.markers.length).toBe(expectedTotal - 1);

      // 4. Validate broken plan: must catch missing cell and fail
      const brokenVal = validatePlan(brokenPlan);
      expect(brokenVal.targetMet).toBe(false);
      expect(brokenVal.guidanceCheckMet).toBe(false);
      expect(brokenVal.issues.some((iss) => iss.code === "MISSING_CELL")).toBe(true);

      // 5. Repair plan: must restore 100% compliance
      const repairedPlan = repairPlan(brokenPlan);
      expect(repairedPlan.markers.length).toBe(expectedTotal);

      const repairedVal = validatePlan(repairedPlan);
      expect(repairedVal.supported).toBe(true);
      expect(repairedVal.targetMet).toBe(true);
      expect(repairedVal.guidanceCheckMet).toBe(true);
      expect(repairedVal.issues.length).toBe(0);
    }
  });
});
