/**
 * WingGap Field Handoff URL Builder
 * Generates canonical /scan URL for QR code and copy action.
 *
 * Rules:
 * - Precedence:
 *   1. NEXT_PUBLIC_APP_URL (when configured and valid HTTP/HTTPS URL)
 *   2. runtimeOrigin (e.g. window.location.origin)
 *   3. fallback relative /scan?source=qr
 * - In production, rejects localhost if NEXT_PUBLIC_APP_URL was set to localhost.
 * - Strictly /scan?source=qr (no tokens, no secrets, no session state).
 * - Never produces double slashes.
 */

export function buildScannerUrl(runtimeOrigin?: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  let baseOrigin = "";

  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      // In production, do not encode localhost
      if (
        process.env.NODE_ENV === "production" &&
        (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
      ) {
        if (
          runtimeOrigin &&
          !runtimeOrigin.includes("localhost") &&
          !runtimeOrigin.includes("127.0.0.1")
        ) {
          baseOrigin = new URL(runtimeOrigin).origin;
        } else {
          baseOrigin = "https://winggap.vercel.app";
        }
      } else {
        baseOrigin = parsed.origin;
      }
    } catch {
      // Invalid env URL format, fall back to runtime origin
      if (runtimeOrigin) {
        try {
          baseOrigin = new URL(runtimeOrigin).origin;
        } catch {
          baseOrigin = "";
        }
      }
    }
  }

  if (!baseOrigin && runtimeOrigin) {
    try {
      baseOrigin = new URL(runtimeOrigin).origin;
    } catch {
      baseOrigin = "";
    }
  }

  // Remove trailing slashes
  const cleanBase = baseOrigin.replace(/\/+$/, "");

  if (cleanBase) {
    return `${cleanBase}/scan?source=qr`;
  }

  return "/scan?source=qr";
}
