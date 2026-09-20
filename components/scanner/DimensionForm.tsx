"use client";

import React, { useRef, useState } from "react";
import {
  toMm,
  fromMm,
  validatePaneDimensions,
  type MeasurementUnit,
} from "../../lib/units/index.ts";
import {
  DOT_DIAMETER_MM,
  GUIDANCE_CLEAR_GAP_MM,
  TARGET_PITCH_MM,
} from "../../lib/grid/spec.ts";

interface DimensionFormProps {
  initialWidth?: number;
  initialHeight?: number;
  initialUnit?: MeasurementUnit;
  onGenerate: (paneWidthMm: number, paneHeightMm: number, unit: MeasurementUnit) => void;
  onBack?: () => void;
}

export default function DimensionForm({
  initialWidth,
  initialHeight,
  initialUnit = "cm",
  onGenerate,
  onBack,
}: DimensionFormProps) {
  const [widthInput, setWidthInput] = useState<string>(
    initialWidth !== undefined ? String(initialWidth) : ""
  );
  const [heightInput, setHeightInput] = useState<string>(
    initialHeight !== undefined ? String(initialHeight) : ""
  );
  const [unit, setUnit] = useState<MeasurementUnit>(initialUnit);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const widthMmRef = useRef<number | null>(
    initialWidth !== undefined ? toMm(initialWidth, initialUnit) : null
  );
  const heightMmRef = useRef<number | null>(
    initialHeight !== undefined ? toMm(initialHeight, initialUnit) : null
  );

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

  const numWidth = parseFloat(widthInput);
  const numHeight = parseFloat(heightInput);

  const hasBoth = Number.isFinite(numWidth) && Number.isFinite(numHeight) && numWidth > 0 && numHeight > 0;
  const wMm = hasBoth ? widthMmRef.current ?? toMm(numWidth, unit) : NaN;
  const hMm = hasBoth ? heightMmRef.current ?? toMm(numHeight, unit) : NaN;

  const validation = hasBoth ? validatePaneDimensions(wMm, hMm) : null;
  const isValid = validation?.valid === true;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasBoth) {
      setErrorMsg("Enter both width and height.");
      return;
    }
    if (!isValid) {
      setErrorMsg(
        validation?.reason ??
          "WingGap's hackathon planner supports panes from 10 cm to 300 cm per side."
      );
      return;
    }

    setErrorMsg(null);
    onGenerate(wMm, hMm, unit);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-line rounded-xl p-6 sm:p-8 max-w-lg mx-auto space-y-6 shadow-sm"
    >
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-ink">Enter the pane size</h2>
        <p className="text-xs sm:text-sm text-ink-secondary">
          Use a tape measure. WingGap does not infer real-world size from pixels.
        </p>
      </div>

      {/* Unit Selector Toggle */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
          Measurement Unit
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
            Centimeters (cm)
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
            Inches (in)
          </button>
        </div>
      </div>

      {/* Dimension Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="pane-width"
            className="block text-xs font-semibold uppercase tracking-wider text-ink-secondary mb-1.5"
          >
            Width ({unit})
          </label>
          <input
            id="pane-width"
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
              setErrorMsg(null);
            }}
            placeholder={unit === "cm" ? "e.g. 75" : "e.g. 30"}
            className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-surface-raised text-ink font-mono text-base focus:outline-none focus:ring-2 focus:ring-protect"
          />
        </div>

        <div>
          <label
            htmlFor="pane-height"
            className="block text-xs font-semibold uppercase tracking-wider text-ink-secondary mb-1.5"
          >
            Height ({unit})
          </label>
          <input
            id="pane-height"
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
              setErrorMsg(null);
            }}
            placeholder={unit === "cm" ? "e.g. 120" : "e.g. 48"}
            className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-surface-raised text-ink font-mono text-base focus:outline-none focus:ring-2 focus:ring-protect"
          />
        </div>
      </div>

      {/* Real-time mm translation preview */}
      {hasBoth && (
        <div className="text-xs font-mono text-ink-secondary bg-canvas px-3 py-2 rounded border border-line flex items-center justify-between">
          <span>Physical dimension check:</span>
          <span className="font-semibold text-ink">
            {wMm.toFixed(1)} mm × {hMm.toFixed(1)} mm
          </span>
        </div>
      )}

      {/* Locked Physical Treatment Model Specification Box */}
      <div className="bg-canvas/70 border border-line rounded-lg p-4 space-y-2.5">
        <span className="text-[11px] font-mono uppercase tracking-widest text-ink-secondary block font-bold">
          Locked Treatment Model
        </span>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-surface p-2 rounded border border-line/60">
            <span className="text-[10px] text-ink-secondary block">Dot diameter</span>
            <span className="font-mono font-bold text-ink">{DOT_DIAMETER_MM} mm</span>
          </div>
          <div className="bg-surface p-2 rounded border border-line/60">
            <span className="text-[10px] text-ink-secondary block">Pitch target</span>
            <span className="font-mono font-bold text-ink">≤{TARGET_PITCH_MM} mm</span>
          </div>
          <div className="bg-surface p-2 rounded border border-line/60">
            <span className="text-[10px] text-ink-secondary block">Clear-gap check</span>
            <span className="font-mono font-bold text-ink">≤{GUIDANCE_CLEAR_GAP_MM} mm</span>
          </div>
        </div>
        <p className="text-[11px] text-ink-secondary text-center pt-0.5">
          Exterior surface · full pane
        </p>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-danger-soft border border-danger/30 text-danger text-xs flex items-center space-x-2">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Action Controls */}
      <div className="flex items-center space-x-3 pt-1">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="min-h-[48px] px-4 rounded-lg border border-line bg-surface text-ink text-sm font-medium hover:bg-canvas transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            ← Back
          </button>
        )}
        <button
          type="submit"
          disabled={!hasBoth || !isValid}
          className="flex-1 min-h-[50px] bg-protect text-white font-semibold text-sm rounded-lg hover:bg-protect/90 transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-protect flex items-center justify-center space-x-2 shadow-sm"
        >
          <span>Generate plan</span>
          <span>→</span>
        </button>
      </div>
    </form>
  );
}
