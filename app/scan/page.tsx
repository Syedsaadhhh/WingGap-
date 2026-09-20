"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import NavHeader from "../../components/NavHeader";
import CameraCapture, { type CapturedFrame } from "../../components/scanner/CameraCapture";
import CornerSelector from "../../components/scanner/CornerSelector";
import DimensionForm from "../../components/scanner/DimensionForm";
import PlanInspector from "../../components/scanner/PlanInspector";
import ManualPlanner from "../../components/scanner/ManualPlanner";
import { generatePlan } from "../../lib/grid/generate.ts";
import { saveScanSession } from "../../lib/session/storage.ts";
import type { Quad } from "../../lib/geometry/quad.ts";
import type { GeneratedPlan } from "../../lib/grid/spec.ts";
import { fromMm, type MeasurementUnit } from "../../lib/units/index.ts";

type ScannerStep = "capture" | "corners" | "dimensions" | "inspector";

export default function ScanPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [step, setStep] = useState<ScannerStep>("capture");

  // Tied to captured frame
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [capturedFrame, setCapturedFrame] = useState<CapturedFrame | null>(null);
  const [corners, setCorners] = useState<Quad | null>(null);
  const [paneWidthMm, setPaneWidthMm] = useState<number | null>(null);
  const [paneHeightMm, setPaneHeightMm] = useState<number | null>(null);
  const [unit, setUnit] = useState<MeasurementUnit>("cm");
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);

  // 1. Camera Capture Handler
  const handleCapture = (frame: CapturedFrame) => {
    const newCaptureId = `cap_${Date.now()}`;
    setCaptureId(newCaptureId);
    setCapturedFrame(frame);
    // Invalidate stale geometry on new capture
    setCorners(null);
    setPlan(null);
    setStep("corners");
  };

  // 2. Corner Selection Handler
  const handleCornersConfirmed = (selectedCorners: Quad) => {
    setCorners(selectedCorners);
    setStep("dimensions");
  };

  // 3. Dimension Input & Plan Generation Handler
  const handleDimensionsGenerate = (wMm: number, hMm: number, selectedUnit: MeasurementUnit) => {
    setPaneWidthMm(wMm);
    setPaneHeightMm(hMm);
    setUnit(selectedUnit);

    const generated = generatePlan(wMm, hMm);
    setPlan(generated);
    setStep("inspector");
  };

  // 4. Retake Handler: Invalidates all capture-derived geometry
  const handleRetake = () => {
    setCaptureId(null);
    setCapturedFrame(null);
    setCorners(null);
    setPaneWidthMm(null);
    setPaneHeightMm(null);
    setPlan(null);
    setStep("capture");
  };

  const handleBackToCorners = () => {
    setStep("corners");
  };

  // 5. Proceed to Installation Guide Handler
  const handleProceedToGuide = (finalPlan: GeneratedPlan) => {
    saveScanSession({
      sessionId: captureId ?? `manual_${Date.now()}`,
      capturedAt: Date.now(),
      imageDataUrl: null, // Guide never requires raw camera frame
      intrinsicWidth: capturedFrame?.width ?? 0,
      intrinsicHeight: capturedFrame?.height ?? 0,
      corners: corners,
      paneWidthMm: finalPlan.spec.paneWidthMm,
      paneHeightMm: finalPlan.spec.paneHeightMm,
      unit: unit,
      plan: finalPlan,
    });

    router.push("/guide");
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <NavHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Step Progression Breadcrumb / Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-ink-secondary block font-bold">
              Field Workflow
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-ink">
              {mode === "manual"
                ? "Manual Planner"
                : step === "capture"
                ? "1. Live Camera Framing"
                : step === "corners"
                ? "2. Define Pane Corners"
                : step === "dimensions"
                ? "3. Physical Dimensions"
                : "4. Plan Inspector & Spacing"}
            </h1>
          </div>

          {/* Mode switch */}
          {mode === "camera" && (
            <button
              onClick={() => setMode("manual")}
              className="text-xs font-mono text-ink-secondary hover:text-ink px-2.5 py-1 rounded border border-line bg-surface hover:bg-canvas transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              Manual fallback
            </button>
          )}
        </div>

        {/* Dynamic Workflow Stage */}
        {mode === "manual" ? (
          <ManualPlanner
            onProceedToGuide={handleProceedToGuide}
            onTryCamera={() => {
              setMode("camera");
              setStep("capture");
            }}
          />
        ) : step === "capture" ? (
          <CameraCapture
            onCapture={handleCapture}
            onFallbackToManual={() => setMode("manual")}
          />
        ) : step === "corners" && capturedFrame ? (
          <CornerSelector
            frame={capturedFrame}
            onCornersConfirmed={handleCornersConfirmed}
            onRetake={handleRetake}
          />
        ) : step === "dimensions" ? (
          <DimensionForm
            initialWidth={paneWidthMm !== null ? fromMm(paneWidthMm, unit) : undefined}
            initialHeight={paneHeightMm !== null ? fromMm(paneHeightMm, unit) : undefined}
            initialUnit={unit}
            onGenerate={handleDimensionsGenerate}
            onBack={handleBackToCorners}
          />
        ) : step === "inspector" && capturedFrame && corners && plan ? (
          <PlanInspector
            frame={capturedFrame}
            corners={corners}
            initialPlan={plan}
            onProceedToGuide={handleProceedToGuide}
            onRetake={handleRetake}
            onBackToDimensions={() => setStep("dimensions")}
          />
        ) : (
          <div className="text-center py-12 space-y-4">
            <p className="text-sm text-ink-secondary">
              Session state interrupted. Please start a new capture.
            </p>
            <button
              onClick={handleRetake}
              className="px-4 py-2 bg-protect text-white text-sm font-semibold rounded-lg hover:bg-protect/90 transition"
            >
              Start camera capture
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
