import React from "react";
import Link from "next/link";
import NavHeader from "../../components/NavHeader";

export default function SciencePage() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <NavHeader />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-10">
        {/* Header */}
        <div className="border-b border-line pb-5 space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-ink-secondary block font-bold">
            Scientific Foundation
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">
            What WingGap checks — and what it does not.
          </h1>
          <p className="text-sm text-ink-secondary leading-relaxed">
            WingGap applies published wildlife biology guidelines to planar architectural glass through deterministic physical calculations.
          </p>
        </div>

        {/* The Core Physics: Reflections & Exterior Placement */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink">
            The Physical Problem: Glass Perception
          </h2>
          <div className="bg-surface border border-line rounded-xl p-5 sm:p-6 text-sm text-ink-secondary space-y-3 leading-relaxed">
            <p>
              Birds do not perceive architectural glass as a solid barrier. Under natural daylight, glass either appears completely transparent (revealing indoor habitat or potted plants) or acts as an exterior mirror reflecting surrounding trees, sky, and greenery. Birds attempt to fly through what appears to be open space.
            </p>
            <p>
              Decades of controlled tunnel tests and field monitoring demonstrate that visual markers must be applied to the <strong className="text-ink">exterior surface (Surface 1)</strong> of the glass. Interior markers often become invisible under direct sun reflections, severely compromising their protective effect.
            </p>
          </div>
        </section>

        {/* Clear Separation: What WingGap Checks vs Does Not Claim */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Checks Card */}
          <div className="bg-surface border-2 border-protect/40 rounded-xl p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center space-x-2 text-protect font-mono text-sm font-bold uppercase tracking-wider">
              <span className="text-base">✓</span>
              <span>What WingGap Checks</span>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-ink-secondary">
              <li className="flex items-start space-x-2">
                <span className="text-protect font-bold shrink-0">•</span>
                <span>
                  <strong className="text-ink">Entered pane dimensions:</strong> Strict verification that width and height fall within supported planar bounds (100 mm to 3000 mm).
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-protect font-bold shrink-0">•</span>
                <span>
                  <strong className="text-ink">Fixed marker diameter:</strong> Minimum circular dot footprint of 6.35 mm (1/4 inch).
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-protect font-bold shrink-0">•</span>
                <span>
                  <strong className="text-ink">Regular-grid coordinates:</strong> Cell-centered canonical spacing across all columns and rows.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-protect font-bold shrink-0">•</span>
                <span>
                  <strong className="text-ink">Center pitch:</strong> Center-to-center marker spacing verified against our internal engineering target of ≤45.0 mm.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-protect font-bold shrink-0">•</span>
                <span>
                  <strong className="text-ink">Clear axial gaps:</strong> Glass openings between adjacent dot edges verified ≤50.8 mm (2 inches).
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-protect font-bold shrink-0">•</span>
                <span>
                  <strong className="text-ink">Boundary clearances:</strong> Perimeter margins from outer dot edges to pane boundaries verified ≤50.8 mm.
                </span>
              </li>
            </ul>
          </div>

          {/* Does Not Claim Card */}
          <div className="bg-surface border-2 border-line rounded-xl p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center space-x-2 text-ink font-mono text-sm font-bold uppercase tracking-wider">
              <span className="text-base">✕</span>
              <span>What WingGap Does Not Claim</span>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-ink-secondary">
              <li className="flex items-start space-x-2">
                <span className="text-ink-secondary font-bold shrink-0">•</span>
                <span>
                  <strong className="text-ink">Collision probability scores:</strong> WingGap does not produce arbitrary statistical risk percentages.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-ink-secondary font-bold shrink-0">•</span>
                <span>
                  <strong className="text-ink">Guaranteed prevention:</strong> No visual pattern can physically prevent 100% of bird collisions across all lighting, angles, and species.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-ink-secondary font-bold shrink-0">•</span>
                <span>
                  <strong className="text-ink">Installed-treatment certification:</strong> WingGap generates a layout plan. It does not detect, verify, or certify finished physical installations.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-ink-secondary font-bold shrink-0">•</span>
                <span>
                  <strong className="text-ink">Species-specific prediction:</strong> WingGap applies general geometric deterrence rather than avian ocular physiology modeling.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-ink-secondary font-bold shrink-0">•</span>
                <span>
                  <strong className="text-ink">Unrestricted 2D largest openings:</strong> Calculations strictly evaluate orthogonal grid and boundary spans, not freeform diagonal openings.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Engineering Target vs Published Guidance Margin */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink">
            The 45 mm Engineering Target
          </h2>
          <div className="bg-surface border border-line rounded-xl p-5 sm:p-6 text-sm text-ink-secondary space-y-3 leading-relaxed">
            <p>
              Published guidance (including American Bird Conservancy and CSA A460:19) recommends that clear spaces between pattern elements not exceed 50.8 mm (2 inches) in either direction.
            </p>
            <p>
              WingGap enforces an internal center-to-center pitch target of <strong className="text-ink">≤45.0 mm</strong>. With 6.35 mm circular dots, a 45.0 mm pitch yields a clear axial gap of:
            </p>
            <div className="font-mono text-center bg-canvas py-2.5 px-4 rounded border border-line text-ink font-bold">
              45.0 mm - 6.35 mm = 38.65 mm clear opening
            </div>
            <p>
              WingGap uses a 45 mm center-pitch target, which creates planning headroom below the selected 50.8 mm clear-spacing check when 6.35 mm dots are used. This is an engineering convention, not a certified installation tolerance.
            </p>
          </div>
        </section>

        {/* Source References */}
        <section className="border-t border-line pt-6 space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-ink-secondary font-bold">
            Key Guidance Sources
          </h3>
          <ul className="space-y-2 text-xs font-mono text-ink-secondary">
            <li>
              • American Bird Conservancy (ABC): Bird-Friendly Building Standard & Threat Factor Evaluations
            </li>
            <li>
              • Canadian Standards Association (CSA): CSA A460:19 Bird-Friendly Building Design Standard
            </li>
            <li>
              • FLAP Canada: Fatal Light Awareness Program Visual Marker Guidelines
            </li>
            <li>
              • City of Toronto: Bird-Friendly Development Guidelines
            </li>
          </ul>
        </section>

        {/* CTA */}
        <div className="pt-2">
          <Link
            href="/scan"
            className="w-full sm:w-auto inline-flex min-h-[48px] px-6 bg-protect text-white font-semibold text-sm rounded-lg hover:bg-protect/90 transition items-center justify-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-protect"
          >
            <span>Scan a window</span>
            <span>→</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
