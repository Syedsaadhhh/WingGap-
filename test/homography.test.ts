import { describe, it, expect } from "vitest";
import {
  isConvexQuad,
  orderQuadPoints,
  validateQuad,
  Quad,
} from "@/lib/geometry/quad";
import {
  applyHomography,
  computeHomography,
  computePaneHomography,
  invertHomography,
} from "@/lib/geometry/homography";

describe("Quadrilateral Validation & Projective Homography", () => {
  describe("Quad Geometry Checks", () => {
    it("accepts valid convex quadrilaterals", () => {
      const quad: Quad = [
        { x: 100, y: 100 },
        { x: 500, y: 120 },
        { x: 480, y: 400 },
        { x: 120, y: 380 },
      ];
      expect(isConvexQuad(quad)).toBe(true);
      expect(validateQuad(quad).valid).toBe(true);
    });

    it("rejects self-intersecting hourglass quadrilaterals", () => {
      // Crossing diagonals instead of boundary edges
      const hourglass: Quad = [
        { x: 100, y: 100 },
        { x: 500, y: 400 },
        { x: 500, y: 100 },
        { x: 100, y: 400 },
      ];
      expect(isConvexQuad(hourglass)).toBe(false);
      expect(validateQuad(hourglass).valid).toBe(false);
    });

    it("rejects degenerate collinear or near-zero area quadrilaterals", () => {
      const collinear: Quad = [
        { x: 100, y: 100 },
        { x: 200, y: 200 },
        { x: 300, y: 300 },
        { x: 400, y: 400 },
      ];
      expect(isConvexQuad(collinear)).toBe(false);
      expect(validateQuad(collinear).valid).toBe(false);
    });

    it("orders arbitrary quad points into canonical clockwise order starting at top-left", () => {
      // Points given out of order
      const unordered = [
        { x: 450, y: 420 }, // bottom-right
        { x: 100, y: 100 }, // top-left
        { x: 80, y: 400 },  // bottom-left
        { x: 480, y: 110 }, // top-right
      ];

      const ordered = orderQuadPoints(unordered);
      expect(ordered[0]).toEqual({ x: 100, y: 100 }); // top-left
      expect(ordered[1]).toEqual({ x: 480, y: 110 }); // top-right
      expect(ordered[2]).toEqual({ x: 450, y: 420 }); // bottom-right
      expect(ordered[3]).toEqual({ x: 80, y: 400 });  // bottom-left
    });
  });

  describe("Homography Matrix & Mapping", () => {
    it("maps all 4 physical corners exactly to image quad corners", () => {
      const W = 600;
      const H = 900;
      const imageQuad: Quad = [
        { x: 150, y: 100 },
        { x: 850, y: 140 },
        { x: 920, y: 1100 },
        { x: 120, y: 1050 },
      ];

      const homography = computePaneHomography(W, H, imageQuad);

      // (0, 0) -> Top-Left
      const p0 = applyHomography(homography, { x: 0, y: 0 });
      expect(p0.x).toBeCloseTo(imageQuad[0].x, 4);
      expect(p0.y).toBeCloseTo(imageQuad[0].y, 4);

      // (W, 0) -> Top-Right
      const p1 = applyHomography(homography, { x: W, y: 0 });
      expect(p1.x).toBeCloseTo(imageQuad[1].x, 4);
      expect(p1.y).toBeCloseTo(imageQuad[1].y, 4);

      // (W, H) -> Bottom-Right
      const p2 = applyHomography(homography, { x: W, y: H });
      expect(p2.x).toBeCloseTo(imageQuad[2].x, 4);
      expect(p2.y).toBeCloseTo(imageQuad[2].y, 4);

      // (0, H) -> Bottom-Left
      const p3 = applyHomography(homography, { x: 0, y: H });
      expect(p3.x).toBeCloseTo(imageQuad[3].x, 4);
      expect(p3.y).toBeCloseTo(imageQuad[3].y, 4);
    });

    it("verifies interior correspondence mapping", () => {
      // Affine scaling and translation
      const W = 500;
      const H = 1000;
      const imageQuad: Quad = [
        { x: 100, y: 200 },
        { x: 600, y: 200 },
        { x: 600, y: 1200 },
        { x: 100, y: 1200 },
      ];

      const H_mat = computePaneHomography(W, H, imageQuad);

      // Midpoint (W/2, H/2)
      const center = applyHomography(H_mat, { x: 250, y: 500 });
      expect(center.x).toBeCloseTo(350, 4);
      expect(center.y).toBeCloseTo(700, 4);

      // Arbitrary interior point (100 mm, 200 mm)
      const pt = applyHomography(H_mat, { x: 100, y: 200 });
      expect(pt.x).toBeCloseTo(200, 4);
      expect(pt.y).toBeCloseTo(400, 4);
    });

    it("verifies inverse homography accurately maps image coordinates back to physical coordinates", () => {
      const W = 800;
      const H = 1200;
      const imageQuad: Quad = [
        { x: 200, y: 150 },
        { x: 1000, y: 220 },
        { x: 1100, y: 1400 },
        { x: 150, y: 1350 },
      ];

      const H_fwd = computePaneHomography(W, H, imageQuad);
      const H_inv = invertHomography(H_fwd);

      const testPhysicalPoints = [
        { x: 0, y: 0 },
        { x: 800, y: 0 },
        { x: 800, y: 1200 },
        { x: 0, y: 1200 },
        { x: 400, y: 600 },
        { x: 123.45, y: 678.9 },
      ];

      for (const physPt of testPhysicalPoints) {
        const imagePt = applyHomography(H_fwd, physPt);
        const reconstructedPhysPt = applyHomography(H_inv, imagePt);

        expect(reconstructedPhysPt.x).toBeCloseTo(physPt.x, 4);
        expect(reconstructedPhysPt.y).toBeCloseTo(physPt.y, 4);
      }
    });
  });
});
