/**
 * WingGap Units & Dimension Validation Module
 * Status: LOCKED
 *
 * Supports mm, cm, in conversions and verifies physical pane bounds (100–3000 mm).
 */

import {
  MIN_PANE_DIMENSION_MM,
  MAX_PANE_DIMENSION_MM,
} from "../grid/spec.ts";

export type MeasurementUnit = "mm" | "cm" | "in";

export const MM_PER_CM = 10.0;
export const MM_PER_INCH = 25.4;

export function toMm(value: number, unit: MeasurementUnit): number {
  if (!Number.isFinite(value)) {
    return NaN;
  }
  switch (unit) {
    case "mm":
      return value;
    case "cm":
      return value * MM_PER_CM;
    case "in":
      return value * MM_PER_INCH;
    default:
      return NaN;
  }
}

export function fromMm(valueMm: number, targetUnit: MeasurementUnit): number {
  if (!Number.isFinite(valueMm)) {
    return NaN;
  }
  switch (targetUnit) {
    case "mm":
      return valueMm;
    case "cm":
      return valueMm / MM_PER_CM;
    case "in":
      return valueMm / MM_PER_INCH;
    default:
      return NaN;
  }
}

export interface DimensionValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateSingleDimension(
  valueMm: number,
  label: "Width" | "Height"
): DimensionValidationResult {
  if (!Number.isFinite(valueMm)) {
    return {
      valid: false,
      reason: `${label} must be a finite number.`,
    };
  }
  if (valueMm <= 0) {
    return {
      valid: false,
      reason: `${label} must be greater than zero.`,
    };
  }
  if (valueMm < MIN_PANE_DIMENSION_MM || valueMm > MAX_PANE_DIMENSION_MM) {
    return {
      valid: false,
      reason: `${label} (${valueMm.toFixed(1)} mm) is outside the supported range of ${MIN_PANE_DIMENSION_MM} mm to ${MAX_PANE_DIMENSION_MM} mm.`,
    };
  }
  return { valid: true };
}

export function validatePaneDimensions(
  widthMm: number,
  heightMm: number
): DimensionValidationResult {
  const widthCheck = validateSingleDimension(widthMm, "Width");
  if (!widthCheck.valid) {
    return widthCheck;
  }
  const heightCheck = validateSingleDimension(heightMm, "Height");
  if (!heightCheck.valid) {
    return heightCheck;
  }
  return { valid: true };
}
