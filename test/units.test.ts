import { describe, it, expect } from "vitest";
import {
  toMm,
  fromMm,
  validatePaneDimensions,
  validateSingleDimension,
  MM_PER_CM,
  MM_PER_INCH,
} from "@/lib/units";
import {
  MIN_PANE_DIMENSION_MM,
  MAX_PANE_DIMENSION_MM,
} from "@/lib/grid/spec";

describe("Units & Dimension Validation", () => {
  it("converts cm to mm accurately", () => {
    expect(toMm(60, "cm")).toBe(600);
    expect(toMm(90, "cm")).toBe(900);
    expect(fromMm(600, "cm")).toBe(60);
  });

  it("converts inches to mm accurately", () => {
    expect(toMm(1, "in")).toBe(25.4);
    expect(toMm(2, "in")).toBe(50.8);
    expect(fromMm(50.8, "in")).toBeCloseTo(2, 6);
  });

  it("handles mm identity conversion", () => {
    expect(toMm(45, "mm")).toBe(45);
    expect(fromMm(45, "mm")).toBe(45);
  });

  it("rejects non-finite conversions with NaN", () => {
    expect(toMm(NaN, "mm")).toBeNaN();
    expect(toMm(Infinity, "cm")).toBeNaN();
    expect(fromMm(NaN, "in")).toBeNaN();
  });

  it("validates dimensions within supported range [100, 3000] mm", () => {
    expect(validateSingleDimension(100, "Width").valid).toBe(true);
    expect(validateSingleDimension(3000, "Height").valid).toBe(true);
    expect(validateSingleDimension(600, "Width").valid).toBe(true);

    // Below minimum
    const belowMin = validateSingleDimension(99.9, "Width");
    expect(belowMin.valid).toBe(false);
    expect(belowMin.reason).toContain("outside the supported range");

    // Above maximum
    const aboveMax = validateSingleDimension(3000.1, "Height");
    expect(aboveMax.valid).toBe(false);
    expect(aboveMax.reason).toContain("outside the supported range");

    // Negative and zero
    expect(validateSingleDimension(0, "Width").valid).toBe(false);
    expect(validateSingleDimension(-10, "Height").valid).toBe(false);

    // Non-finite
    expect(validateSingleDimension(NaN, "Width").valid).toBe(false);
    expect(validateSingleDimension(Infinity, "Height").valid).toBe(false);
  });

  it("validates full pane dimensions (width and height)", () => {
    expect(validatePaneDimensions(600, 900).valid).toBe(true);
    expect(validatePaneDimensions(50, 900).valid).toBe(false);
    expect(validatePaneDimensions(600, 3500).valid).toBe(false);
    expect(validatePaneDimensions(NaN, 900).valid).toBe(false);
  });
});
