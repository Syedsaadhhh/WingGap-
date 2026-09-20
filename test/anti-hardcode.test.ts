import { describe, it, expect } from "vitest";
import { generatePlan } from "../lib/grid/generate.ts";
import { validatePlan } from "../lib/grid/validate.ts";

describe("Second-Input Anti-Hardcode Verification", () => {
  it("proves distinct physical inputs produce distinct canonical topologies and spacings", () => {
    // Input A: Medium residential sash window (480 mm × 720 mm)
    const inputA = { widthMm: 480, heightMm: 720 };
    const planA = generatePlan(inputA.widthMm, inputA.heightMm);
    const valA = validatePlan(planA);

    // Input B: Large commercial storefront lite (1250 mm × 1850 mm)
    const inputB = { widthMm: 1250, heightMm: 1850 };
    const planB = generatePlan(inputB.widthMm, inputB.heightMm);
    const valB = validatePlan(planB);

    // Mathematical distinction assertions
    expect(inputA.widthMm).not.toBe(inputB.widthMm);
    expect(inputA.heightMm).not.toBe(inputB.heightMm);

    expect(planA.spec.columns).not.toBe(planB.spec.columns);
    expect(planA.spec.rows).not.toBe(planB.spec.rows);
    expect(planA.markers.length).not.toBe(planB.markers.length);
    expect(valA.maxCenterPitchXmm).not.toBeCloseTo(valB.maxCenterPitchXmm, 2);
    expect(valA.maxCenterPitchYmm).not.toBeCloseTo(valB.maxCenterPitchYmm, 2);

    // Specific computed properties
    expect(planA.spec.columns).toBe(11);
    expect(planA.spec.rows).toBe(16);
    expect(planA.markers.length).toBe(176);
    expect(valA.maxCenterPitchXmm).toBeCloseTo(43.636, 3);
    expect(valA.maxCenterPitchYmm).toBeCloseTo(45.0, 3);

    expect(planB.spec.columns).toBe(28);
    expect(planB.spec.rows).toBe(42);
    expect(planB.markers.length).toBe(1176);
    expect(valB.maxCenterPitchXmm).toBeCloseTo(44.643, 3);
    expect(valB.maxCenterPitchYmm).toBeCloseTo(44.048, 3);

    // Both satisfy locked engineering targets
    expect(valA.targetMet).toBe(true);
    expect(valA.guidanceCheckMet).toBe(true);
    expect(valB.targetMet).toBe(true);
    expect(valB.guidanceCheckMet).toBe(true);
  });
});
