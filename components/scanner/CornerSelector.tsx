"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { CapturedFrame } from "./CameraCapture";
import {
  computeDisplayFit,
  containerToIntrinsic,
  intrinsicToContainer,
} from "../../lib/camera/displayTransform.ts";
import {
  orderQuadPoints,
  validateQuad,
  type Point,
  type Quad,
} from "../../lib/geometry/quad.ts";

interface CornerSelectorProps {
  frame: CapturedFrame;
  onCornersConfirmed: (corners: Quad) => void;
  onRetake: () => void;
}

export default function CornerSelector({
  frame,
  onCornersConfirmed,
  onRetake,
}: CornerSelectorProps) {
  const [corners, setCorners] = useState<Point[]>([]);
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Track container dimensions with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const intrinsic = {
    intrinsicWidth: frame.width,
    intrinsicHeight: frame.height,
  };

  const container = {
    containerWidth: containerSize.width || 600,
    containerHeight: containerSize.height || 450,
  };

  // Convert current intrinsic corners to container coordinates
  const screenCorners = corners.map((pt) =>
    intrinsicToContainer(pt, container, intrinsic)
  );

  // Validate quad if 4 corners are placed
  const isQuadComplete = corners.length === 4;
  const orderedCorners: Quad | null = isQuadComplete
    ? orderQuadPoints(corners)
    : null;
  const quadValidation = orderedCorners ? validateQuad(orderedCorners) : null;
  const isQuadValid = isQuadComplete && quadValidation?.valid === true;

  // Handle tap on image to place corners
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeDragIndex !== null) return;
    if (corners.length >= 4) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const pointerCss = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const { point, isInsideImage } = containerToIntrinsic(
      pointerCss,
      container,
      intrinsic
    );

    if (isInsideImage) {
      const updated = [...corners, point];
      if (updated.length === 4) {
        setCorners(orderQuadPoints(updated));
      } else {
        setCorners(updated);
      }
    }
  };

  // Drag interaction for corner refinement
  const handlePointerDownHandle = (index: number, e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveDragIndex(index);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activeDragIndex === null || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const pointerCss = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const { point } = containerToIntrinsic(pointerCss, container, intrinsic);

    // Clamp point within intrinsic image bounds
    const clampedX = Math.max(0, Math.min(frame.width, point.x));
    const clampedY = Math.max(0, Math.min(frame.height, point.y));

    setCorners((prev) => {
      const next = [...prev];
      next[activeDragIndex] = { x: clampedX, y: clampedY };
      return next;
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeDragIndex !== null) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setActiveDragIndex(null);
    }
  };

  const handleResetCorners = () => {
    setCorners([]);
  };

  const handleConfirm = () => {
    if (orderedCorners && isQuadValid) {
      onCornersConfirmed(orderedCorners);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Top Status & Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider bg-ink text-white px-2.5 py-1 rounded">
            CAPTURED FRAME
          </span>
          <span className="text-xs font-mono text-ink-secondary">
            {frame.width} × {frame.height} px
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleResetCorners}
            disabled={corners.length === 0}
            className="text-xs font-mono px-3 py-1.5 rounded border border-line bg-surface hover:bg-canvas disabled:opacity-40 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            Reset
          </button>
          <button
            onClick={onRetake}
            className="text-xs font-mono px-3 py-1.5 rounded border border-line bg-surface hover:bg-danger-soft hover:text-danger hover:border-danger/30 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          >
            Retake
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-black rounded-xl overflow-hidden shadow-md select-none touch-none cursor-crosshair border border-line"
      >
        {/* Frozen Frame Image (object-fit: contain) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frame.dataUrl}
          alt="Captured window frame"
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* Interactive SVG Geometry Overlay */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${container.containerWidth} ${container.containerHeight}`}
        >
          {/* Render polygon if 4 corners */}
          {screenCorners.length === 4 && (
            <polygon
              points={screenCorners.map((p) => `${p.x},${p.y}`).join(" ")}
              fill={isQuadValid ? "rgba(244, 201, 93, 0.15)" : "rgba(200, 77, 66, 0.2)"}
              stroke={isQuadValid ? "#F4C95D" : "#C84D42"}
              strokeWidth={isQuadValid ? "2.5" : "2"}
              strokeDasharray={isQuadValid ? undefined : "6,4"}
            />
          )}

          {/* Render lines between existing points while placing */}
          {screenCorners.length > 1 && screenCorners.length < 4 && (
            <polyline
              points={screenCorners.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="#F4C95D"
              strokeWidth="2"
              strokeDasharray="4,4"
            />
          )}

          {/* Render Corner Handles */}
          {screenCorners.map((pt, idx) => (
            <g
              key={`handle-${idx}`}
              className="pointer-events-auto cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => handlePointerDownHandle(idx, e)}
            >
              {/* Invisible large touch target hit area (52px diameter) */}
              <circle cx={pt.x} cy={pt.y} r="26" fill="transparent" />
              {/* Outer ring */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="9"
                fill="#171A17"
                stroke="#FAFAF6"
                strokeWidth="1.5"
              />
              {/* Inner amber indicator */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="6"
                fill={activeDragIndex === idx ? "#E5B63F" : "#F4C95D"}
              />
              {/* Index label */}
              <text
                x={pt.x + 14}
                y={pt.y - 8}
                fill="#F7F8F4"
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
                className="select-none filter drop-shadow"
              >
                C{idx + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Instruction Guidance & Action Bar */}
      <div className="bg-surface border border-line rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          {!isQuadComplete ? (
            <div>
              <p className="text-sm font-semibold text-ink">
                Tap the four pane corners ({corners.length}/4)
              </p>
              <p className="text-xs text-ink-secondary mt-0.5">
                Tap each corner of the rectangular glass pane clockwise starting top-left.
              </p>
            </div>
          ) : isQuadValid ? (
            <div>
              <p className="text-sm font-semibold text-protect flex items-center space-x-1.5">
                <span>✓</span>
                <span>Usable pane geometry confirmed</span>
              </p>
              <p className="text-xs text-ink-secondary mt-0.5">
                Drag handles to fine-tune placement along the glass edge if needed.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-danger flex items-center space-x-1.5">
                <span>⚠️</span>
                <span>Those points do not form a usable rectangular-pane projection.</span>
              </p>
              <p className="text-xs text-danger/90 mt-0.5">
                {quadValidation?.reason ?? "Ensure four convex corners around the perimeter."}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!isQuadValid}
          className="w-full sm:w-auto min-w-[160px] min-h-[48px] bg-protect text-white font-semibold text-sm rounded-lg hover:bg-protect/90 transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-protect flex items-center justify-center space-x-2"
        >
          <span>Use pane</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
