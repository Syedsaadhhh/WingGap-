/**
 * WingGap Session Storage
 * Manages ephemeral session state for camera capture, dimensions, plan, and guide.
 *
 * Rules:
 * - Current-tab/session scope (sessionStorage).
 * - Never trusts stored validation status: recomputes validation on restore.
 * - Retake or reset invalidates stale geometry.
 */

import { validatePlan } from "../grid/validate.ts";
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

// In-memory fallback if sessionStorage is unavailable (e.g. non-browser environments)
let inMemorySession: ScanSessionData | null = null;

export function saveScanSession(data: ScanSessionData): void {
  inMemorySession = data;
  if (typeof window === "undefined" || !window.sessionStorage) return;

  try {
    // Only persist what is safe and necessary. If image data URL is too large for storage, omit it from storage
    const storageCopy = { ...data };
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(storageCopy));
    } catch {
      // If quota exceeded due to high-res data URL, store without image (inMemory retains it)
      storageCopy.imageDataUrl = null;
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(storageCopy));
    }
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
        sessionData = JSON.parse(raw);
      }
    } catch (e) {
      console.warn("Could not load WingGap session from sessionStorage", e);
    }
  }

  if (!sessionData) return null;

  // Never trust persisted validation status: recompute validator dynamically
  let validation: ValidationResult | null = null;
  if (sessionData.plan) {
    validation = validatePlan(sessionData.plan);
  }

  return {
    data: sessionData,
    validation,
  };
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
