/**
 * WingGap Independent Plan Validator
 * Status: LOCKED
 *
 * Independently validates regular dot-grid plan against physical geometry.
 * Never trusts generator PASS metadata or precomputed spacing.
 */

import {
  DOT_DIAMETER_MM,
  GUIDANCE_CLEAR_GAP_MM,
  TARGET_PITCH_MM,
} from "./spec.ts";
import type {
  GeneratedPlan,
  Marker,
  ValidationIssue,
  ValidationResult,
} from "./spec.ts";
import { validatePaneDimensions } from "../units/index.ts";

export interface ValidatePlanInput {
  paneWidthMm: number;
  paneHeightMm: number;
  markers: Marker[];
}

const EPSILON = 1e-4;
const OFF_GRID_TOLERANCE_MM = 0.5;

export function validatePlan(
  input: GeneratedPlan | ValidatePlanInput
): ValidationResult {
  const paneWidthMm =
    "spec" in input ? input.spec.paneWidthMm : input.paneWidthMm;
  const paneHeightMm =
    "spec" in input ? input.spec.paneHeightMm : input.paneHeightMm;
  const markers = input.markers;

  const issues: ValidationIssue[] = [];

  // 1. Dimension Validation
  const dimCheck = validatePaneDimensions(paneWidthMm, paneHeightMm);
  if (!dimCheck.valid) {
    const isNonFinite =
      !Number.isFinite(paneWidthMm) || !Number.isFinite(paneHeightMm);
    issues.push({
      code: isNonFinite ? "NON_FINITE_INPUT" : "INVALID_DIMENSIONS",
      message: dimCheck.reason ?? "Invalid pane dimensions.",
    });

    return {
      supported: false,
      targetMet: false,
      guidanceCheckMet: false,
      maxCenterPitchXmm: 0,
      maxCenterPitchYmm: 0,
      maxClearGapXmm: 0,
      maxClearGapYmm: 0,
      maxBoundaryClearanceXmm: 0,
      maxBoundaryClearanceYmm: 0,
      issues,
    };
  }

  // 2. Expected Canonical Topology (Always derived from locked constants)
  const expectedCols = Math.ceil(paneWidthMm / TARGET_PITCH_MM);
  const expectedRows = Math.ceil(paneHeightMm / TARGET_PITCH_MM);
  const expectedPitchX = paneWidthMm / expectedCols;
  const expectedPitchY = paneHeightMm / expectedRows;

  // 3. Spec Integrity Check (Detect inconsistent/tampered GeneratedPlan metadata)
  if ("spec" in input && input.spec) {
    const spec = input.spec;

    if (Math.abs(spec.targetPitchMm - TARGET_PITCH_MM) > EPSILON) {
      issues.push({
        code: "SPEC_MISMATCH",
        message: `Plan spec.targetPitchMm (${spec.targetPitchMm}) does not match locked policy (${TARGET_PITCH_MM} mm).`,
        value: spec.targetPitchMm,
        threshold: TARGET_PITCH_MM,
      });
    }

    if (Math.abs(spec.guidanceClearGapMm - GUIDANCE_CLEAR_GAP_MM) > EPSILON) {
      issues.push({
        code: "SPEC_MISMATCH",
        message: `Plan spec.guidanceClearGapMm (${spec.guidanceClearGapMm}) does not match locked policy (${GUIDANCE_CLEAR_GAP_MM} mm).`,
        value: spec.guidanceClearGapMm,
        threshold: GUIDANCE_CLEAR_GAP_MM,
      });
    }

    if (Math.abs(spec.dotDiameterMm - DOT_DIAMETER_MM) > EPSILON) {
      issues.push({
        code: "SPEC_MISMATCH",
        message: `Plan spec.dotDiameterMm (${spec.dotDiameterMm}) does not match locked policy (${DOT_DIAMETER_MM} mm).`,
        value: spec.dotDiameterMm,
        threshold: DOT_DIAMETER_MM,
      });
    }

    if (spec.rows !== expectedRows) {
      issues.push({
        code: "SPEC_MISMATCH",
        message: `Plan spec.rows (${spec.rows}) does not match canonical rows (${expectedRows}).`,
        value: spec.rows,
        threshold: expectedRows,
      });
    }

    if (spec.columns !== expectedCols) {
      issues.push({
        code: "SPEC_MISMATCH",
        message: `Plan spec.columns (${spec.columns}) does not match canonical columns (${expectedCols}).`,
        value: spec.columns,
        threshold: expectedCols,
      });
    }
  }

  // 4. Empty Plan Check
  if (!markers || markers.length === 0) {
    issues.push({
      code: "EMPTY_PLAN",
      message: "Plan contains no markers. Entire pane is untreated.",
      value: 0,
    });
    return {
      supported: true,
      targetMet: false,
      guidanceCheckMet: false,
      maxCenterPitchXmm: paneWidthMm,
      maxCenterPitchYmm: paneHeightMm,
      maxClearGapXmm: paneWidthMm,
      maxClearGapYmm: paneHeightMm,
      maxBoundaryClearanceXmm: paneWidthMm,
      maxBoundaryClearanceYmm: paneHeightMm,
      issues,
    };
  }

  // 5. Marker-level Checks & Cell Map Population
  const cellMap = new Map<string, Marker>();
  const duplicateCells = new Set<string>();

  for (const marker of markers) {
    // Check non-finite
    if (
      !Number.isFinite(marker.xMm) ||
      !Number.isFinite(marker.yMm) ||
      !Number.isFinite(marker.diameterMm)
    ) {
      issues.push({
        code: "NON_FINITE_INPUT",
        message: `Marker ${marker.id} contains non-finite coordinates or diameter.`,
        markerId: marker.id,
        row: marker.row,
        col: marker.col,
      });
      continue;
    }

    // Check diameter
    if (marker.diameterMm < DOT_DIAMETER_MM - EPSILON) {
      issues.push({
        code: "UNDERSIZED_MARKER",
        message: `Marker ${marker.id} diameter (${marker.diameterMm} mm) is less than required minimum ${DOT_DIAMETER_MM} mm.`,
        markerId: marker.id,
        row: marker.row,
        col: marker.col,
        value: marker.diameterMm,
        threshold: DOT_DIAMETER_MM,
      });
    }

    // Check boundary footprint
    const leftEdge = marker.xMm - marker.diameterMm / 2;
    const rightEdge = marker.xMm + marker.diameterMm / 2;
    const topEdge = marker.yMm - marker.diameterMm / 2;
    const bottomEdge = marker.yMm + marker.diameterMm / 2;

    if (
      leftEdge < -EPSILON ||
      rightEdge > paneWidthMm + EPSILON ||
      topEdge < -EPSILON ||
      bottomEdge > paneHeightMm + EPSILON
    ) {
      issues.push({
        code: "MARKER_OUT_OF_PANE",
        message: `Marker ${marker.id} footprint extends outside pane boundaries.`,
        markerId: marker.id,
        row: marker.row,
        col: marker.col,
      });
    }

    // Check row/col bounds and off-grid coordinates
    if (
      marker.row < 0 ||
      marker.row >= expectedRows ||
      marker.col < 0 ||
      marker.col >= expectedCols
    ) {
      issues.push({
        code: "OFF_GRID_MARKER",
        message: `Marker ${marker.id} cell (${marker.row}, ${marker.col}) is outside expected grid bounds [0..${expectedRows - 1}, 0..${expectedCols - 1}].`,
        markerId: marker.id,
        row: marker.row,
        col: marker.col,
      });
    } else {
      const canonicalX = (marker.col + 0.5) * expectedPitchX;
      const canonicalY = (marker.row + 0.5) * expectedPitchY;
      if (
        Math.abs(marker.xMm - canonicalX) > OFF_GRID_TOLERANCE_MM ||
        Math.abs(marker.yMm - canonicalY) > OFF_GRID_TOLERANCE_MM
      ) {
        issues.push({
          code: "OFF_GRID_MARKER",
          message: `Marker ${marker.id} position (${marker.xMm.toFixed(2)}, ${marker.yMm.toFixed(2)}) deviates from canonical position (${canonicalX.toFixed(2)}, ${canonicalY.toFixed(2)}).`,
          markerId: marker.id,
          row: marker.row,
          col: marker.col,
        });
      }
    }

    // Duplicate check
    const cellKey = `${marker.row}:${marker.col}`;
    if (cellMap.has(cellKey)) {
      duplicateCells.add(cellKey);
      issues.push({
        code: "DUPLICATE_CELL",
        message: `Multiple markers defined for cell (${marker.row}, ${marker.col}).`,
        markerId: marker.id,
        row: marker.row,
        col: marker.col,
      });
    } else {
      cellMap.set(cellKey, marker);
    }
  }

  // 5. Inspect Every Expected Row
  let maxCenterPitchXmm = 0;
  let maxClearGapXmm = 0;
  let maxBoundaryClearanceXmm = 0;

  for (let r = 0; r < expectedRows; r++) {
    const rowMarkers: Marker[] = [];
    for (let c = 0; c < expectedCols; c++) {
      const key = `${r}:${c}`;
      const m = cellMap.get(key);
      if (m) {
        rowMarkers.push(m);
      } else {
        issues.push({
          code: "MISSING_CELL",
          message: `Missing marker at cell row ${r}, column ${c}.`,
          row: r,
          col: c,
        });
      }
    }

    if (rowMarkers.length === 0) {
      issues.push({
        code: "FULL_ROW_MISSING",
        message: `Entire row ${r} has no surviving markers.`,
        row: r,
      });
      maxClearGapXmm = Math.max(maxClearGapXmm, paneWidthMm);
      maxBoundaryClearanceXmm = Math.max(maxBoundaryClearanceXmm, paneWidthMm);
      continue;
    }

    // Sort surviving markers by xMm
    rowMarkers.sort((a, b) => a.xMm - b.xMm);

    // Left boundary clearance: distance from left edge (0) to first marker's left edge
    const leftBoundary = rowMarkers[0].xMm - rowMarkers[0].diameterMm / 2;
    maxBoundaryClearanceXmm = Math.max(maxBoundaryClearanceXmm, leftBoundary);
    if (leftBoundary > GUIDANCE_CLEAR_GAP_MM + EPSILON) {
      issues.push({
        code: "GUIDANCE_BOUNDARY_CLEARANCE_EXCEEDED",
        message: `Row ${r} left boundary clearance (${leftBoundary.toFixed(2)} mm) exceeds ${GUIDANCE_CLEAR_GAP_MM} mm.`,
        row: r,
        value: leftBoundary,
        threshold: GUIDANCE_CLEAR_GAP_MM,
      });
    }

    // Inter-marker spans along row
    for (let i = 0; i < rowMarkers.length - 1; i++) {
      const current = rowMarkers[i];
      const next = rowMarkers[i + 1];
      const centerSpan = next.xMm - current.xMm;
      const clearGap =
        centerSpan - (current.diameterMm / 2 + next.diameterMm / 2);

      maxCenterPitchXmm = Math.max(maxCenterPitchXmm, centerSpan);
      maxClearGapXmm = Math.max(maxClearGapXmm, clearGap);

      if (clearGap > GUIDANCE_CLEAR_GAP_MM + EPSILON) {
        issues.push({
          code: "GUIDANCE_CLEAR_GAP_EXCEEDED",
          message: `Row ${r} clear gap between col ${current.col} and ${next.col} (${clearGap.toFixed(2)} mm) exceeds ${GUIDANCE_CLEAR_GAP_MM} mm.`,
          row: r,
          value: clearGap,
          threshold: GUIDANCE_CLEAR_GAP_MM,
        });
      }
    }

    // Right boundary clearance: distance from last marker's right edge to right edge (paneWidthMm)
    const lastMarker = rowMarkers[rowMarkers.length - 1];
    const rightBoundary =
      paneWidthMm - (lastMarker.xMm + lastMarker.diameterMm / 2);
    maxBoundaryClearanceXmm = Math.max(maxBoundaryClearanceXmm, rightBoundary);
    if (rightBoundary > GUIDANCE_CLEAR_GAP_MM + EPSILON) {
      issues.push({
        code: "GUIDANCE_BOUNDARY_CLEARANCE_EXCEEDED",
        message: `Row ${r} right boundary clearance (${rightBoundary.toFixed(2)} mm) exceeds ${GUIDANCE_CLEAR_GAP_MM} mm.`,
        row: r,
        value: rightBoundary,
        threshold: GUIDANCE_CLEAR_GAP_MM,
      });
    }
  }

  // 6. Inspect Every Expected Column
  let maxCenterPitchYmm = 0;
  let maxClearGapYmm = 0;
  let maxBoundaryClearanceYmm = 0;

  for (let c = 0; c < expectedCols; c++) {
    const colMarkers: Marker[] = [];
    for (let r = 0; r < expectedRows; r++) {
      const key = `${r}:${c}`;
      const m = cellMap.get(key);
      if (m) {
        colMarkers.push(m);
      }
    }

    if (colMarkers.length === 0) {
      issues.push({
        code: "FULL_COLUMN_MISSING",
        message: `Entire column ${c} has no surviving markers.`,
        col: c,
      });
      maxClearGapYmm = Math.max(maxClearGapYmm, paneHeightMm);
      maxBoundaryClearanceYmm = Math.max(maxBoundaryClearanceYmm, paneHeightMm);
      continue;
    }

    // Sort surviving markers by yMm
    colMarkers.sort((a, b) => a.yMm - b.yMm);

    // Top boundary clearance: distance from top edge (0) to first marker's top edge
    const topBoundary = colMarkers[0].yMm - colMarkers[0].diameterMm / 2;
    maxBoundaryClearanceYmm = Math.max(maxBoundaryClearanceYmm, topBoundary);
    if (topBoundary > GUIDANCE_CLEAR_GAP_MM + EPSILON) {
      issues.push({
        code: "GUIDANCE_BOUNDARY_CLEARANCE_EXCEEDED",
        message: `Column ${c} top boundary clearance (${topBoundary.toFixed(2)} mm) exceeds ${GUIDANCE_CLEAR_GAP_MM} mm.`,
        col: c,
        value: topBoundary,
        threshold: GUIDANCE_CLEAR_GAP_MM,
      });
    }

    // Inter-marker spans along column
    for (let j = 0; j < colMarkers.length - 1; j++) {
      const current = colMarkers[j];
      const next = colMarkers[j + 1];
      const centerSpan = next.yMm - current.yMm;
      const clearGap =
        centerSpan - (current.diameterMm / 2 + next.diameterMm / 2);

      maxCenterPitchYmm = Math.max(maxCenterPitchYmm, centerSpan);
      maxClearGapYmm = Math.max(maxClearGapYmm, clearGap);

      if (clearGap > GUIDANCE_CLEAR_GAP_MM + EPSILON) {
        issues.push({
          code: "GUIDANCE_CLEAR_GAP_EXCEEDED",
          message: `Column ${c} clear gap between row ${current.row} and ${next.row} (${clearGap.toFixed(2)} mm) exceeds ${GUIDANCE_CLEAR_GAP_MM} mm.`,
          col: c,
          value: clearGap,
          threshold: GUIDANCE_CLEAR_GAP_MM,
        });
      }
    }

    // Bottom boundary clearance: distance from last marker's bottom edge to bottom edge (paneHeightMm)
    const lastMarker = colMarkers[colMarkers.length - 1];
    const bottomBoundary =
      paneHeightMm - (lastMarker.yMm + lastMarker.diameterMm / 2);
    maxBoundaryClearanceYmm = Math.max(maxBoundaryClearanceYmm, bottomBoundary);
    if (bottomBoundary > GUIDANCE_CLEAR_GAP_MM + EPSILON) {
      issues.push({
        code: "GUIDANCE_BOUNDARY_CLEARANCE_EXCEEDED",
        message: `Column ${c} bottom boundary clearance (${bottomBoundary.toFixed(2)} mm) exceeds ${GUIDANCE_CLEAR_GAP_MM} mm.`,
        col: c,
        value: bottomBoundary,
        threshold: GUIDANCE_CLEAR_GAP_MM,
      });
    }
  }

  // 7. Overall Compliance Determination
  const hasStructuralIssues = issues.some(
    (i) =>
      i.code === "INVALID_DIMENSIONS" ||
      i.code === "NON_FINITE_INPUT" ||
      i.code === "EMPTY_PLAN" ||
      i.code === "UNDERSIZED_MARKER" ||
      i.code === "MARKER_OUT_OF_PANE" ||
      i.code === "DUPLICATE_CELL" ||
      i.code === "OFF_GRID_MARKER" ||
      i.code === "MISSING_CELL" ||
      i.code === "FULL_ROW_MISSING" ||
      i.code === "FULL_COLUMN_MISSING" ||
      i.code === "SPEC_MISMATCH"
  );

  // Check target pitch
  const pitchExceeded =
    maxCenterPitchXmm > TARGET_PITCH_MM + EPSILON ||
    maxCenterPitchYmm > TARGET_PITCH_MM + EPSILON;

  if (pitchExceeded) {
    issues.push({
      code: "TARGET_PITCH_EXCEEDED",
      message: `Center pitch (X: ${maxCenterPitchXmm.toFixed(2)} mm, Y: ${maxCenterPitchYmm.toFixed(2)} mm) exceeds engineering target of ${TARGET_PITCH_MM} mm.`,
      threshold: TARGET_PITCH_MM,
    });
  }

  const targetMet = !hasStructuralIssues && !pitchExceeded;

  const guidanceSpacingViolated =
    maxClearGapXmm > GUIDANCE_CLEAR_GAP_MM + EPSILON ||
    maxClearGapYmm > GUIDANCE_CLEAR_GAP_MM + EPSILON ||
    maxBoundaryClearanceXmm > GUIDANCE_CLEAR_GAP_MM + EPSILON ||
    maxBoundaryClearanceYmm > GUIDANCE_CLEAR_GAP_MM + EPSILON;

  // Guidance check met requires no structural defects (like missing cells or undersized markers)
  // AND all clear axial gaps & boundary clearances <= 50.8 mm
  const guidanceCheckMet = !hasStructuralIssues && !guidanceSpacingViolated;

  return {
    supported: true,
    targetMet,
    guidanceCheckMet,
    maxCenterPitchXmm,
    maxCenterPitchYmm,
    maxClearGapXmm,
    maxClearGapYmm,
    maxBoundaryClearanceXmm,
    maxBoundaryClearanceYmm,
    issues,
  };
}
