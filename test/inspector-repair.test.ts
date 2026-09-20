import { describe, it, expect } from "vitest";
import { generatePlan } from "@/lib/grid/generate";
import { validatePlan } from "@/lib/grid/validate";
import { removeMarker, repairPlan } from "@/lib/grid/repair";

describe("Inspector Operations & Plan Repair", () => {
  it("removes marker immutably without mutating original plan", () => {
    const original = generatePlan(600, 900);
    const updated = removeMarker(original, "m_4_4");

    expect(original.markers.length).toBe(280);
    expect(updated.markers.length).toBe(279);
    expect(updated.markers.some((m) => m.id === "m_4_4")).toBe(false);
    expect(original.markers.some((m) => m.id === "m_4_4")).toBe(true);
  });

  it("repairs a plan after interior deletion and restores 100% compliance", () => {
    const original = generatePlan(600, 900);
    const withHole = removeMarker(original, { row: 8, col: 7 });

    const brokenVal = validatePlan(withHole);
    expect(brokenVal.guidanceCheckMet).toBe(false);
    expect(brokenVal.targetMet).toBe(false);

    const repaired = repairPlan(withHole);
    expect(repaired.markers.length).toBe(280);

    const repairedVal = validatePlan(repaired);
    expect(repairedVal.supported).toBe(true);
    expect(repairedVal.targetMet).toBe(true);
    expect(repairedVal.guidanceCheckMet).toBe(true);
    expect(repairedVal.issues.length).toBe(0);
  });

  it("is idempotent: repairing twice produces identical plan", () => {
    const original = generatePlan(600, 900);
    let broken = removeMarker(original, "m_2_3");
    broken = removeMarker(broken, "m_10_8");
    broken = removeMarker(broken, "m_0_0");

    expect(broken.markers.length).toBe(277);

    const repairOnce = repairPlan(broken);
    const repairTwice = repairPlan(repairOnce);

    expect(repairOnce.markers.length).toBe(280);
    expect(repairTwice.markers.length).toBe(280);

    // Deep equality check between repairOnce and repairTwice
    expect(repairTwice.markers).toEqual(repairOnce.markers);
    expect(repairTwice.spec).toEqual(repairOnce.spec);

    const valOnce = validatePlan(repairOnce);
    const valTwice = validatePlan(repairTwice);

    expect(valOnce.guidanceCheckMet).toBe(true);
    expect(valTwice.guidanceCheckMet).toBe(true);
    expect(valTwice.issues).toEqual(valOnce.issues);
  });

  it("repairs multiple missing cells and edge deletions", () => {
    const original = generatePlan(500, 500);
    let plan = original;

    // Delete 5 markers including corners and edges
    plan = removeMarker(plan, { row: 0, col: 0 });
    plan = removeMarker(plan, { row: 0, col: plan.spec.columns - 1 });
    plan = removeMarker(plan, { row: plan.spec.rows - 1, col: 0 });
    plan = removeMarker(plan, { row: 3, col: 3 });
    plan = removeMarker(plan, { row: 4, col: 4 });

    const brokenVal = validatePlan(plan);
    expect(brokenVal.guidanceCheckMet).toBe(false);

    const repaired = repairPlan(plan);
    const repairedVal = validatePlan(repaired);

    expect(repairedVal.guidanceCheckMet).toBe(true);
    expect(repairedVal.targetMet).toBe(true);
    expect(repairedVal.issues.length).toBe(0);
  });
});
