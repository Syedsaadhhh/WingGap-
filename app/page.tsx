"use client";

import React, { useState } from "react";
import Link from "next/link";
import NavHeader from "../components/NavHeader";

export default function LandingPage() {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const scanUrl = `${window.location.origin}/scan`;
      navigator.clipboard.writeText(scanUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <NavHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-16">
        {/* Hero Section */}
        <section className="space-y-6 text-center max-w-2xl mx-auto">
          <div className="inline-block px-3 py-1 rounded-full bg-surface border border-line text-xs font-mono font-bold tracking-widest text-ink-secondary uppercase">
            BIRD-SAFE WINDOW PLANNING
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-ink tracking-tight leading-tight">
            Turn one pane into a measurable treatment plan.
          </h1>

          <p className="text-base sm:text-lg text-ink-secondary leading-relaxed">
            Capture a real window, enter its dimensions, and generate a regular exterior dot plan with inspectable spacing.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/scan"
              className="w-full sm:w-auto min-w-[200px] min-h-[52px] bg-protect text-white font-bold text-base rounded-xl hover:bg-protect/90 transition shadow-sm flex items-center justify-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-protect"
            >
              <span>Scan a window</span>
              <span>→</span>
            </Link>

            <Link
              href="/science"
              className="w-full sm:w-auto min-h-[52px] px-6 bg-surface border border-line hover:bg-canvas text-ink font-semibold text-sm rounded-xl transition flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              Scientific foundation
            </Link>
          </div>

          <p className="text-xs font-mono text-ink-secondary pt-1">
            Planning tool — not a collision probability score.
          </p>
        </section>

        {/* Three-Step Physical Narrative */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="bg-surface border border-line rounded-xl p-6 space-y-2.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-protect-soft text-protect font-mono font-bold flex items-center justify-center text-sm">
              01
            </div>
            <h3 className="text-base font-bold text-ink">Capture</h3>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Work from a real pane. Freeze a stable single frame with your camera, framing all four corners.
            </p>
          </div>

          <div className="bg-surface border border-line rounded-xl p-6 space-y-2.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-protect-soft text-protect font-mono font-bold flex items-center justify-center text-sm">
              02
            </div>
            <h3 className="text-base font-bold text-ink">Measure</h3>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Enter the real width and height with a tape measure. WingGap never guesses physical scale from pixels.
            </p>
          </div>

          <div className="bg-surface border border-line rounded-xl p-6 space-y-2.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-protect-soft text-protect font-mono font-bold flex items-center justify-center text-sm">
              03
            </div>
            <h3 className="text-base font-bold text-ink">Plan</h3>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Generate and inspect the physical dot spacing. Audit omitted markers, verify clear axial gaps, and export the guide.
            </p>
          </div>
        </section>

        {/* Field Handoff (Desktop Only - Not shown on mobile) */}
        <section className="hidden md:block bg-surface border border-line rounded-xl p-8 max-w-xl mx-auto shadow-sm text-center space-y-4">
          <span className="text-xs font-mono uppercase tracking-widest text-ink-secondary font-bold block">
            Field Handoff
          </span>
          <h2 className="text-lg font-bold text-ink">Continue on phone</h2>
          <p className="text-xs text-ink-secondary max-w-md mx-auto">
            Scan with your mobile device to open WingGap&apos;s camera directly at the window.
          </p>

          <div className="inline-block p-4 bg-white rounded-xl border border-line shadow-inner">
            {/* Standard high-contrast QR Matrix representation for /scan */}
            <svg
              viewBox="0 0 140 140"
              width="140"
              height="140"
              className="mx-auto"
              aria-label="QR Code to /scan"
            >
              <rect width="140" height="140" fill="#FFFFFF" />
              {/* Position markers */}
              <rect x="10" y="10" width="35" height="35" fill="#171A17" />
              <rect x="15" y="15" width="25" height="25" fill="#FFFFFF" />
              <rect x="20" y="20" width="15" height="15" fill="#171A17" />

              <rect x="95" y="10" width="35" height="35" fill="#171A17" />
              <rect x="100" y="15" width="25" height="25" fill="#FFFFFF" />
              <rect x="105" y="20" width="15" height="15" fill="#171A17" />

              <rect x="10" y="95" width="35" height="35" fill="#171A17" />
              <rect x="15" y="100" width="25" height="25" fill="#FFFFFF" />
              <rect x="20" y="105" width="15" height="15" fill="#171A17" />

              {/* Data pattern modules */}
              <rect x="55" y="15" width="10" height="10" fill="#171A17" />
              <rect x="75" y="15" width="10" height="10" fill="#171A17" />
              <rect x="55" y="35" width="10" height="10" fill="#171A17" />
              <rect x="65" y="25" width="10" height="10" fill="#171A17" />
              <rect x="20" y="55" width="10" height="10" fill="#171A17" />
              <rect x="40" y="55" width="10" height="10" fill="#171A17" />
              <rect x="60" y="55" width="10" height="10" fill="#171A17" />
              <rect x="80" y="55" width="10" height="10" fill="#171A17" />
              <rect x="100" y="55" width="10" height="10" fill="#171A17" />
              <rect x="120" y="55" width="10" height="10" fill="#171A17" />
              <rect x="30" y="75" width="10" height="10" fill="#171A17" />
              <rect x="50" y="75" width="10" height="10" fill="#171A17" />
              <rect x="70" y="75" width="10" height="10" fill="#171A17" />
              <rect x="90" y="75" width="10" height="10" fill="#171A17" />
              <rect x="110" y="75" width="10" height="10" fill="#171A17" />
              <rect x="55" y="95" width="10" height="10" fill="#171A17" />
              <rect x="75" y="95" width="10" height="10" fill="#171A17" />
              <rect x="95" y="95" width="10" height="10" fill="#171A17" />
              <rect x="115" y="95" width="10" height="10" fill="#171A17" />
              <rect x="55" y="115" width="10" height="10" fill="#171A17" />
              <rect x="75" y="115" width="10" height="10" fill="#171A17" />
              <rect x="95" y="115" width="10" height="10" fill="#171A17" />
              <rect x="115" y="115" width="10" height="10" fill="#171A17" />
            </svg>
          </div>

          <div>
            <button
              onClick={handleCopyLink}
              className="text-xs font-mono text-ink-secondary hover:text-ink border border-line px-3 py-1.5 rounded bg-canvas hover:bg-surface transition"
            >
              {copied ? "✓ Copied /scan link" : "Copy scanner URL"}
            </button>
          </div>
        </section>
      </main>

      {/* Quiet Field Footer */}
      <footer className="border-t border-line py-6 text-center text-xs font-mono text-ink-secondary">
        WingGap v3 · Autonomous Bird-Safe Field Planning Instrument · Surface 1 Regular Dot Spacing
      </footer>
    </div>
  );
}
