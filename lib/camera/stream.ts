/**
 * WingGap Camera Stream Utilities
 * Provides safe track release and stream lifecycle management.
 */

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  try {
    const tracks = stream.getTracks();
    for (const track of tracks) {
      try {
        track.stop();
      } catch {
        // ignore track stop errors
      }
    }
  } catch {
    // ignore
  }
}
