"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import NavHeader from "../../components/NavHeader";
import { loadScanSession, type RestoredSession } from "../../lib/session/storage.ts";
import { generatePlan } from "../../lib/grid/generate.ts";
import { DOT_DIAMETER_MM } from "../../lib/grid/spec.ts";

export default function GuidePage() {
  const [session, setSession] = useState<RestoredSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const loaded = loadScanSession();
    if (loaded && loaded.data.plan) {
      setSession(loaded);
    } else {
      // Default 600 x 900 mm reference plan fallback
      const defaultPlan = generatePlan(600, 900);
      setSession({
        data: {
          sessionId: "reference_600x900",
          capturedAt: Date.now(),
          imageDataUrl: null,
          intrinsicWidth: 600,
          intrinsicHeight: 900,
          corners: null,
          paneWidthMm: 600,
          paneHeightMm: 900,
          unit: "cm",
          plan: defaultPlan,
        },
        validation: null,
      });
    }
    setIsLoaded(true);
  }, []);

  if (!isLoaded || !session || !session.data.plan) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col">
        <NavHeader />
        <main className="max-w-4xl mx-auto px-4 py-12 text-center text-ink-secondary font-mono text-sm">
          Loading installation guide...
        </main>
      </div>
    );
  }

  const { plan } = session.data;
  const { paneWidthMm, paneHeightMm, columns, rows } = plan.spec;
  const pitchX = paneWidthMm / columns;
  const pitchY = paneHeightMm / rows;

  const firstOffsetX = 0.5 * pitchX;
  const firstOffsetY = 0.5 * pitchY;

  // Export static PNG stamped with NOT TO SCALE
  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = "#FAFAF6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header
    ctx.fillStyle = "#171A17";
    ctx.font = "bold 36px monospace";
    ctx.fillText("WINGGAP EXTERIOR DOT PLAN", 60, 80);

    ctx.fillStyle = "#525852";
    ctx.font = "20px monospace";
    ctx.fillText(`PANE: ${paneWidthMm} mm × ${paneHeightMm} mm | DOTS: ${plan.markers.length}`, 60, 120);

    // Pane schematic box
    const margin = 100;
    const boxW = canvas.width - margin * 2;
    const boxH = 1100;
    const scaleX = boxW / paneWidthMm;
    const scaleY = boxH / paneHeightMm;

    ctx.strokeStyle = "#171A17";
    ctx.lineWidth = 4;
    ctx.strokeRect(margin, 160, boxW, boxH);

    // Draw markers
    ctx.fillStyle = "#1F6B4F";
    const dotR = 6;
    for (const m of plan.markers) {
      const mx = margin + m.xMm * scaleX;
      const my = 160 + m.yMm * scaleY;
      ctx.beginPath();
      ctx.arc(mx, my, dotR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Prominent "NOT TO SCALE" Stamp
    ctx.fillStyle = "rgba(200, 77, 66, 0.85)";
    ctx.font = "bold 44px monospace";
    ctx.textAlign = "center";
    ctx.fillText("NOT TO SCALE", canvas.width / 2, 160 + boxH / 2);

    // Footer
    ctx.textAlign = "left";
    ctx.fillStyle = "#525852";
    ctx.font = "16px monospace";
    ctx.fillText(
      "WingGap generates a plan. It does not detect or certify the finished physical installation.",
      60,
      canvas.height - 80
    );

    // Trigger download
    const link = document.createElement("a");
    link.download = `winggap_plan_${paneWidthMm}x${paneHeightMm}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <NavHeader />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="border-b border-line pb-4 space-y-1">
          <span className="text-xs font-mono uppercase tracking-widest text-ink-secondary block font-bold">
            Field Installation Spec
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">
            Your exterior dot plan
          </h1>
          <p className="text-sm text-ink-secondary">
            Physical layout specifications derived from the active planning session.
          </p>
        </div>

        {/* Plan Summary Card */}
        <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 space-y-4 shadow-sm">
          <h2 className="text-xs font-mono uppercase tracking-wider text-ink-secondary font-bold">
            Specification Parameters
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 bg-canvas rounded border border-line">
              <span className="text-ink-secondary block text-[11px]">Pane dimensions</span>
              <span className="text-base font-bold text-ink block mt-0.5">
                {paneWidthMm} × {paneHeightMm} mm
              </span>
            </div>

            <div className="p-3 bg-canvas rounded border border-line">
              <span className="text-ink-secondary block text-[11px]">Dot diameter</span>
              <span className="text-base font-bold text-ink block mt-0.5">
                {DOT_DIAMETER_MM} mm
              </span>
            </div>

            <div className="p-3 bg-canvas rounded border border-line">
              <span className="text-ink-secondary block text-[11px]">Grid topology</span>
              <span className="text-base font-bold text-ink block mt-0.5">
                {columns} × {rows} ({plan.markers.length} dots)
              </span>
            </div>

            <div className="p-3 bg-canvas rounded border border-line">
              <span className="text-ink-secondary block text-[11px]">Horizontal pitch</span>
              <span className="text-base font-bold text-ink block mt-0.5">
                {pitchX.toFixed(2)} mm
              </span>
            </div>

            <div className="p-3 bg-canvas rounded border border-line">
              <span className="text-ink-secondary block text-[11px]">Vertical pitch</span>
              <span className="text-base font-bold text-ink block mt-0.5">
                {pitchY.toFixed(2)} mm
              </span>
            </div>

            <div className="p-3 bg-canvas rounded border border-line">
              <span className="text-ink-secondary block text-[11px]">Surface</span>
              <span className="text-base font-bold text-ink block mt-0.5">
                Exterior surface
              </span>
            </div>
          </div>
        </section>

        {/* Installation Geometry Offsets Card */}
        <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 space-y-4 shadow-sm">
          <h2 className="text-xs font-mono uppercase tracking-wider text-ink-secondary font-bold">
            First-Center Offsets & Repetition
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3.5 bg-canvas rounded-lg border border-line space-y-1">
              <span className="text-ink-secondary text-[11px] block">First center from left edge:</span>
              <span className="text-xl font-bold text-protect block font-mono">
                {firstOffsetX.toFixed(2)} mm
              </span>
              <p className="text-[11px] text-ink-secondary font-sans pt-1">
                Measure from left glass boundary to first column of dot centers.
              </p>
            </div>

            <div className="p-3.5 bg-canvas rounded-lg border border-line space-y-1">
              <span className="text-ink-secondary text-[11px] block">First center from top edge:</span>
              <span className="text-xl font-bold text-protect block font-mono">
                {firstOffsetY.toFixed(2)} mm
              </span>
              <p className="text-[11px] text-ink-secondary font-sans pt-1">
                Measure from top glass boundary to first row of dot centers.
              </p>
            </div>
          </div>
        </section>

        {/* Four-Step Installation Sequence */}
        <section className="space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-ink-secondary font-bold">
            Field Installation Sequence
          </h2>

          <div className="space-y-3">
            <div className="bg-surface border border-line rounded-xl p-4 sm:p-5 flex items-start space-x-4">
              <span className="text-sm font-mono font-bold text-protect bg-protect-soft w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                01
              </span>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-ink">
                  Work on the exterior surface
                </h3>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  For this applied-dot plan, visual markers belong strictly on the outside glass surface. Exterior placement disrupts surface mirror reflections before bird visual perception meets transparent glass.
                </p>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-xl p-4 sm:p-5 flex items-start space-x-4">
              <span className="text-sm font-mono font-bold text-protect bg-protect-soft w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                02
              </span>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-ink">
                  Start at the measured offsets
                </h3>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  Position your tape measure against the top-left glass edge. Locate the first marker center at <span className="font-mono font-bold text-ink">{firstOffsetX.toFixed(1)} mm</span> from the left edge and <span className="font-mono font-bold text-ink">{firstOffsetY.toFixed(1)} mm</span> from the top edge.
                </p>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-xl p-4 sm:p-5 flex items-start space-x-4">
              <span className="text-sm font-mono font-bold text-protect bg-protect-soft w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                03
              </span>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-ink">
                  Repeat the calculated pitch
                </h3>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  Place subsequent dots at intervals of <span className="font-mono font-bold text-ink">{pitchX.toFixed(1)} mm</span> horizontally and <span className="font-mono font-bold text-ink">{pitchY.toFixed(1)} mm</span> vertically across all {columns} columns and {rows} rows.
                </p>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-xl p-4 sm:p-5 flex items-start space-x-4">
              <span className="text-sm font-mono font-bold text-protect bg-protect-soft w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                04
              </span>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-ink">
                  Do not omit markers
                </h3>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  Every omitted marker increases clear axial spacing from ~38 mm to ~80 mm+, violating published bird-friendly guidance. Keep the regular grid continuous.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Required Disclaimer Box */}
        <div className="p-4 rounded-lg bg-canvas border border-line text-xs text-ink-secondary font-mono leading-relaxed">
          <span className="font-bold text-ink block mb-0.5">DISCLAIMER</span>
          WingGap generates a plan. It does not detect or certify the finished physical installation.
        </div>

        {/* Export & Navigation Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={handleExportPng}
            className="w-full sm:w-auto min-h-[48px] px-5 bg-surface border border-line hover:bg-canvas text-ink font-mono text-xs font-bold rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            Export plan image (PNG)
          </button>

          <Link
            href="/scan"
            className="w-full sm:w-auto min-h-[48px] px-5 bg-protect text-white font-semibold text-xs font-mono rounded-lg hover:bg-protect/90 transition flex items-center justify-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-protect text-center"
          >
            <span>Scan another window</span>
            <span>→</span>
          </Link>
        </div>

        {/* Hidden Canvas for PNG Generation */}
        <canvas ref={canvasRef} className="hidden" />
      </main>
    </div>
  );
}
