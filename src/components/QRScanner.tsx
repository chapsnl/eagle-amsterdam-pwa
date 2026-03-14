import { useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScanResult: (decodedText: string) => void;
  onPermissionDenied: () => void;
}

/**
 * Fully isolated QR scanner component.
 * All camera references live AND DIE within this component.
 * When React unmounts this, all hardware connections are destroyed.
 */
const QRScanner = ({ onScanResult, onPermissionDenied }: QRScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasScannedRef = useRef(false);

  // Nuclear kill: destroy every camera trace at hardware level
  const killAllCamera = useCallback(() => {
    // 1) Stop tracked stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }

    // 2) Stop window-level stream
    const w = window as Window & { localStream?: MediaStream | null };
    if (w.localStream) {
      w.localStream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      w.localStream = null;
    }

    // 3) Purge every video element in the entire DOM
    document.querySelectorAll("video").forEach((video) => {
      if (video.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        video.srcObject = null;
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    });

    // 4) Remove rendering nodes from scanner container
    const container = document.getElementById("qr-reader");
    if (container) {
      container.querySelectorAll("video, canvas").forEach((node) => node.remove());
    }
  }, []);

  // Start scanner on mount
  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      const el = document.getElementById("qr-reader");
      if (!el || cancelled) return;

      // Request camera from user-gesture context, then release preflight stream
      try {
        const preflight = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        preflight.getTracks().forEach((t) => {
          t.enabled = false;
          t.stop();
        });
      } catch {
        if (!cancelled) onPermissionDenied();
        return;
      }

      if (cancelled) return;

      const qr = new Html5Qrcode("qr-reader");
      scannerRef.current = qr;

      try {
        await qr.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            if (hasScannedRef.current) return;
            hasScannedRef.current = true;
            onScanResult(decodedText);
          },
          () => {}
        );

        // Capture active stream for guaranteed cleanup
        const video = el.querySelector("video");
        if (video) {
          video.setAttribute("playsinline", "true");
          video.setAttribute("webkit-playsinline", "true");
          if (video.srcObject) {
            const activeStream = video.srcObject as MediaStream;
            streamRef.current = activeStream;
            (window as Window & { localStream?: MediaStream }).localStream = activeStream;
          }
        }
      } catch {
        if (!cancelled) onPermissionDenied();
        killAllCamera();
      }
    };

    // Small delay for Safari permission persistence
    const timeout = setTimeout(start, 100);

    // CLEANUP: this runs when React unmounts this component — total destruction
    return () => {
      cancelled = true;
      clearTimeout(timeout);

      const scanner = scannerRef.current;
      if (scanner) {
        try { void scanner.stop(); } catch { /* ignore */ }
        try { scanner.clear(); } catch { /* ignore */ }
        scannerRef.current = null;
      }

      killAllCamera();
    };
  }, [onScanResult, onPermissionDenied, killAllCamera]);

  return (
    <div
      id="qr-reader"
      className="w-full rounded-lg overflow-hidden bg-background"
      style={{ minHeight: 280 }}
    />
  );
};

export default QRScanner;
