/**
 * WingGap Session Storage
 * Manages ephemeral session state for camera capture, dimensions, plan, and guide.
 *
 * Rules:
 * - Current-tab/session scope (sessionStorage).
 * - Never stores raw camera frames or data URLs in persistent storage.
 * - Never trusts stored validation status: recomputes validation dynamically on restore.
 * - Rejects malformed or corrupted restored session data safely.
 */

import { validatePlan } from "../grid/validate.ts";
import { validatePaneDimensions } from "../units/index.ts";
import type { GeneratedPlan, ValidationResult } from "../grid/spec.ts";
import type { Quad } from "../geometry/quad.ts";
import type { MeasurementUnit } from "../units/index.ts";

export interface ScanSessionData {
  sessionId: string;
  capturedAt: number;
  imageDataUrl: string | null;
  intrinsicWidth: number;
  intrinsicHeight: number;
  corners: Quad | null;
  paneWidthMm: number;
  paneHeightMm: number;
  unit: MeasurementUnit;
  plan: GeneratedPlan | null;
}

export interface RestoredSession {
  data: ScanSessionData;
  validation: ValidationResult | null;
}

const SESSION_STORAGE_KEY = "winggap_scan_session_v3";

// In-memory fallback during current browser React session
let inMemorySession: ScanSessionData | null = null;

export function saveScanSession(data: ScanSessionData): void {
  // In-memory may temporarily hold reference
  inMemorySession = { ...data };

  if (typeof window === "undefined" || !window.sessionStorage) return;

  try {
    // Explicit privacy rule: NEVER persist raw image frames or data URLs to sessionStorage
    const storageCopy: ScanSessionData = {
      ...data,
      imageDataUrl: null,
    };
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(storageCopy));
  } catch (e) {
    console.warn("Could not save WingGap session to sessionStorage", e);
  }
}

export function loadScanSession(): RestoredSession | null {
  let sessionData: ScanSessionData | null = inMemorySession;

  if (!sessionData && typeof window !== "undefined" && window.sessionStorage) {
    try {
      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed === "object" &&
          typeof parsed.sessionId === "string" &&
          Number.isFinite(parsed.paneWidthMm) &&
          Number.isFinite(parsed.paneHeightMm) &&
          parsed.plan &&
          typeof parsed.plan === "object" &&
          parsed.plan.spec &&
          Number.isFinite(parsed.plan.spec.paneWidthMm) &&
          Number.isFinite(parsed.plan.spec.paneHeightMm) &&
          Array.isArray(parsed.plan.markers)
        ) {
          sessionData = parsed as ScanSessionData;
          // Ensure imageDataUrl is null from persistent storage
          sessionData.imageDataUrl = null;
        }
      }
    } catch (e) {
      console.warn("Could not load WingGap session from sessionStorage", e);
      return null;
    }
  }

  if (!sessionData || !sessionData.plan) return null;

  // Validate restored dimensions
  const dimCheck = validatePaneDimensions(
    sessionData.paneWidthMm,
    sessionData.paneHeightMm
  );
  if (!dimCheck.valid) {
    return null;
  }

  // Never trust persisted validation status: dynamically recompute validator
  try {
    const validation = validatePlan(sessionData.plan);
    if (!validation.supported) {
      return null;
    }

    return {
      data: sessionData,
      validation,
    };
  } catch {
    return null;
  }
}

export function clearScanSession(): void {
  inMemorySession = null;
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}
