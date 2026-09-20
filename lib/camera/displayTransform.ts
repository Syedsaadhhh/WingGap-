/**
 * WingGap Display Transform Module
 * Status: LOCKED
 *
 * Implements deterministic coordinate mapping for frozen captured frames rendered
 * with `object-fit: contain`. Accounts for letterboxing offsets, scaling, and container bounds.
 */

export interface ContainerDimensions {
  containerWidth: number;
  containerHeight: number;
}

export interface IntrinsicDimensions {
  intrinsicWidth: number;
  intrinsicHeight: number;
}

export interface DisplayFit {
  imageScale: number;
  displayWidth: number;
  displayHeight: number;
  offsetX: number;
  offsetY: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export function computeDisplayFit(
  container: ContainerDimensions,
  intrinsic: IntrinsicDimensions
): DisplayFit {
  const { containerWidth, containerHeight } = container;
  const { intrinsicWidth, intrinsicHeight } = intrinsic;

  if (
    !Number.isFinite(containerWidth) ||
    !Number.isFinite(containerHeight) ||
    !Number.isFinite(intrinsicWidth) ||
    !Number.isFinite(intrinsicHeight) ||
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    intrinsicWidth <= 0 ||
    intrinsicHeight <= 0
  ) {
    throw new Error("Container and intrinsic dimensions must be positive finite numbers.");
  }

  const imageScale = Math.min(
    containerWidth / intrinsicWidth,
    containerHeight / intrinsicHeight
  );

  const displayWidth = intrinsicWidth * imageScale;
  const displayHeight = intrinsicHeight * imageScale;

  const offsetX = (containerWidth - displayWidth) / 2;
  const offsetY = (containerHeight - displayHeight) / 2;

  return {
    imageScale,
    displayWidth,
    displayHeight,
    offsetX,
    offsetY,
  };
}

/**
 * Maps a pointer coordinate (e.g. clientX, clientY from a pointer event)
 * relative to the container element into intrinsic image coordinates.
 */
export function containerToIntrinsic(
  containerPoint: Point2D,
  container: ContainerDimensions,
  intrinsic: IntrinsicDimensions
): { point: Point2D; isInsideImage: boolean } {
  const fit = computeDisplayFit(container, intrinsic);

  const imgX = (containerPoint.x - fit.offsetX) / fit.imageScale;
  const imgY = (containerPoint.y - fit.offsetY) / fit.imageScale;

  const isInsideImage =
    imgX >= 0 &&
    imgX <= intrinsic.intrinsicWidth &&
    imgY >= 0 &&
    imgY <= intrinsic.intrinsicHeight;

  return {
    point: { x: imgX, y: imgY },
    isInsideImage,
  };
}

/**
 * Maps an intrinsic image coordinate into container coordinates for overlay rendering.
 */
export function intrinsicToContainer(
  intrinsicPoint: Point2D,
  container: ContainerDimensions,
  intrinsic: IntrinsicDimensions
): Point2D {
  const fit = computeDisplayFit(container, intrinsic);

  return {
    x: fit.offsetX + intrinsicPoint.x * fit.imageScale,
    y: fit.offsetY + intrinsicPoint.y * fit.imageScale,
  };
}
