"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import type { CapturedFrame } from "./CameraCapture";
import type { Quad } from "../../lib/geometry/quad.ts";
import type { GeneratedPlan, Marker, ValidationResult } from "../../lib/grid/spec.ts";
import { validatePlan } from "../../lib/grid/validate.ts";
import { removeMarker, repairPlan } from "../../lib/grid/repair.ts";
import { analyzeMarkerRemoval, type RemovalAnalysis } from "../../lib/grid/analyzeRemoval.ts";
import { computePaneHomography, applyHomography } from "../../lib/geometry/homography.ts";
import { intrinsicToContainer, containerToIntrinsic } from "../../lib/camera/displayTransform.ts";
import { DOT_DIAMETER_MM, GUIDANCE_CLEAR_GAP_MM } from "../../lib/grid/spec.ts";

interface PlanInspectorProps {
  frame: CapturedFrame;
  corners: Quad;
  initialPlan: GeneratedPlan;
  onProceedToGuide: (finalPlan: GeneratedPlan) => void;
  onRetake: () => void;
  onBackToDimensions?: () => void;
}

interface ProjectedMarker {
  marker: Marker;
  screenX: number;
  screenY: number;
}

export default function PlanInspector({
  frame,
  corners,
  initialPlan,
  onProceedToGuide,
  onRetake,
  onBackToDimensions,
}: PlanInspectorProps) {
  const [plan, setPlan] = useState<GeneratedPlan>(initialPlan);
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [deletedInfo, setDeletedInfo] = useState<{
    row: number;
    col: number;
    analysis: RemovalAnalysis;
  } | null>(null);

  const [detailsExpanded, setDetailsExpanded] = useState(false);
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

  const containerWidth = containerSize.width || 600;
  const containerHeight = containerSize.height || 450;
  const intrinsicWidth = frame.width;
  const intrinsicHeight = frame.height;

  const container = useMemo(
    () => ({
      containerWidth,
      containerHeight,
    }),
    [containerWidth, containerHeight]
  );

  const intrinsic = useMemo(
    () => ({
      intrinsicWidth,
      intrinsicHeight,
    }),
    [intrinsicWidth, intrinsicHeight]
  );

  // Run authoritative validator
  const validation: ValidationResult = useMemo(() => {
    return validatePlan(plan);
  }, [plan]);

  // Compute homography from physical pane rectangle to intrinsic image quad
  const homography = useMemo(() => {
    return computePaneHomography(
      plan.spec.paneWidthMm,
      plan.spec.paneHeightMm,
      corners
    );
  }, [plan.spec.paneWidthMm, plan.spec.paneHeightMm, corners]);

  // Project physical markers to container screen coordinates
  const projectedMarkers: ProjectedMarker[] = useMemo(() => {
    return plan.markers.map((m) => {
      const intrinsicPt = applyHomography(homography, { x: m.xMm, y: m.yMm });
      const screenPt = intrinsicToContainer(intrinsicPt, container, intrinsic);
      return {
        marker: m,
        screenX: screenPt.x,
        screenY: screenPt.y,
      };
    });
  }, [plan.markers, homography, container, intrinsic]);

  // Nearest-marker hit testing on pointer click
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || projectedMarkers.length === 0) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickScreenX = e.clientX - rect.left;
    const clickScreenY = e.clientY - rect.top;

    let nearest: Marker | null = null;
    let minDistanceSq = Infinity;
    const HIT_RADIUS = 28; // 28 px screen radius
    const HIT_RADIUS_SQ = HIT_RADIUS * HIT_RADIUS;

    for (const pm of projectedMarkers) {
      const dx = pm.screenX - clickScreenX;
      const dy = pm.screenY - clickScreenY;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        nearest = pm.marker;
      }
    }

    if (minDistanceSq <= HIT_RADIUS_SQ && nearest) {
      setSelectedMarker(nearest);
    } else {
      setSelectedMarker(null);
    }
  };

  // Delete candidate marker from actual plan state
  const handleDeleteMarker = () => {
    if (!selectedMarker) return;

    const targetRow = selectedMarker.row;
    const targetCol = selectedMarker.col;

    const updated = removeMarker(plan, selectedMarker.id);
    const analysis = analyzeMarkerRemoval(updated, {
      row: targetRow,
      col: targetCol,
    });

    setPlan(updated);
    setSelectedMarker(null);
    setDeletedInfo({
      row: targetRow,
      col: targetCol,
      analysis,
    });
  };

  // Repair plan via canonical regeneration
  const handleRepairPlan = () => {
    const repaired = repairPlan(plan);
    setPlan(repaired);
    setDeletedInfo(null);
    setSelectedMarker(null);
  };

  const pitchX = plan.spec.paneWidthMm / plan.spec.columns;
  const pitchY = plan.spec.paneHeightMm / plan.spec.rows;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5">
      {/* Top Header & Context */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider bg-protect text-white px-2.5 py-1 rounded">
            PLAN INSPECTOR
          </span>
          <span className="text-xs font-mono text-ink-secondary">
            {plan.markers.length} of {plan.spec.rows * plan.spec.columns} markers active
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {onBackToDimensions && (
            <button
              onClick={onBackToDimensions}
              className="text-xs font-mono px-3 py-1.5 rounded border border-line bg-surface hover:bg-canvas transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              ← Edit dimensions
            </button>
          )}
          <button
            onClick={onRetake}
            className="text-xs font-mono px-3 py-1.5 rounded border border-line bg-surface hover:bg-canvas transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            Retake capture
          </button>
        </div>
      </div>

      {/* Main Projected Perspective Viewport */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-black rounded-xl overflow-hidden shadow-md select-none border border-line cursor-pointer"
      >
        {/* Frozen Frame Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frame.dataUrl}
          alt="Captured window frame"
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* Projected Marker & Measurement SVG Overlay */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${container.containerWidth} ${container.containerHeight}`}
        >
          {/* Highlight affected row and column if a marker was deleted */}
          {deletedInfo && (
            <g>
              {projectedMarkers
                .filter((pm) => pm.marker.row === deletedInfo.row)
                .map((pm, idx, arr) => {
                  if (idx === 0) return null;
                  const prev = arr[idx - 1];
                  return (
                    <line
                      key={`row-line-${pm.marker.id}`}
                      x1={prev.screenX}
                      y1={prev.screenY}
                      x2={pm.screenX}
                      y2={pm.screenY}
                      stroke="#C84D42"
                      strokeWidth="2.5"
                      strokeDasharray="4,3"
                    />
                  );
                })}
              {projectedMarkers
                .filter((pm) => pm.marker.col === deletedInfo.col)
                .map((pm, idx, arr) => {
                  if (idx === 0) return null;
                  const prev = arr[idx - 1];
                  return (
                    <line
                      key={`col-line-${pm.marker.id}`}
                      x1={prev.screenX}
                      y1={prev.screenY}
                      x2={pm.screenX}
                      y2={pm.screenY}
                      stroke="#C84D42"
                      strokeWidth="2.5"
                      strokeDasharray="4,3"
                    />
                  );
                })}
            </g>
          )}

          {/* Render all projected physical markers */}
          {projectedMarkers.map((pm) => {
            const isSelected = selectedMarker?.id === pm.marker.id;
            return (
              <g key={`pm-${pm.marker.id}`}>
                {/* Subtle dark halo for high contrast on bright glass */}
                <circle
                  cx={pm.screenX}
                  cy={pm.screenY}
                  r={isSelected ? "7.5" : "4.5"}
                  fill="rgba(0, 0, 0, 0.6)"
                />
                {/* Visual marker dot */}
                <circle
                  cx={pm.screenX}
                  cy={pm.screenY}
                  r={isSelected ? "5.5" : "3"}
                  fill={isSelected ? "#E5B63F" : "#FAFAF6"}
                  stroke={isSelected ? "#171A17" : "none"}
                  strokeWidth="1.5"
                />
                {/* Selected candidate ring */}
                {isSelected && (
                  <circle
                    cx={pm.screenX}
                    cy={pm.screenY}
                    r="12"
                    fill="none"
                    stroke="#F4C95D"
                    strokeWidth="2"
                    strokeDasharray="3,2"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Inspector Helper Hint */}
        <div className="absolute top-3 left-3 pointer-events-none bg-camera-chrome/80 px-3 py-1.5 rounded text-xs text-camera-text font-mono border border-white/20 backdrop-blur-sm">
          {selectedMarker
            ? `Selected: R${selectedMarker.row} · C${selectedMarker.col}`
            : "Tap near a dot to inspect"}
        </div>
      </div>

      {/* Selected Marker Candidate Action Sheet */}
      {selectedMarker && (
        <div className="bg-surface border-2 border-measure rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md animate-in fade-in duration-150">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-ink-secondary block font-bold">
              Candidate Marker
            </span>
            <p className="text-base font-bold text-ink">
              Row {selectedMarker.row} · Column {selectedMarker.col}
            </p>
            <p className="text-xs font-mono text-ink-secondary">
              Physical center: ({selectedMarker.xMm.toFixed(1)} mm, {selectedMarker.yMm.toFixed(1)} mm)
            </p>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={() => setSelectedMarker(null)}
              className="px-3 min-h-[44px] rounded-lg border border-line bg-surface text-xs font-mono hover:bg-canvas transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteMarker}
              className="flex-1 sm:flex-none min-h-[44px] px-4 rounded-lg bg-danger text-white text-xs font-bold font-mono hover:bg-danger/90 transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
            >
              Remove marker from plan
            </button>
          </div>
        </div>
      )}

      {/* Spacing Recalculation / Defect Failure Card */}
      {deletedInfo && (
        <div className="bg-danger-soft border-2 border-danger rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 text-danger">
            <span className="text-xl">✕</span>
            <h3 className="text-base font-bold uppercase tracking-wider font-mono">
              Guidance Spacing Check Not Met
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-surface p-3 rounded border border-danger/20">
              <span className="text-ink-secondary block text-[11px]">
                {deletedInfo.analysis.primaryMetricLabel}
              </span>
              <span className="text-base font-bold text-ink block mt-0.5">
                {deletedInfo.analysis.affectedSpanMm.toFixed(1)} mm
              </span>
              <span className="text-[10px] text-ink-secondary">
                {deletedInfo.analysis.isEdgeDeletion
                  ? "(To glass edge)"
                  : "(Baseline target: ≤45.0 mm)"}
              </span>
            </div>

            <div className="bg-surface p-3 rounded border border-danger/20">
              <span className="text-danger block text-[11px] font-bold">
                {deletedInfo.analysis.secondaryMetricLabel}
              </span>
              <span className="text-base font-bold text-danger block mt-0.5">
                {deletedInfo.analysis.clearOpeningMm.toFixed(1)} mm
              </span>
              <span className="text-[10px] text-danger/80">
                {deletedInfo.analysis.clearOpeningMm > GUIDANCE_CLEAR_GAP_MM
                  ? `(Exceeds ${GUIDANCE_CLEAR_GAP_MM} mm maximum threshold)`
                  : `(Guidance ceiling: ${GUIDANCE_CLEAR_GAP_MM} mm)`}
              </span>
            </div>
          </div>

          <p className="text-xs text-ink-secondary">
            Omitting a planned marker increases the checked clear spacing and can exceed the 50.8 mm guidance check.
          </p>

          <button
            onClick={handleRepairPlan}
            className="w-full min-h-[52px] bg-protect hover:bg-protect/90 text-white font-bold text-base rounded-lg transition shadow flex items-center justify-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-protect"
          >
            <span>↻</span>
            <span>Repair layout</span>
          </button>
        </div>
      )}

      {/* Primary Results Card */}
      <div className="bg-surface border border-line rounded-xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <span className="text-xs font-mono uppercase tracking-widest text-ink-secondary font-bold">
            Plan Generated
          </span>
          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold font-mono ${
                validation.targetMet
                  ? "bg-protect-soft text-protect"
                  : "bg-danger-soft text-danger"
              }`}
            >
              {validation.targetMet ? "✓ Planning target met" : "✕ Target exceeded"}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold font-mono ${
                validation.guidanceCheckMet
                  ? "bg-protect-soft text-protect"
                  : "bg-danger-soft text-danger"
              }`}
            >
              {validation.guidanceCheckMet
                ? "✓ Guidance spacing met"
                : "✕ Guidance spacing NOT MET"}
            </span>
          </div>
        </div>

        {/* Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-canvas rounded border border-line/60">
            <span className="text-lg sm:text-xl font-bold font-mono text-ink block">
              {plan.spec.columns} × {plan.spec.rows}
            </span>
            <span className="text-[11px] text-ink-secondary">columns × rows</span>
          </div>

          <div className="p-3 bg-canvas rounded border border-line/60">
            <span className="text-lg sm:text-xl font-bold font-mono text-ink block">
              {plan.markers.length}
            </span>
            <span className="text-[11px] text-ink-secondary">markers</span>
          </div>

          <div className="p-3 bg-canvas rounded border border-line/60">
            <span className="text-lg sm:text-xl font-bold font-mono text-ink block">
              {DOT_DIAMETER_MM} mm
            </span>
            <span className="text-[11px] text-ink-secondary">dot diameter</span>
          </div>

          <div className="p-3 bg-canvas rounded border border-line/60">
            <span className="text-lg sm:text-xl font-bold font-mono text-ink block">
              {pitchX.toFixed(1)} × {pitchY.toFixed(1)}
            </span>
            <span className="text-[11px] text-ink-secondary">center pitch (mm)</span>
          </div>
        </div>

        {/* Expandable Measurement Spacing Details */}
        <div className="border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setDetailsExpanded(!detailsExpanded)}
            className="text-xs font-mono text-ink-secondary hover:text-ink flex items-center space-x-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink rounded"
          >
            <span>{detailsExpanded ? "▾ Hide spacing details" : "▸ View spacing details"}</span>
          </button>

          {detailsExpanded && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono bg-canvas p-3.5 rounded border border-line animate-in fade-in duration-100">
              <div className="flex justify-between border-b border-line/40 pb-1">
                <span className="text-ink-secondary">Horizontal center pitch:</span>
                <span className="font-semibold text-ink">
                  {validation.maxCenterPitchXmm.toFixed(2)} mm
                </span>
              </div>
              <div className="flex justify-between border-b border-line/40 pb-1">
                <span className="text-ink-secondary">Vertical center pitch:</span>
                <span className="font-semibold text-ink">
                  {validation.maxCenterPitchYmm.toFixed(2)} mm
                </span>
              </div>
              <div className="flex justify-between border-b border-line/40 pb-1">
                <span className="text-ink-secondary">Max horizontal clear gap:</span>
                <span className="font-semibold text-ink">
                  {validation.maxClearGapXmm.toFixed(2)} mm
                </span>
              </div>
              <div className="flex justify-between border-b border-line/40 pb-1">
                <span className="text-ink-secondary">Max vertical clear gap:</span>
                <span className="font-semibold text-ink">
                  {validation.maxClearGapYmm.toFixed(2)} mm
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Max horizontal boundary clearance:</span>
                <span className="font-semibold text-ink">
                  {validation.maxBoundaryClearanceXmm.toFixed(2)} mm
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Max vertical boundary clearance:</span>
                <span className="font-semibold text-ink">
                  {validation.maxBoundaryClearanceYmm.toFixed(2)} mm
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Next Step / Guide CTA */}
        <div className="pt-2">
          <button
            onClick={() => onProceedToGuide(plan)}
            className="w-full min-h-[50px] bg-protect text-white font-semibold text-sm rounded-lg hover:bg-protect/90 transition flex items-center justify-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-protect shadow-sm"
          >
            <span>View installation guide</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
