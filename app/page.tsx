"use client";

import React, { useState, useMemo } from "react";
import { generatePlan } from "@/lib/grid/generate";
import { validatePlan } from "@/lib/grid/validate";
import { removeMarker, repairPlan } from "@/lib/grid/repair";
import { GeneratedPlan, Marker, ValidationResult } from "@/lib/grid/spec";
import { toMm, MeasurementUnit } from "@/lib/units";

export default function Run1ProofHarness() {
  const [widthInput, setWidthInput] = useState<number>(60);
  const [heightInput, setHeightInput] = useState<number>(90);
  const [unit, setUnit] = useState<MeasurementUnit>("cm");

  const [plan, setPlan] = useState<GeneratedPlan | null>(() => {
    try {
      return generatePlan(600, 900);
    } catch {
      return null;
    }
  });

  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const validation: ValidationResult | null = useMemo(() => {
    if (!plan) return null;
    return validatePlan(plan);
  }, [plan]);

  const handleGenerate = () => {
    try {
      setErrorMsg(null);
      const wMm = toMm(widthInput, unit);
      const hMm = toMm(heightInput, unit);
      const newPlan = generatePlan(wMm, hMm);
      setPlan(newPlan);
      setSelectedMarker(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to generate plan.");
      }
    }
  };

  const handleLoadReference = () => {
    setWidthInput(60);
    setHeightInput(90);
    setUnit("cm");
    setErrorMsg(null);
    const refPlan = generatePlan(600, 900);
    setPlan(refPlan);
    setSelectedMarker(null);
  };

  const handleDeleteSelected = () => {
    if (!plan || !selectedMarker) return;
    const updated = removeMarker(plan, selectedMarker.id);
    setPlan(updated);
    setSelectedMarker(null);
  };

  const handleRepair = () => {
    if (!plan) return;
    const repaired = repairPlan(plan);
    setPlan(repaired);
    setSelectedMarker(null);
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header className="border-b border-line pb-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono tracking-widest text-ink-secondary uppercase">
              WingGap v3 · RUN 1 Proof Harness
            </span>
            <h1 className="text-2xl font-bold text-ink mt-1">
              Physical Planning & Spacing Engine
            </h1>
          </div>
          <button
            onClick={handleLoadReference}
            className="text-xs font-mono bg-surface border border-line px-3 py-1.5 rounded hover:border-ink transition"
          >
            Load 600 × 900 mm Reference
          </button>
        </div>
      </header>

      {/* Input Controls */}
      <section className="bg-surface p-5 rounded-lg border border-line space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-secondary">
          Pane Dimensions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">
              Width
            </label>
            <input
              type="number"
              value={widthInput}
              onChange={(e) => setWidthInput(parseFloat(e.target.value) || 0)}
              className="w-full bg-white border border-line rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">
              Height
            </label>
            <input
              type="number"
              value={heightInput}
              onChange={(e) => setHeightInput(parseFloat(e.target.value) || 0)}
              className="w-full bg-white border border-line rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">
              Unit
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as MeasurementUnit)}
              className="w-full bg-white border border-line rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ink"
            >
              <option value="cm">cm</option>
              <option value="in">in</option>
              <option value="mm">mm</option>
            </select>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-danger-soft border border-danger text-danger text-xs font-mono rounded">
            {errorMsg}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleGenerate}
            className="bg-protect text-white text-sm font-medium px-4 py-2 rounded hover:bg-opacity-90 transition"
          >
            Generate Plan
          </button>
          {plan && (
            <button
              onClick={handleRepair}
              className="bg-surface-raised border border-line text-ink text-sm font-medium px-4 py-2 rounded hover:border-ink transition"
            >
              Repair Plan
            </button>
          )}
        </div>
      </section>

      {/* Results & Spacing Metrics */}
      {plan && validation && (
        <section className="bg-surface p-5 rounded-lg border border-line space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-secondary">
              Plan Metrics & Independent Validation
            </h2>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-mono px-2.5 py-1 rounded font-medium ${
                  validation.targetMet
                    ? "bg-protect-soft text-protect"
                    : "bg-measure text-ink"
                }`}
              >
                {validation.targetMet
                  ? "✓ Planning target met"
                  : "Planning target exceeded / altered"}
              </span>
              <span
                className={`text-xs font-mono px-2.5 py-1 rounded font-medium ${
                  validation.guidanceCheckMet
                    ? "bg-protect-soft text-protect"
                    : "bg-danger-soft text-danger border border-danger"
                }`}
              >
                {validation.guidanceCheckMet
                  ? "✓ Guidance spacing check met"
                  : "✕ Guidance spacing check not met"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="bg-surface-raised p-3 rounded border border-line">
              <div className="text-xs text-ink-secondary">Grid</div>
              <div className="text-lg font-mono font-bold mt-1">
                {plan.spec.columns} × {plan.spec.rows}
              </div>
              <div className="text-[10px] text-ink-secondary">cols × rows</div>
            </div>
            <div className="bg-surface-raised p-3 rounded border border-line">
              <div className="text-xs text-ink-secondary">Marker Count</div>
              <div className="text-lg font-mono font-bold mt-1">
                {plan.markers.length}
              </div>
              <div className="text-[10px] text-ink-secondary">
                of {plan.spec.columns * plan.spec.rows} canonical
              </div>
            </div>
            <div className="bg-surface-raised p-3 rounded border border-line">
              <div className="text-xs text-ink-secondary">Dot Diameter</div>
              <div className="text-lg font-mono font-bold mt-1">6.35 mm</div>
              <div className="text-[10px] text-ink-secondary">1/4 inch min</div>
            </div>
            <div className="bg-surface-raised p-3 rounded border border-line">
              <div className="text-xs text-ink-secondary">Max Clear Gap</div>
              <div className="text-lg font-mono font-bold mt-1">
                {Math.max(
                  validation.maxClearGapXmm,
                  validation.maxClearGapYmm
                ).toFixed(1)}{" "}
                mm
              </div>
              <div className="text-[10px] text-ink-secondary">
                ceiling ≤ 50.8 mm
              </div>
            </div>
          </div>

          <div className="bg-surface-raised p-4 rounded border border-line space-y-2 text-xs font-mono">
            <div className="text-ink-secondary font-semibold uppercase tracking-wider">
              Exact Spacing Semantics:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-ink">
              <div>
                Horizontal Center Pitch:{" "}
                <span className="font-bold">
                  {validation.maxCenterPitchXmm.toFixed(3)} mm
                </span>
              </div>
              <div>
                Vertical Center Pitch:{" "}
                <span className="font-bold">
                  {validation.maxCenterPitchYmm.toFixed(3)} mm
                </span>
              </div>
              <div>
                Max Horizontal Clear Gap:{" "}
                <span className="font-bold">
                  {validation.maxClearGapXmm.toFixed(3)} mm
                </span>
              </div>
              <div>
                Max Vertical Clear Gap:{" "}
                <span className="font-bold">
                  {validation.maxClearGapYmm.toFixed(3)} mm
                </span>
              </div>
              <div>
                Max Left/Right Clearance:{" "}
                <span className="font-bold">
                  {validation.maxBoundaryClearanceXmm.toFixed(3)} mm
                </span>
              </div>
              <div>
                Max Top/Bottom Clearance:{" "}
                <span className="font-bold">
                  {validation.maxBoundaryClearanceYmm.toFixed(3)} mm
                </span>
              </div>
            </div>
          </div>

          {validation.issues.length > 0 && (
            <div className="p-3 bg-surface-raised border border-danger rounded space-y-1">
              <div className="text-xs font-semibold text-danger">
                Detected Issues ({validation.issues.length}):
              </div>
              <ul className="list-disc list-inside text-xs font-mono text-danger space-y-0.5 max-h-32 overflow-y-auto">
                {validation.issues.slice(0, 10).map((issue, idx) => (
                  <li key={idx}>
                    [{issue.code}] {issue.message}
                  </li>
                ))}
                {validation.issues.length > 10 && (
                  <li>...and {validation.issues.length - 10} more</li>
                )}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Interactive 2D Elevation Canvas */}
      {plan && (
        <section className="bg-surface p-5 rounded-lg border border-line space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-secondary">
              Interactive 2D Elevation
            </h2>
            <span className="text-xs text-ink-secondary">
              Click a marker to inspect or remove
            </span>
          </div>

          <div
            className="w-full bg-white border border-line rounded flex items-center justify-center p-4 overflow-hidden"
            style={{ minHeight: "360px" }}
          >
            <svg
              viewBox={`0 0 ${plan.spec.paneWidthMm} ${plan.spec.paneHeightMm}`}
              className="w-full h-auto max-h-[420px] border border-ink/20"
              style={{
                aspectRatio: `${plan.spec.paneWidthMm} / ${plan.spec.paneHeightMm}`,
              }}
            >
              {/* Markers */}
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
                    strokeWidth={isSelected ? 1 : 0}
                    className="cursor-pointer hover:fill-measure transition-colors"
                    onClick={() => setSelectedMarker(m)}
                  />
                );
              })}
            </svg>
          </div>

          {selectedMarker && (
            <div className="flex items-center justify-between p-3 bg-surface-raised border border-measure rounded">
              <span className="text-xs font-mono">
                Selected: Marker Row {selectedMarker.row}, Col {selectedMarker.col} (
                {selectedMarker.xMm.toFixed(1)} mm, {selectedMarker.yMm.toFixed(1)} mm)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteSelected}
                  className="bg-danger text-white text-xs font-medium px-3 py-1.5 rounded hover:bg-opacity-90 transition"
                >
                  Remove marker from plan
                </button>
                <button
                  onClick={() => setSelectedMarker(null)}
                  className="border border-line text-ink-secondary text-xs px-2.5 py-1.5 rounded hover:border-ink"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
