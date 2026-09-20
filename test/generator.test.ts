import { describe, it, expect } from "vitest";
import { generatePlan } from "@/lib/grid/generate";
import {
  DOT_DIAMETER_MM,
  GUIDANCE_CLEAR_GAP_MM,
  TARGET_PITCH_MM,
} from "@/lib/grid/spec";

describe("Canonical Grid Generator", () => {
  it("generates exact 600 x 900 mm reference fixture", () => {
    const plan = generatePlan(600, 900);

    // Spec verification
    expect(plan.spec.paneWidthMm).toBe(600);
    expect(plan.spec.paneHeightMm).toBe(900);
    expect(plan.spec.columns).toBe(14);
    expect(plan.spec.rows).toBe(20);
    expect(plan.spec.targetPitchMm).toBe(TARGET_PITCH_MM);
    expect(plan.spec.guidanceClearGapMm).toBe(GUIDANCE_CLEAR_GAP_MM);
    expect(plan.spec.dotDiameterMm).toBe(DOT_DIAMETER_MM);

    // Total marker count
    expect(plan.markers.length).toBe(280);

    // Marker dimensions and spacing
    const pitchX = 600 / 14; // ≈ 42.857142857 mm
    const pitchY = 900 / 20; // 45.0 mm

    expect(pitchX).toBeCloseTo(42.857143, 5);
    expect(pitchY).toBe(45.0);

    // First marker (row 0, col 0)
    const first = plan.markers[0];
    expect(first.row).toBe(0);
    expect(first.col).toBe(0);
    expect(first.id).toBe("m_0_0");
    expect(first.diameterMm).toBe(6.35);
    expect(first.xMm).toBeCloseTo(0.5 * pitchX, 5); // ≈ 21.42857 mm
    expect(first.yMm).toBeCloseTo(0.5 * pitchY, 5); // 22.5 mm

    // Last marker (row 19, col 13)
    const last = plan.markers[plan.markers.length - 1];
    expect(last.row).toBe(19);
    expect(last.col).toBe(13);
    expect(last.id).toBe("m_19_13");
    expect(last.diameterMm).toBe(6.35);
    expect(last.xMm).toBeCloseTo(13.5 * pitchX, 5); // ≈ 578.5714 mm
    expect(last.yMm).toBeCloseTo(19.5 * pitchY, 5); // 877.5 mm
  });

  it("never exceeds 45.0 mm center pitch for intact panes", () => {
    // Test various standard pane dimensions
    const testCases = [
      { w: 100, h: 100 },
      { w: 450, h: 450 },
      { w: 500, h: 800 },
      { w: 1000, h: 1500 },
      { w: 1200, h: 2000 },
      { w: 3000, h: 3000 },
    ];

    for (const { w, h } of testCases) {
      const plan = generatePlan(w, h);
      const pitchX = w / plan.spec.columns;
      const pitchY = h / plan.spec.rows;
      expect(pitchX).toBeLessThanOrEqual(45.0 + 1e-9);
      expect(pitchY).toBeLessThanOrEqual(45.0 + 1e-9);
      expect(plan.markers.length).toBe(plan.spec.rows * plan.spec.columns);
    }
  });

  it("throws error for out-of-range dimensions", () => {
    expect(() => generatePlan(50, 900)).toThrow(/outside the supported range/);
    expect(() => generatePlan(600, 3500)).toThrow(/outside the supported range/);
    expect(() => generatePlan(NaN, 900)).toThrow(/finite/);
  });
});
