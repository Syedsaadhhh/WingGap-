"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

export interface CapturedFrame {
  dataUrl: string;
  width: number;
  height: number;
}

interface CameraCaptureProps {
  onCapture: (frame: CapturedFrame) => void;
  onFallbackToManual: () => void;
}

export default function CameraCapture({
  onCapture,
  onFallbackToManual,
}: CameraCaptureProps) {
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [errorType, setErrorType] = useState<"denied" | "unavailable" | "playback" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    setStreamActive(false);
    setVideoReady(false);
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const startCamera = async () => {
    setErrorType(null);
    setErrorMessage(null);
    setPermissionRequested(true);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setErrorType("unavailable");
      setErrorMessage("Camera API is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => {
          console.warn("Video playback error:", err);
          setErrorType("playback");
          setErrorMessage("Failed to start video playback.");
        });
      }
      setStreamActive(true);
    } catch (err: unknown) {
      stopStream();
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setErrorType("denied");
          setErrorMessage("Camera access is off.");
          return;
        }
        if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setErrorType("unavailable");
          setErrorMessage("No usable camera was found.");
          return;
        }
      }
      setErrorType("playback");
      setErrorMessage(
        err instanceof Error ? err.message : "Could not initialize camera."
      );
    }
  };

  const handleVideoMetadata = () => {
    if (videoRef.current) {
      const w = videoRef.current.videoWidth;
      const h = videoRef.current.videoHeight;
      if (w > 0 && h > 0) {
        setVideoReady(true);
      }
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !videoReady) return;

    const video = videoRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (width <= 0 || height <= 0) {
      setErrorType("playback");
      setErrorMessage("Video frame dimensions are invalid.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setErrorType("playback");
      setErrorMessage("Could not create canvas context for capture.");
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    // Stop live stream immediately after capture
    stopStream();

    onCapture({
      dataUrl,
      width,
      height,
    });
  };

  // 1. Permission Pre-flight Explainer Screen
  if (!permissionRequested) {
    return (
      <div className="bg-surface border border-line rounded-xl p-6 sm:p-8 max-w-lg mx-auto text-center space-y-6 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-protect-soft text-protect flex items-center justify-center mx-auto text-xl font-mono">
          📷
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-ink">
            Use your camera to frame the pane.
          </h2>
          <p className="text-sm text-ink-secondary leading-relaxed">
            WingGap uses the live camera only to capture the window you want to plan. The image is processed locally for this session.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={startCamera}
            className="w-full min-h-[48px] sm:min-h-[52px] bg-protect text-white font-semibold rounded-lg hover:bg-protect/90 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-protect text-base"
          >
            Allow camera
          </button>
          <button
            onClick={onFallbackToManual}
            className="w-full min-h-[44px] bg-canvas text-ink font-medium border border-line rounded-lg hover:bg-surface transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ink text-sm"
          >
            Use manual planner
          </button>
        </div>
      </div>
    );
  }

  // 2. Error States (Denied, Unavailable, Playback Error)
  if (errorType) {
    return (
      <div className="bg-surface border border-danger/30 rounded-xl p-6 sm:p-8 max-w-lg mx-auto text-center space-y-5 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-danger-soft text-danger flex items-center justify-center mx-auto text-xl font-mono">
          ⚠️
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-ink">
            {errorType === "denied"
              ? "Camera access is off."
              : errorType === "unavailable"
              ? "No usable camera was found."
              : "Camera initialization failed."}
          </h2>
          <p className="text-sm text-ink-secondary">
            {errorMessage ??
              "Please check browser camera permissions or switch to the manual 2D planner."}
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {errorType !== "unavailable" && (
            <button
              onClick={startCamera}
              className="w-full min-h-[48px] bg-protect text-white font-semibold rounded-lg hover:bg-protect/90 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-protect text-sm"
            >
              Try again
            </button>
          )}
          <button
            onClick={onFallbackToManual}
            className="w-full min-h-[44px] bg-canvas text-ink font-medium border border-line rounded-lg hover:bg-surface transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ink text-sm"
          >
            Use manual planner
          </button>
        </div>
      </div>
    );
  }

  // 3. Live Framing Viewport
  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-xl overflow-hidden bg-black aspect-[3/4] sm:aspect-[4/3] flex flex-col justify-between shadow-lg border border-line">
      {/* Live Video Feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        onLoadedMetadata={handleVideoMetadata}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Top Framing Bar */}
      <div className="relative z-10 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between text-camera-text">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
          <span className="text-xs font-mono tracking-wider font-bold">LIVE</span>
        </div>
        <button
          onClick={onFallbackToManual}
          className="text-xs font-mono bg-camera-chrome px-3 py-1.5 rounded border border-white/20 hover:bg-white/20 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Manual planner
        </button>
      </div>

      {/* Center Guidance Reticle / Framing Prompts */}
      <div className="relative z-10 text-center px-4 pointer-events-none">
        <div className="inline-block bg-camera-chrome/80 px-4 py-2 rounded-lg border border-white/20 backdrop-blur-sm">
          <p className="text-sm font-semibold text-camera-text">
            Frame one rectangular pane
          </p>
          <p className="text-xs text-camera-text/80 mt-0.5">
            Keep all four corners visible
          </p>
        </div>
      </div>

      {/* Bottom Shutter Controls */}
      <div className="relative z-10 p-5 bg-gradient-to-t from-black/85 via-black/50 to-transparent flex flex-col items-center">
        <button
          onClick={handleCapture}
          disabled={!videoReady}
          className="w-full sm:w-auto min-w-[220px] min-h-[52px] bg-measure hover:bg-measure-strong text-ink font-bold text-base rounded-full shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-measure"
        >
          <span className="w-3 h-3 rounded-full bg-ink inline-block" />
          <span>Capture pane</span>
        </button>
        <p className="text-[11px] text-camera-text/70 font-mono mt-2">
          {videoReady ? "Real camera feed ready" : "Initializing video stream..."}
        </p>
      </div>
    </div>
  );
}
