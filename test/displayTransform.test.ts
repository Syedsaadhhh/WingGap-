import { describe, it, expect } from "vitest";
import {
  computeDisplayFit,
  containerToIntrinsic,
  intrinsicToContainer,
} from "@/lib/camera/displayTransform";

describe("Captured-Image Display Transform (object-fit: contain)", () => {
  it("calculates pillarboxing offsets when container is wider than image aspect ratio", () => {
    // 1000x500 container, 500x500 square image
    const fit = computeDisplayFit(
      { containerWidth: 1000, containerHeight: 500 },
      { intrinsicWidth: 500, intrinsicHeight: 500 }
    );

    expect(fit.imageScale).toBe(1.0);
    expect(fit.displayWidth).toBe(500);
    expect(fit.displayHeight).toBe(500);
    expect(fit.offsetX).toBe(250); // (1000 - 500) / 2
    expect(fit.offsetY).toBe(0);
  });

  it("calculates letterboxing offsets when container is taller than image aspect ratio", () => {
    // 400x800 container, 1000x1000 image
    const fit = computeDisplayFit(
      { containerWidth: 400, containerHeight: 800 },
      { intrinsicWidth: 1000, intrinsicHeight: 1000 }
    );

    expect(fit.imageScale).toBe(0.4); // min(400/1000, 800/1000) = 0.4
    expect(fit.displayWidth).toBe(400);
    expect(fit.displayHeight).toBe(400);
    expect(fit.offsetX).toBe(0);
    expect(fit.offsetY).toBe(200); // (800 - 400) / 2
  });

  it("accurately maps pointer click inside displayed image to intrinsic image coordinates", () => {
    const container = { containerWidth: 1000, containerHeight: 600 };
    const intrinsic = { intrinsicWidth: 1920, intrinsicHeight: 1080 };

    // Container center
    const { point, isInsideImage } = containerToIntrinsic(
      { x: 500, y: 300 },
      container,
      intrinsic
    );

    expect(isInsideImage).toBe(true);
    expect(point.x).toBeCloseTo(960, 4); // Intrinsic center X
    expect(point.y).toBeCloseTo(540, 4); // Intrinsic center Y
  });

  it("flags clicks in letterbox margins as outside image", () => {
    // Container 1000x500, intrinsic 500x500 (displayed from x = 250 to 750)
    const container = { containerWidth: 1000, containerHeight: 500 };
    const intrinsic = { intrinsicWidth: 500, intrinsicHeight: 500 };

    // Click at x = 100 (in left letterbox margin)
    const leftClick = containerToIntrinsic({ x: 100, y: 250 }, container, intrinsic);
    expect(leftClick.isInsideImage).toBe(false);

    // Click at x = 900 (in right letterbox margin)
    const rightClick = containerToIntrinsic({ x: 900, y: 250 }, container, intrinsic);
    expect(rightClick.isInsideImage).toBe(false);
  });

  it("preserves exact roundtrip mapping between intrinsic and container coordinates", () => {
    const container = { containerWidth: 800, containerHeight: 600 };
    const intrinsic = { intrinsicWidth: 4032, intrinsicHeight: 3024 };

    const testPoints = [
      { x: 0, y: 0 },
      { x: 4032, y: 0 },
      { x: 4032, y: 3024 },
      { x: 0, y: 3024 },
      { x: 2016, y: 1512 },
    ];

    for (const pt of testPoints) {
      const containerPt = intrinsicToContainer(pt, container, intrinsic);
      const mappedBack = containerToIntrinsic(containerPt, container, intrinsic);

      expect(mappedBack.isInsideImage).toBe(true);
      expect(mappedBack.point.x).toBeCloseTo(pt.x, 5);
      expect(mappedBack.point.y).toBeCloseTo(pt.y, 5);
    }
  });
});
