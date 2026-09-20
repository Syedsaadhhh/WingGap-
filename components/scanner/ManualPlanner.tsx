"use client";

import React, { useState, useRef, useMemo } from "react";
import { toMm, fromMm, validatePaneDimensions, type MeasurementUnit } from "../../lib/units/index.ts";
import { generatePlan } from "../../lib/grid/generate.ts";
import { validatePlan } from "../../lib/grid/validate.ts";
import { removeMarker, repairPlan } from "../../lib/grid/repair.ts";
import { analyzeMarkerRemoval, type RemovalAnalysis } from "../../lib/grid/analyzeRemoval.ts";
import {
  DOT_DIAMETER_MM,
  GUIDANCE_CLEAR_GAP_MM,
  TARGET_PITCH_MM,
  type GeneratedPlan,
  type Marker,
  type ValidationResult,
} from "../../lib/grid/spec.ts";

interface ManualPlannerProps {
  onProceedToGuide: (plan: GeneratedPlan) => void;
  onTryCamera?: () => void;
}

export default function ManualPlanner({
  onProceedToGuide,
  onTryCamera,
}: ManualPlannerProps) {
  const [widthInput, setWidthInput] = useState<string>("");
  const [heightInput, setHeightInput] = useState<string>("");
  const [unit, setUnit] = useState<MeasurementUnit>("cm");
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);

  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [deletedInfo, setDeletedInfo] = useState<{
    row: number;
    col: number;
    analysis: RemovalAnalysis;
  } | null>(null);

  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const svgContainerRef = useRef<SVGSVGElement | null>(null);
  const widthMmRef = useRef<number | null>(null);
  const heightMmRef = useRef<number | null>(null);

  const numWidth = parseFloat(widthInput);
  const numHeight = parseFloat(heightInput);
  const hasBoth = Number.isFinite(numWidth) && Number.isFinite(numHeight) && numWidth > 0 && numHeight > 0;
  const wMm = hasBoth ? widthMmRef.current ?? toMm(numWidth, unit) : NaN;
  const hMm = hasBoth ? heightMmRef.current ?? toMm(numHeight, unit) : NaN;

  const handleUnitChange = (newUnit: MeasurementUnit) => {
    if (newUnit === unit) return;

    if (widthInput.trim() !== "") {
      const val = parseFloat(widthInput);
      if (Number.isFinite(val) && val > 0) {
        const mm = widthMmRef.current ?? toMm(val, unit);
        const converted = fromMm(mm, newUnit);
        setWidthInput(String(Math.round(converted * 100) / 100));
      }
    }

    if (heightInput.trim() !== "") {
      const val = parseFloat(heightInput);
      if (Number.isFinite(val) && val > 0) {
        const mm = heightMmRef.current ?? toMm(val, unit);
        const converted = fromMm(mm, newUnit);
        setHeightInput(String(Math.round(converted * 100) / 100));
      }
    }

    setUnit(newUnit);
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasBoth) {
      setErrorMsg("Enter both width and height.");
      return;
    }
    const dimCheck = validatePaneDimensions(wMm, hMm);
    if (!dimCheck.valid) {
      setErrorMsg(
        dimCheck.reason ??
          "WingGap's hackathon planner supports panes from 10 cm to 300 cm per side."
      );
      return;
    }

    try {
      setErrorMsg(null);
      const newPlan = generatePlan(wMm, hMm);
      setPlan(newPlan);
      setSelectedMarker(null);
      setDeletedInfo(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to generate plan.");
    }
  };

  const validation: ValidationResult | null = useMemo(() => {
    if (!plan) return null;
    return validatePlan(plan);
  }, [plan]);

  // Handle marker hit testing on 2D elevation
  const handleElevationClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!plan || !svgContainerRef.current) return;

    const svgRect = svgContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - svgRect.left;
    const clickY = e.clientY - svgRect.top;

    // ViewBox coordinates
    const vbWidth = plan.spec.paneWidthMm;
    const vbHeight = plan.spec.paneHeightMm;
    const scaleX = vbWidth / svgRect.width;
    const scaleY = vbHeight / svgRect.height;

    const clickPhysicalX = clickX * scaleX;
    const clickPhysicalY = clickY * scaleY;

    // Hit test radius in physical mm (e.g. 20mm)
    const HIT_RADIUS = 25;
    const HIT_RADIUS_SQ = HIT_RADIUS * HIT_RADIUS;

    let nearest: Marker | null = null;
    let minDistanceSq = Infinity;

    for (const m of plan.markers) {
      const dx = m.xMm - clickPhysicalX;
      const dy = m.yMm - clickPhysicalY;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        nearest = m;
      }
    }

    if (minDistanceSq <= HIT_RADIUS_SQ && nearest) {
      setSelectedMarker(nearest);
    } else {
      setSelectedMarker(null);
    }
  };

  const handleDeleteMarker = () => {
    if (!plan || !selectedMarker) return;

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

  const handleRepair = () => {
    if (!plan) return;
    const repaired = repairPlan(plan);
    setPlan(repaired);
    setSelectedMarker(null);
    setDeletedInfo(null);
  };

  const pitchX = plan ? plan.spec.paneWidthMm / plan.spec.columns : 0;
  const pitchY = plan ? plan.spec.paneHeightMm / plan.spec.rows : 0;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Top Bar with Camera Switch */}
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-ink-secondary block font-bold">
            Fallback Mode
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-ink">
            Manual 2D Pane Elevation Planner
          </h2>
        </div>
        {onTryCamera && (
          <button
            onClick={onTryCamera}
            className="text-xs font-mono px-3 py-1.5 rounded border border-line bg-surface hover:bg-canvas transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            📷 Try camera
          </button>
        )}
      </div>

      {/* Input Dimensions Card */}
      <form
        onSubmit={handleGenerate}
        className="bg-surface border border-line rounded-xl p-5 sm:p-6 space-y-4 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            Pane Dimensions
          </label>
          <div className="inline-flex rounded-lg border border-line p-0.5 bg-canvas">
            <button
              type="button"
              onClick={() => handleUnitChange("cm")}
              className={`px-3 py-1 rounded text-xs font-mono font-medium transition ${
                unit === "cm"
                  ? "bg-surface-raised text-ink shadow-sm font-bold"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              cm
            </button>
            <button
              type="button"
              onClick={() => handleUnitChange("in")}
              className={`px-3 py-1 rounded text-xs font-mono font-medium transition ${
                unit === "in"
                  ? "bg-surface-raised text-ink shadow-sm font-bold"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              in
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-ink-secondary mb-1">
              Width ({unit})
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={widthInput}
              onChange={(e) => {
                const value = e.target.value;
                setWidthInput(value);
                const parsed = parseFloat(value);
                widthMmRef.current = Number.isFinite(parsed) && parsed > 0
                  ? toMm(parsed, unit)
                  : null;
              }}
              className="w-full px-3 py-2 rounded-lg border border-line bg-surface-raised text-ink font-mono text-base focus:outline-none focus:ring-2 focus:ring-protect"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-ink-secondary mb-1">
              Height ({unit})
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={heightInput}
              onChange={(e) => {
                const value = e.target.value;
                setHeightInput(value);
                const parsed = parseFloat(value);
                heightMmRef.current = Number.isFinite(parsed) && parsed > 0
                  ? toMm(parsed, unit)
                  : null;
              }}
              className="w-full px-3 py-2 rounded-lg border border-line bg-surface-raised text-ink font-mono text-base focus:outline-none focus:ring-2 focus:ring-protect"
            />
          </div>
        </div>

        <p className="text-[11px] text-ink-secondary">
          Use a tape measure. WingGap does not infer real-world size from pixels. Both dimensions required (10 cm to 300 cm).
        </p>

        {errorMsg && (
          <div className="p-3 rounded bg-danger-soft border border-danger/30 text-danger text-xs">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={!hasBoth}
          className="w-full min-h-[46px] bg-protect text-white font-semibold text-sm rounded-lg hover:bg-protect/90 transition disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-protect"
        >
          Update 2D plan
        </button>
      </form>

      {/* Interactive 2D Elevation Viewport */}
      {plan && (
        <div className="bg-surface border border-line rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-secondary font-bold">
              2D Elevation View (Exterior)
            </span>
            <span className="text-xs font-mono text-ink-secondary">
              Tap near dot to inspect
            </span>
          </div>

          <div className="w-full bg-[#EAEBE5] rounded-lg p-4 flex items-center justify-center border border-line overflow-hidden">
            <div
              style={{
                aspectRatio: `${plan.spec.paneWidthMm} / ${plan.spec.paneHeightMm}`,
                maxHeight: "420px",
              }}
              className="w-full max-w-full bg-[#DCE0D9] border-2 border-ink rounded shadow-inner relative flex items-center justify-center cursor-pointer select-none"
            >
              <svg
                ref={svgContainerRef}
                onClick={handleElevationClick}
                viewBox={`0 0 ${plan.spec.paneWidthMm} ${plan.spec.paneHeightMm}`}
                className="w-full h-full"
              >
                {/* Defect Highlight Guide Lines */}
                {deletedInfo && (
                  <g>
                    <line
                      x1="0"
                      y1={(deletedInfo.row + 0.5) * pitchY}
                      x2={plan.spec.paneWidthMm}
                      y2={(deletedInfo.row + 0.5) * pitchY}
                      stroke="#C84D42"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                    />
                    <line
                      x1={(deletedInfo.col + 0.5) * pitchX}
                      y1="0"
                      x2={(deletedInfo.col + 0.5) * pitchX}
                      y2={plan.spec.paneHeightMm}
                      stroke="#C84D42"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                    />
                  </g>
                )}

                {/* Render Markers */}
                {plan.markers.map((m) => {
                  const isSelected = selectedMarker?.id === m.id;
                  return (
                    <circle
                      key={m.id}
                      cx={m.xMm}
                      cy={m.yMm}
                      r={m.diameterMm / 2}
                      fill={isSelected ? "#E5B63F" : "#171A17"}
                      stroke={isSelected ? "#171A17" : "none"}
                      strokeWidth={isSelected ? 1.5 : 0}
                    />
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Candidate Marker Deletion Sheet */}
          {selectedMarker && (
            <div className="bg-surface-raised border-2 border-measure rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-ink-secondary block font-bold">
                  Candidate Marker
                </span>
                <p className="text-base font-bold text-ink">
                  Row {selectedMarker.row} · Column {selectedMarker.col}
                </p>
                <p className="text-xs font-mono text-ink-secondary">
                  Physical position: ({selectedMarker.xMm.toFixed(1)} mm, {selectedMarker.yMm.toFixed(1)} mm)
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

          {/* Defect / Spacing Recalculation Alert */}
          {deletedInfo && (
            <div className="bg-danger-soft border-2 border-danger rounded-xl p-5 space-y-4">
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
                      : "(Target: ≤45.0 mm)"}
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
                      ? `(Exceeds ${GUIDANCE_CLEAR_GAP_MM} mm guidance ceiling)`
                      : `(Guidance ceiling: ${GUIDANCE_CLEAR_GAP_MM} mm)`}
                  </span>
                </div>
              </div>

              <p className="text-xs text-ink-secondary">
                Omitting a planned marker increases the checked clear spacing and can exceed the 50.8 mm guidance check.
              </p>

              <button
                onClick={handleRepair}
                className="w-full min-h-[50px] bg-protect hover:bg-protect/90 text-white font-bold text-base rounded-lg transition shadow flex items-center justify-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-protect"
              >
                <span>↻</span>
                <span>Repair layout</span>
              </button>
            </div>
          )}

          {/* Results Summary Card */}
          {validation && (
            <div className="space-y-4 border-t border-line pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest text-ink-secondary font-bold">
                  Status
                </span>
                <div className="flex items-center space-x-2 font-mono text-xs">
                  <span
                    className={`px-2.5 py-0.5 rounded font-semibold ${
                      validation.targetMet
                        ? "bg-protect-soft text-protect"
                        : "bg-danger-soft text-danger"
                    }`}
                  >
                    {validation.targetMet ? "✓ Target met" : "✕ Target exceeded"}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded font-semibold ${
                      validation.guidanceCheckMet
                        ? "bg-protect-soft text-protect"
                        : "bg-danger-soft text-danger"
                    }`}
                  >
                    {validation.guidanceCheckMet
                      ? "✓ Guidance met"
                      : "✕ Guidance NOT MET"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="p-2.5 bg-canvas rounded border border-line">
                  <span className="text-base font-bold text-ink block">
                    {plan.spec.columns} × {plan.spec.rows}
                  </span>
                  <span className="text-[10px] text-ink-secondary">columns × rows</span>
                </div>
                <div className="p-2.5 bg-canvas rounded border border-line">
                  <span className="text-base font-bold text-ink block">
                    {plan.markers.length}
                  </span>
                  <span className="text-[10px] text-ink-secondary">markers</span>
                </div>
                <div className="p-2.5 bg-canvas rounded border border-line">
                  <span className="text-base font-bold text-ink block">
                    {DOT_DIAMETER_MM} mm
                  </span>
                  <span className="text-[10px] text-ink-secondary">dot diameter</span>
                </div>
                <div className="p-2.5 bg-canvas rounded border border-line">
                  <span className="text-base font-bold text-ink block">
                    {pitchX.toFixed(1)} × {pitchY.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-ink-secondary">center pitch (mm)</span>
                </div>
              </div>

              {/* Expandable spacing details */}
              <div>
                <button
                  type="button"
                  onClick={() => setDetailsExpanded(!detailsExpanded)}
                  className="text-xs font-mono text-ink-secondary hover:text-ink"
                >
                  {detailsExpanded ? "▾ Hide spacing details" : "▸ View spacing details"}
                </button>

                {detailsExpanded && (
                  <div className="mt-2 text-xs font-mono bg-canvas p-3 rounded border border-line space-y-1">
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Horizontal pitch:</span>
                      <span>{validation.maxCenterPitchXmm.toFixed(2)} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Vertical pitch:</span>
                      <span>{validation.maxCenterPitchYmm.toFixed(2)} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Max horizontal clear gap:</span>
                      <span>{validation.maxClearGapXmm.toFixed(2)} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Max vertical clear gap:</span>
                      <span>{validation.maxClearGapYmm.toFixed(2)} mm</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => onProceedToGuide(plan)}
                className="w-full min-h-[50px] bg-protect text-white font-semibold text-sm rounded-lg hover:bg-protect/90 transition flex items-center justify-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-protect"
              >
                <span>View installation guide</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
