/**
 * WingGap Canonical Grid Generator
 * Status: LOCKED
 *
 * Implements locked cell-centered regular dot grid for a planar rectangular pane.
 */

import {
  DOT_DIAMETER_MM,
  GUIDANCE_CLEAR_GAP_MM,
  TARGET_PITCH_MM,
} from "./spec.ts";
import type { GeneratedPlan, GridSpec, Marker } from "./spec.ts";
import { validatePaneDimensions } from "../units/index.ts";

export function generatePlan(paneWidthMm: number, paneHeightMm: number): GeneratedPlan {
  const dimensionCheck = validatePaneDimensions(paneWidthMm, paneHeightMm);
  if (!dimensionCheck.valid) {
    throw new Error(dimensionCheck.reason ?? "Invalid pane dimensions.");
  }

  const columns = Math.ceil(paneWidthMm / TARGET_PITCH_MM);
  const rows = Math.ceil(paneHeightMm / TARGET_PITCH_MM);

  const pitchX = paneWidthMm / columns;
  const pitchY = paneHeightMm / rows;

  const spec: GridSpec = {
    paneWidthMm,
    paneHeightMm,
    targetPitchMm: TARGET_PITCH_MM,
    guidanceClearGapMm: GUIDANCE_CLEAR_GAP_MM,
    dotDiameterMm: DOT_DIAMETER_MM,
    rows,
    columns,
  };

  const markers: Marker[] = [];

  for (let r = 0; r < rows; r++) {
    const yMm = (r + 0.5) * pitchY;
    for (let c = 0; c < columns; c++) {
      const xMm = (c + 0.5) * pitchX;
      markers.push({
        id: `m_${r}_${c}`,
        row: r,
        col: c,
        xMm,
        yMm,
        diameterMm: DOT_DIAMETER_MM,
      });
    }
  }

  return {
    spec,
    markers,
  };
}
