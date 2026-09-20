/**
 * WingGap Field Handoff URL Builder
 * Generates canonical /scan URL for QR code and copy action.
 *
 * Rules:
 * - Production Precedence:
 *   1. NEXT_PUBLIC_APP_URL (must be valid HTTPS URL and not localhost/loopback)
 *   2. runtimeOrigin (e.g. window.location.origin, must be valid HTTPS and not localhost/loopback)
 *   3. If neither exists, returns null (never encode invented/unowned domains like winggap.app).
 * - Development:
 *   - Allows http:// and localhost origins for local testing.
 * - Always appends strictly /scan?source=qr (no tokens, no secrets, no session state).
 * - Never produces double slashes.
 */

export function isLoopbackOrLocal(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local")
  );
}

export function buildScannerUrl(
  runtimeOrigin?: string,
  envOverride?: string
): string | null {
  const isProd = process.env.NODE_ENV === "production";
  const envUrl = (envOverride !== undefined ? envOverride : process.env.NEXT_PUBLIC_APP_URL)?.trim();

  // 1. Check configured NEXT_PUBLIC_APP_URL
  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      if (isProd) {
        if (parsed.protocol === "https:" && !isLoopbackOrLocal(parsed.hostname)) {
          return `${parsed.origin}/scan?source=qr`;
        }
      } else {
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          return `${parsed.origin}/scan?source=qr`;
        }
      }
    } catch {
      // Malformed configured URL; fall through to runtime origin
    }
  }

  // 2. Check runtimeOrigin (e.g. window.location.origin)
  if (runtimeOrigin) {
    try {
      const parsed = new URL(runtimeOrigin);
      if (isProd) {
        if (parsed.protocol === "https:" && !isLoopbackOrLocal(parsed.hostname)) {
          return `${parsed.origin}/scan?source=qr`;
        }
      } else {
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          return `${parsed.origin}/scan?source=qr`;
        }
      }
    } catch {
      // Malformed runtime origin
    }
  }

  // 3. Neither valid configured HTTPS origin nor valid runtime HTTPS origin exists:
  // Strictly return null. Never encode an invented domain like winggap.app.
  return null;
}
