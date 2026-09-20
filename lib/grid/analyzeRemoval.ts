/**
 * WingGap Inspector Deletion Analysis Helper
 *
 * Computes authoritative affected spacing metrics from actual surviving markers
 * after a marker deletion. Correctly distinguishes interior center-spans
 * from edge boundary clearances.
 */

import type { GeneratedPlan, ValidationResult } from "./spec.ts";
import { validatePlan } from "./validate.ts";
import { DOT_DIAMETER_MM, GUIDANCE_CLEAR_GAP_MM, TARGET_PITCH_MM } from "./spec.ts";

export interface RemovalAnalysis {
  mutatedPlan: GeneratedPlan;
  validation: ValidationResult;
  isEdgeDeletion: boolean;
  edgeType: "left" | "right" | "top" | "bottom" | null;
  metricType: "BOUNDARY_CLEARANCE" | "CENTER_SPAN";
  primaryMetricLabel: string;
  secondaryMetricLabel: string;
  affectedSpanMm: number;
  clearOpeningMm: number;
  guidanceCheckMet: boolean;
  targetMet: boolean;
  thresholdMm: number;
}

export function analyzeMarkerRemoval(
  mutatedPlan: GeneratedPlan,
  removedLocation: { row: number; col: number }
): RemovalAnalysis {
  const { row: targetRow, col: targetCol } = removedLocation;
  const { paneWidthMm, paneHeightMm, rows, columns } = mutatedPlan.spec;

  // Run authoritative validator
  const validation = validatePlan(mutatedPlan);

  // Check if removed marker was on the perimeter
  const isLeftEdge = targetCol === 0;
  const isRightEdge = targetCol === columns - 1;
  const isTopEdge = targetRow === 0;
  const isBottomEdge = targetRow === rows - 1;
  const isEdgeDeletion = isLeftEdge || isRightEdge || isTopEdge || isBottomEdge;

  // Surviving markers along affected row
  const survivingRow = mutatedPlan.markers
    .filter((m) => m.row === targetRow)
    .sort((a, b) => a.xMm - b.xMm);

  // Surviving markers along affected col
  const survivingCol = mutatedPlan.markers
    .filter((m) => m.col === targetCol)
    .sort((a, b) => a.yMm - b.yMm);

  if (isEdgeDeletion) {
    let edgeType: "left" | "right" | "top" | "bottom" = "left";
    let boundaryClearance = 0;
    let boundaryCenterDist = 0;

    if (isLeftEdge && survivingRow.length > 0) {
      edgeType = "left";
      const first = survivingRow[0];
      boundaryClearance = first.xMm - first.diameterMm / 2;
      boundaryCenterDist = first.xMm;
    } else if (isRightEdge && survivingRow.length > 0) {
      edgeType = "right";
      const last = survivingRow[survivingRow.length - 1];
      boundaryClearance = paneWidthMm - (last.xMm + last.diameterMm / 2);
      boundaryCenterDist = paneWidthMm - last.xMm;
    } else if (isTopEdge && survivingCol.length > 0) {
      edgeType = "top";
      const first = survivingCol[0];
      boundaryClearance = first.yMm - first.diameterMm / 2;
      boundaryCenterDist = first.yMm;
    } else if (isBottomEdge && survivingCol.length > 0) {
      edgeType = "bottom";
      const last = survivingCol[survivingCol.length - 1];
      boundaryClearance = paneHeightMm - (last.yMm + last.diameterMm / 2);
      boundaryCenterDist = paneHeightMm - last.yMm;
    }

    return {
      mutatedPlan,
      validation,
      isEdgeDeletion: true,
      edgeType,
      metricType: "BOUNDARY_CLEARANCE",
      primaryMetricLabel: "Affected boundary clearance",
      secondaryMetricLabel: "Clear glass to perimeter",
      affectedSpanMm: boundaryCenterDist,
      clearOpeningMm: boundaryClearance,
      guidanceCheckMet: validation.guidanceCheckMet,
      targetMet: validation.targetMet,
      thresholdMm: GUIDANCE_CLEAR_GAP_MM,
    };
  }

  // Interior deletion: calculate actual surviving span along row and column
  let spanX = 0;
  let gapX = 0;
  const prevRowMarker = survivingRow.filter((m) => m.col < targetCol).pop();
  const nextRowMarker = survivingRow.find((m) => m.col > targetCol);
  if (prevRowMarker && nextRowMarker) {
    spanX = nextRowMarker.xMm - prevRowMarker.xMm;
    gapX = spanX - (prevRowMarker.diameterMm / 2 + nextRowMarker.diameterMm / 2);
  }

  let spanY = 0;
  let gapY = 0;
  const prevColMarker = survivingCol.filter((m) => m.row < targetRow).pop();
  const nextColMarker = survivingCol.find((m) => m.row > targetRow);
  if (prevColMarker && nextColMarker) {
    spanY = nextColMarker.yMm - prevColMarker.yMm;
    gapY = spanY - (prevColMarker.diameterMm / 2 + nextColMarker.diameterMm / 2);
  }

  const maxSpan = Math.max(spanX, spanY);
  const maxGap = Math.max(gapX, gapY);

  return {
    mutatedPlan,
    validation,
    isEdgeDeletion: false,
    edgeType: null,
    metricType: "CENTER_SPAN",
    primaryMetricLabel: "Affected center span",
    secondaryMetricLabel: "Clear glass between dots",
    affectedSpanMm: maxSpan,
    clearOpeningMm: maxGap,
    guidanceCheckMet: validation.guidanceCheckMet,
    targetMet: validation.targetMet,
    thresholdMm: GUIDANCE_CLEAR_GAP_MM,
  };
}
