import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { toMm, fromMm } from "@/lib/units";
import { generatePlan } from "@/lib/grid/generate";
import { removeMarker, repairPlan } from "@/lib/grid/repair";
import { analyzeMarkerRemoval } from "@/lib/grid/analyzeRemoval";
import { buildScannerUrl } from "@/lib/handoff/url";
import { stopMediaStream } from "@/lib/camera/stream";
import {
  saveScanSession,
  loadScanSession,
  clearScanSession,
  type ScanSessionData,
} from "@/lib/session/storage";
import {
  DOT_DIAMETER_MM,
  GUIDANCE_CLEAR_GAP_MM,
  TARGET_PITCH_MM,
} from "@/lib/grid/spec";

describe("RUN 2 Hardening Test Suite — Code Review Verifications", () => {
  let storageMap: Map<string, string>;

  beforeEach(() => {
    storageMap = new Map<string, string>();
    const mockSessionStorage = {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, value: string) => storageMap.set(key, value),
      removeItem: (key: string) => storageMap.delete(key),
      clear: () => storageMap.clear(),
    };

    (globalThis as unknown as { window: unknown }).window = {
      sessionStorage: mockSessionStorage,
      location: { origin: "http://localhost:3000" },
    };

    clearScanSession();
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
    vi.unstubAllEnvs();
  });

  // 1. Unit toggle data correctness
  describe("1. Unit Toggle & Back-Navigation Dimension Correctness", () => {
    it("preserves exact physical mm when toggling 60 cm -> in", () => {
      const originalCm = 60;
      const physicalMm = toMm(originalCm, "cm"); // 600 mm
      expect(physicalMm).toBe(600);

      const convertedIn = fromMm(physicalMm, "in"); // 600 / 25.4 = 23.622...
      const roundTripMm = toMm(convertedIn, "in");
      expect(roundTripMm).toBeCloseTo(600, 4);

      // Simulating the UI state update with 2-decimal precision rounding
      const roundedIn = Math.round(convertedIn * 100) / 100; // 23.62
      const roundedMm = toMm(roundedIn, "in");
      expect(roundedMm).toBeCloseTo(599.948, 2);
    });

    it("preserves exact physical mm when toggling 24 in -> cm", () => {
      const originalIn = 24;
      const physicalMm = toMm(originalIn, "in"); // 609.6 mm
      expect(physicalMm).toBeCloseTo(609.6, 4);

      const convertedCm = fromMm(physicalMm, "cm"); // 60.96 cm
      expect(convertedCm).toBeCloseTo(60.96, 4);

      const roundTripMm = toMm(convertedCm, "cm");
      expect(roundTripMm).toBeCloseTo(609.6, 4);
    });

    it("restores correct inch values on Back from Inspector with unit=in", () => {
      // User entered 24 inches = 609.6 mm
      const storedPaneWidthMm = 609.6;
      const storedPaneHeightMm = 914.4; // 36 inches
      const selectedUnit = "in";

      // Fixed Back-to-Dimensions calculation: fromMm(storedMm, selectedUnit)
      const restoredWidthIn = fromMm(storedPaneWidthMm, selectedUnit);
      const restoredHeightIn = fromMm(storedPaneHeightMm, selectedUnit);

      expect(restoredWidthIn).toBeCloseTo(24, 4);
      expect(restoredHeightIn).toBeCloseTo(36, 4);

      // Verify the buggy legacy division by 10 would have failed
      const buggyWidth = storedPaneWidthMm / 10;
      expect(buggyWidth).toBe(60.96); // 60.96 != 24
      expect(restoredWidthIn).not.toBe(buggyWidth);
    });
  });

  // 2. Authoritative marker deletion metrics
  describe("2. Authoritative Deletion Metrics (analyzeMarkerRemoval)", () => {
    const W = 600;
    const H = 900;

    it("computes authoritative center span for interior marker deletion", () => {
      const plan = generatePlan(W, H);
      // Remove interior marker at row 5, col 5
      const mutated = removeMarker(plan, { row: 5, col: 5 });
      const analysis = analyzeMarkerRemoval(mutated, { row: 5, col: 5 });

      expect(analysis.isEdgeDeletion).toBe(false);
      expect(analysis.edgeType).toBeNull();
      expect(analysis.metricType).toBe("CENTER_SPAN");
      expect(analysis.primaryMetricLabel).toBe("Affected center span");
      expect(analysis.secondaryMetricLabel).toBe("Clear glass between dots");

      const pitchX = W / plan.spec.columns;
      const pitchY = H / plan.spec.rows;
      const expectedSpan = Math.max(2 * pitchX, 2 * pitchY);
      const expectedClearGap = expectedSpan - DOT_DIAMETER_MM;

      expect(analysis.affectedSpanMm).toBeCloseTo(expectedSpan, 4);
      expect(analysis.clearOpeningMm).toBeCloseTo(expectedClearGap, 4);
      expect(analysis.guidanceCheckMet).toBe(false);
    });

    it("computes authoritative boundary clearance for left edge deletion", () => {
      const plan = generatePlan(W, H);
      // Left edge marker: col 0, row 5
      const mutated = removeMarker(plan, { row: 5, col: 0 });
      const analysis = analyzeMarkerRemoval(mutated, { row: 5, col: 0 });

      expect(analysis.isEdgeDeletion).toBe(true);
      expect(analysis.edgeType).toBe("left");
      expect(analysis.metricType).toBe("BOUNDARY_CLEARANCE");
      expect(analysis.primaryMetricLabel).toBe("Affected boundary clearance");
      expect(analysis.secondaryMetricLabel).toBe("Clear glass to perimeter");

      // First surviving marker on row 5 is col 1
      const firstSurviving = mutated.markers.find((m) => m.row === 5 && m.col === 1);
      expect(firstSurviving).toBeDefined();

      const expectedClearance = firstSurviving!.xMm - firstSurviving!.diameterMm / 2;
      expect(analysis.clearOpeningMm).toBeCloseTo(expectedClearance, 4);
      expect(analysis.affectedSpanMm).toBeCloseTo(firstSurviving!.xMm, 4);
    });

    it("computes authoritative boundary clearance for right edge deletion", () => {
      const plan = generatePlan(W, H);
      const rightCol = plan.spec.columns - 1;
      const mutated = removeMarker(plan, { row: 4, col: rightCol });
      const analysis = analyzeMarkerRemoval(mutated, { row: 4, col: rightCol });

      expect(analysis.isEdgeDeletion).toBe(true);
      expect(analysis.edgeType).toBe("right");
      expect(analysis.primaryMetricLabel).toBe("Affected boundary clearance");

      const lastSurviving = mutated.markers.find((m) => m.row === 4 && m.col === rightCol - 1);
      expect(lastSurviving).toBeDefined();

      const expectedClearance = W - (lastSurviving!.xMm + lastSurviving!.diameterMm / 2);
      expect(analysis.clearOpeningMm).toBeCloseTo(expectedClearance, 4);
    });

    it("computes authoritative boundary clearance for top and bottom edge deletions", () => {
      const plan = generatePlan(W, H);

      // Top edge
      const mutatedTop = removeMarker(plan, { row: 0, col: 3 });
      const analysisTop = analyzeMarkerRemoval(mutatedTop, { row: 0, col: 3 });
      expect(analysisTop.isEdgeDeletion).toBe(true);
      expect(analysisTop.edgeType).toBe("top");
      expect(analysisTop.primaryMetricLabel).toBe("Affected boundary clearance");

      // Bottom edge
      const bottomRow = plan.spec.rows - 1;
      const mutatedBottom = removeMarker(plan, { row: bottomRow, col: 3 });
      const analysisBottom = analyzeMarkerRemoval(mutatedBottom, { row: bottomRow, col: 3 });
      expect(analysisBottom.isEdgeDeletion).toBe(true);
      expect(analysisBottom.edgeType).toBe("bottom");
      expect(analysisBottom.primaryMetricLabel).toBe("Affected boundary clearance");
    });

    it("restores canonical layout and clears failures on repair", () => {
      const plan = generatePlan(W, H);
      const mutated = removeMarker(plan, { row: 3, col: 3 });
      expect(mutated.markers.length).toBe(plan.markers.length - 1);

      const repaired = repairPlan(mutated);
      expect(repaired.markers.length).toBe(plan.markers.length);
      const check = analyzeMarkerRemoval(repaired, { row: 3, col: 3 });
      expect(check.validation.targetMet).toBe(true);
      expect(check.validation.guidanceCheckMet).toBe(true);
    });
  });

  // 3. buildScannerUrl
  describe("3. Field Handoff URL Builder (buildScannerUrl)", () => {
    it("respects canonical NEXT_PUBLIC_APP_URL precedence over runtimeOrigin", () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://winggap.example.org");
      const url = buildScannerUrl("http://localhost:3000");
      expect(url).toBe("https://winggap.example.org/scan?source=qr");
    });

    it("prevents double slashes before path", () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://winggap.example.org///");
      const url = buildScannerUrl();
      expect(url).toBe("https://winggap.example.org/scan?source=qr");
      expect(url).not.toContain("///");
      expect(url).not.toContain(".org//scan");
    });

    it("strictly appends /scan?source=qr without secrets, tokens, or state", () => {
      const url = buildScannerUrl("https://preview.winggap.app");
      const parsed = new URL(url);
      expect(parsed.pathname).toBe("/scan");
      expect(parsed.search).toBe("?source=qr");
      expect(parsed.searchParams.get("source")).toBe("qr");
      expect(parsed.searchParams.has("token")).toBe(false);
      expect(parsed.searchParams.has("secret")).toBe(false);
      expect(parsed.searchParams.has("image")).toBe(false);
      expect(parsed.searchParams.has("width")).toBe(false);
    });

    it("rejects localhost in production environment", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
      const url = buildScannerUrl();
      expect(url).not.toContain("localhost");
      expect(url.startsWith("https://")).toBe(true);
    });

    it("falls back gracefully when configured origin is invalid", () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "not-a-valid-url");
      const url = buildScannerUrl("https://valid-runtime.org");
      expect(url).toBe("https://valid-runtime.org/scan?source=qr");
    });
  });

  // 4. Camera stream cleanup helper
  describe("4. Camera Stream Track Cleanup (stopMediaStream)", () => {
    it("stops all active tracks on the media stream", () => {
      const mockStop1 = vi.fn();
      const mockStop2 = vi.fn();

      const mockStream = {
        getTracks: () => [
          { stop: mockStop1 } as unknown as MediaStreamTrack,
          { stop: mockStop2 } as unknown as MediaStreamTrack,
        ],
      } as MediaStream;

      stopMediaStream(mockStream);

      expect(mockStop1).toHaveBeenCalledTimes(1);
      expect(mockStop2).toHaveBeenCalledTimes(1);
    });

    it("handles null or undefined stream gracefully without throwing", () => {
      expect(() => stopMediaStream(null)).not.toThrow();
      expect(() => stopMediaStream(undefined)).not.toThrow();
    });
  });

  // 5. Session privacy & storage hardening
  describe("5. Session Storage Privacy & Structural Hardening", () => {
    it("strictly omits imageDataUrl from persistent sessionStorage representation", () => {
      const plan = generatePlan(600, 900);
      const sessionData: ScanSessionData = {
        sessionId: "priv_test_1",
        capturedAt: Date.now(),
        imageDataUrl: "data:image/jpeg;base64,SECRET_RAW_IMAGE_BYTES_THAT_MUST_NEVER_PERSIST",
        intrinsicWidth: 1920,
        intrinsicHeight: 1080,
        corners: [
          { x: 10, y: 10 },
          { x: 100, y: 10 },
          { x: 100, y: 100 },
          { x: 10, y: 100 },
        ],
        paneWidthMm: 600,
        paneHeightMm: 900,
        unit: "cm",
        plan,
      };

      saveScanSession(sessionData);

      // Check what is physically inside sessionStorage
      const rawStored = storageMap.get("winggap_scan_session_v3");
      expect(rawStored).toBeDefined();
      const parsed = JSON.parse(rawStored!);
      expect(parsed.imageDataUrl).toBeNull();
      expect(rawStored).not.toContain("SECRET_RAW_IMAGE_BYTES");
    });

    it("returns null safely on malformed or tampered sessionStorage data without throwing", () => {
      clearScanSession();

      // Case A: Missing plan.spec
      storageMap.set(
        "winggap_scan_session_v3",
        JSON.stringify({
          sessionId: "bad_spec",
          paneWidthMm: 600,
          paneHeightMm: 900,
          plan: { markers: [] },
        })
      );
      expect(loadScanSession()).toBeNull();

      // Case B: Corrupted dimensions (out of bounds)
      storageMap.set(
        "winggap_scan_session_v3",
        JSON.stringify({
          sessionId: "bad_dims",
          paneWidthMm: 50, // Below 100 mm minimum
          paneHeightMm: 900,
          plan: generatePlan(600, 900),
        })
      );
      expect(loadScanSession()).toBeNull();

      // Case C: Invalid JSON
      storageMap.set("winggap_scan_session_v3", "{bad-json:");
      expect(loadScanSession()).toBeNull();
    });

    it("does not fabricate any default 600x900 plan when no session exists", () => {
      clearScanSession();
      storageMap.clear();
      const restored = loadScanSession();
      expect(restored).toBeNull();
    });
  });
});
