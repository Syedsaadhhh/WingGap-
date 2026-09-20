/**
 * WingGap Projective Homography Module
 * Status: LOCKED
 *
 * Computes 3x3 projective homography matrix mapping physical pane coordinates
 * [0, W] x [0, H] to captured-image quadrilateral coordinates.
 */

import type { Point2D } from "../camera/displayTransform.ts";
import { validateQuad } from "./quad.ts";
import type { Quad } from "./quad.ts";

export type Matrix3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

const EPSILON = 1e-10;

/**
 * Solves an 8x8 linear system A * h = b using Gaussian elimination with partial pivoting.
 */
function solve8x8(A: number[][], b: number[]): number[] {
  const n = 8;
  const M = A.map((row) => [...row]);
  const rhs = [...b];

  for (let k = 0; k < n; k++) {
    // Find pivot
    let maxRow = k;
    let maxVal = Math.abs(M[k][k]);
    for (let r = k + 1; r < n; r++) {
      const val = Math.abs(M[r][k]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = r;
      }
    }

    if (maxVal < EPSILON) {
      throw new Error("Degenerate point configuration: homography linear system is singular.");
    }

    // Swap rows
    if (maxRow !== k) {
      const tempRow = M[k];
      M[k] = M[maxRow];
      M[maxRow] = tempRow;

      const tempVal = rhs[k];
      rhs[k] = rhs[maxRow];
      rhs[maxRow] = tempVal;
    }

    // Eliminate below
    for (let i = k + 1; i < n; i++) {
      const factor = M[i][k] / M[k][k];
      for (let j = k; j < n; j++) {
        M[i][j] -= factor * M[k][j];
      }
      rhs[i] -= factor * rhs[k];
    }
  }

  // Back substitution
  const result = new Array<number>(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = rhs[i];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * result[j];
    }
    result[i] = sum / M[i][i];
  }

  return result;
}

/**
 * Computes 3x3 homography matrix H such that H * src[k] ~ dst[k] for k = 0..3.
 */
export function computeHomography(src: Quad, dst: Quad): Matrix3x3 {
  const A: number[][] = [];
  const b: number[] = [];

  for (let k = 0; k < 4; k++) {
    const x = src[k].x;
    const y = src[k].y;
    const u = dst[k].x;
    const v = dst[k].y;

    // Equation 1: h00*x + h01*y + h02 - u*x*h20 - u*y*h21 = u (assuming h22 = 1)
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);

    // Equation 2: h10*x + h11*y + h12 - v*x*h20 - v*y*h21 = v (assuming h22 = 1)
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }

  const h = solve8x8(A, b);

  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1.0],
  ];
}

/**
 * Computes the forward homography mapping physical pane rectangle [0, W] x [0, H]
 * to the 4 corners of the image quadrilateral in order:
 * [Top-Left, Top-Right, Bottom-Right, Bottom-Left].
 */
export function computePaneHomography(
  paneWidthMm: number,
  paneHeightMm: number,
  imageQuad: Quad
): Matrix3x3 {
  const quadCheck = validateQuad(imageQuad);
  if (!quadCheck.valid) {
    throw new Error(quadCheck.reason ?? "Invalid image quadrilateral.");
  }

  const physicalQuad: Quad = [
    { x: 0, y: 0 },
    { x: paneWidthMm, y: 0 },
    { x: paneWidthMm, y: paneHeightMm },
    { x: 0, y: paneHeightMm },
  ];

  return computeHomography(physicalQuad, imageQuad);
}

/**
 * Applies a 3x3 projective homography matrix to a 2D point.
 */
export function applyHomography(H: Matrix3x3, point: Point2D): Point2D {
  const x = point.x;
  const y = point.y;

  const w = H[2][0] * x + H[2][1] * y + H[2][2];
  if (Math.abs(w) < EPSILON) {
    throw new Error("Projective coordinate w is zero (point at infinity).");
  }

  return {
    x: (H[0][0] * x + H[0][1] * y + H[0][2]) / w,
    y: (H[1][0] * x + H[1][1] * y + H[1][2]) / w,
  };
}

/**
 * Inverts a 3x3 homography matrix.
 */
export function invertHomography(H: Matrix3x3): Matrix3x3 {
  const det =
    H[0][0] * (H[1][1] * H[2][2] - H[1][2] * H[2][1]) -
    H[0][1] * (H[1][0] * H[2][2] - H[1][2] * H[2][0]) +
    H[0][2] * (H[1][0] * H[2][1] - H[1][1] * H[2][0]);

  if (Math.abs(det) < EPSILON) {
    throw new Error("Homography matrix is singular and cannot be inverted.");
  }

  const invDet = 1.0 / det;

  const inv: Matrix3x3 = [
    [
      (H[1][1] * H[2][2] - H[1][2] * H[2][1]) * invDet,
      (H[0][2] * H[2][1] - H[0][1] * H[2][2]) * invDet,
      (H[0][1] * H[1][2] - H[0][2] * H[1][1]) * invDet,
    ],
    [
      (H[1][2] * H[2][0] - H[1][0] * H[2][2]) * invDet,
      (H[0][0] * H[2][2] - H[0][2] * H[2][0]) * invDet,
      (H[0][2] * H[1][0] - H[0][0] * H[1][2]) * invDet,
    ],
    [
      (H[1][0] * H[2][1] - H[1][1] * H[2][0]) * invDet,
      (H[0][1] * H[2][0] - H[0][0] * H[2][1]) * invDet,
      (H[0][0] * H[1][1] - H[0][1] * H[1][0]) * invDet,
    ],
  ];

  // Normalize so bottom-right element is 1.0 if non-zero
  if (Math.abs(inv[2][2]) > EPSILON) {
    const scale = 1.0 / inv[2][2];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        inv[r][c] *= scale;
      }
    }
  }

  return inv;
}
