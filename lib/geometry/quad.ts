/**
 * WingGap Quadrilateral Geometry & Validation Module
 * Status: LOCKED
 *
 * Implements quad ordering, convexity verification, degeneracy rejection,
 * and self-intersection prevention for pane corner selections.
 */

import type { Point2D } from "../camera/displayTransform.ts";

export type Quad = [Point2D, Point2D, Point2D, Point2D];

const EPSILON = 1e-6;
const MIN_QUAD_AREA_PX = 100.0;

/**
 * Calculates signed polygon area using the Shoelace formula.
 */
export function computeQuadArea(quad: Quad): number {
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    area += quad[i].x * quad[next].y - quad[next].x * quad[i].y;
  }
  return Math.abs(area) * 0.5;
}

/**
 * Checks whether a 4-point polygon is strictly convex and non-degenerate.
 * Consecutive cross products must all have the same non-zero sign.
 */
export function isConvexQuad(quad: Quad): boolean {
  for (const pt of quad) {
    if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) {
      return false;
    }
  }

  let positiveCount = 0;
  let negativeCount = 0;

  for (let i = 0; i < 4; i++) {
    const p0 = quad[i];
    const p1 = quad[(i + 1) % 4];
    const p2 = quad[(i + 2) % 4];

    const dx1 = p1.x - p0.x;
    const dy1 = p1.y - p0.y;
    const dx2 = p2.x - p1.x;
    const dy2 = p2.y - p1.y;

    const cross = dx1 * dy2 - dy1 * dx2;

    if (Math.abs(cross) < EPSILON) {
      // Collinear adjacent edges -> degenerate
      return false;
    }

    if (cross > 0) {
      positiveCount++;
    } else {
      negativeCount++;
    }
  }

  // All 4 cross products must have identical sign for strict convexity
  return positiveCount === 4 || negativeCount === 4;
}

export interface QuadValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateQuad(quad: Quad): QuadValidationResult {
  for (let i = 0; i < 4; i++) {
    const pt = quad[i];
    if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) {
      return {
        valid: false,
        reason: `Corner ${i + 1} contains non-finite coordinates.`,
      };
    }
  }

  // Check distinct points
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const dist = Math.hypot(quad[i].x - quad[j].x, quad[i].y - quad[j].y);
      if (dist < 1.0) {
        return {
          valid: false,
          reason: `Corner ${i + 1} and Corner ${j + 1} are too close together.`,
        };
      }
    }
  }

  if (!isConvexQuad(quad)) {
    return {
      valid: false,
      reason: "Selected corners must form a convex, non-intersecting quadrilateral.",
    };
  }

  const area = computeQuadArea(quad);
  if (area < MIN_QUAD_AREA_PX) {
    return {
      valid: false,
      reason: `Quad area (${area.toFixed(1)} px²) is too small to represent a window pane.`,
    };
  }

  return { valid: true };
}

/**
 * Orders 4 arbitrary points into canonical clockwise order starting at top-left:
 * [Top-Left, Top-Right, Bottom-Right, Bottom-Left]
 */
export function orderQuadPoints(points: Point2D[]): Quad {
  if (points.length !== 4) {
    throw new Error("Exactly 4 points are required to order a quadrilateral.");
  }

  // Find centroid
  const cx = points.reduce((sum, p) => sum + p.x, 0) / 4;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / 4;

  // In screen coordinates (Y down), sorting by polar angle around centroid
  // produces clockwise orientation: top-left -> top-right -> bottom-right -> bottom-left.
  const sorted = [...points].sort((a, b) => {
    const angleA = Math.atan2(a.y - cy, a.x - cx);
    const angleB = Math.atan2(b.y - cy, b.x - cx);
    return angleA - angleB;
  });

  // Find the point closest to the top-left (minimizing x + y)
  let bestIndex = 0;
  let minScore = Infinity;
  for (let i = 0; i < 4; i++) {
    const score = sorted[i].x + sorted[i].y;
    if (score < minScore) {
      minScore = score;
      bestIndex = i;
    }
  }

  // Rotate array so bestIndex is at position 0
  const result: Point2D[] = [];
  for (let i = 0; i < 4; i++) {
    result.push(sorted[(bestIndex + i) % 4]);
  }

  return [result[0], result[1], result[2], result[3]];
}
