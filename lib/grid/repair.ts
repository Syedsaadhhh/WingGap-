/**
 * WingGap Inspector & Plan Repair Module
 * Status: LOCKED
 *
 * Provides pure digital plan manipulation: marker deletion and canonical restoration.
 * Repair is deterministic and idempotent.
 */

import type { GeneratedPlan, Marker } from "./spec.ts";

/**
 * Removes a specific marker by ID or row/col from a plan.
 * Pure function: does not mutate the input plan.
 */
export function removeMarker(
  plan: GeneratedPlan,
  target: string | { row: number; col: number }
): GeneratedPlan {
  const isMatch = (m: Marker): boolean => {
    if (typeof target === "string") {
      return m.id === target;
    }
    return m.row === target.row && m.col === target.col;
  };

  const survivingMarkers = plan.markers.filter((m) => !isMatch(m));

  return {
    spec: { ...plan.spec },
    markers: survivingMarkers,
  };
}

/**
 * Repairs a plan by restoring canonical markers for any missing or corrupted cells.
 * Deterministic and idempotent.
 */
export function repairPlan(plan: GeneratedPlan): GeneratedPlan {
  const { rows, columns, paneWidthMm, paneHeightMm, dotDiameterMm } = plan.spec;
  const pitchX = paneWidthMm / columns;
  const pitchY = paneHeightMm / rows;

  // Build a map of existing valid markers
  const existingMap = new Map<string, Marker>();
  for (const m of plan.markers) {
    const key = `${m.row}:${m.col}`;
    if (!existingMap.has(key)) {
      existingMap.set(key, m);
    }
  }

  const repairedMarkers: Marker[] = [];

  for (let r = 0; r < rows; r++) {
    const canonicalY = (r + 0.5) * pitchY;
    for (let c = 0; c < columns; c++) {
      const canonicalX = (c + 0.5) * pitchX;
      const key = `${r}:${c}`;
      const existing = existingMap.get(key);

      if (
        existing &&
        Math.abs(existing.xMm - canonicalX) < 1e-4 &&
        Math.abs(existing.yMm - canonicalY) < 1e-4 &&
        Math.abs(existing.diameterMm - dotDiameterMm) < 1e-4
      ) {
        repairedMarkers.push(existing);
      } else {
        // Restore canonical marker
        repairedMarkers.push({
          id: `m_${r}_${c}`,
          row: r,
          col: c,
          xMm: canonicalX,
          yMm: canonicalY,
          diameterMm: dotDiameterMm,
        });
      }
    }
  }

  return {
    spec: { ...plan.spec },
    markers: repairedMarkers,
  };
}
