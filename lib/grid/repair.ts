/**
 * WingGap Inspector & Plan Repair Module
 * Status: LOCKED
 *
 * Provides pure digital plan manipulation: marker deletion and canonical restoration.
 * Repair is deterministic and idempotent.
 */

import type { GeneratedPlan, Marker } from "./spec.ts";
import { generatePlan } from "./generate.ts";

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
 * Repairs a plan by restoring the canonical WingGap plan from locked constants.
 * Does not trust or preserve corrupted metadata, pitch, or off-grid positions.
 * Pure function: deterministic and idempotent.
 */
export function repairPlan(plan: GeneratedPlan): GeneratedPlan {
  return generatePlan(plan.spec.paneWidthMm, plan.spec.paneHeightMm);
}
