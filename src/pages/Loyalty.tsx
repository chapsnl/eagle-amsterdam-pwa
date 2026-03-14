import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QrCode, Gift, RotateCcw, X, Star, CheckCircle, Camera } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "eagle-loyalty-stamps";
const VALID_CODE = "EAGLE2026";
const TOTAL_STAMPS = 10;

type CameraPermission = "prompt" | "granted" | "denied" | "unknown";

const Loyalty = () => {
  const [stamps, setStamps] = useState(0);
  const [redeemed, setRedeemed] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [redeemSuccessOpen, setRedeemSuccessOpen] = useState(false);
  const [redeemFading, setRedeemFading] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<CameraPermission>("unknown");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const hasScannedRef = useRef(false);
  const scannerInitializedRef = useRef(false);
  const stampsRef = useRef(stamps);
  const { toast } = useToast();

  // Keep stampsRef in sync so the scan callback always has the latest value
  useEffect(() => { stampsRef.current = stamps; }, [stamps]);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      setStamps(data.stamps || 0);
      setRedeemed(data.redeemed || false);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stamps, redeemed }));
  }, [stamps, redeemed]);

  // Show reward dialog when 10 stamps reached
  useEffect(() => {
    if (stamps >= TOTAL_STAMPS && !redeemed) {
      setRewardOpen(true);
    }
  }, [stamps, redeemed]);

  // Check camera permission on mount (non-Safari)
  useEffect(() => {
    const checkPermission = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: "camera" as PermissionName });
          setCameraPermission(result.state as CameraPermission);
          result.addEventListener("change", () => {
            setCameraPermission(result.state as CameraPermission);
          });
        }
      } catch {
        // permissions API not supported (e.g. Safari)
      }
    };
    checkPermission();
  }, []);

  // Nuclear kill-switch: stop everything camera-related
  const nuclearKillCamera = useCallback(() => {
    // 1. Stop the globally tracked stream
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => {
        t.enabled = false;
        t.stop();
      });
      activeStreamRef.current = null;
    }
    // 2. Kill every video element's stream on the page
    document.querySelectorAll("video").forEach((v) => {
      if (v.srcObject) {
        (v.srcObject as MediaStream).getTracks().forEach((t) => {
          t.enabled = false;
          t.stop();
        });
        v.srcObject = null;
      }
    });
    // 3. Remove video elements from qr-reader to force DOM cleanup
    const el = document.getElementById("qr-reader");
    if (el) {
      el.querySelectorAll("video").forEach((v) => v.remove());
    }
  }, []);

  // Clean up scanner and camera on page unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2) scannerRef.current.stop();
          scannerRef.current.clear();
        } catch { /* ignore */ }
        scannerRef.current = null;
      }
      nuclearKillCamera();
      scannerInitializedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pauseScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch { /* ignore */ }
      scannerRef.current = null;
      scannerInitializedRef.current = false;
    }
    nuclearKillCamera();
  }, [nuclearKillCamera]);

  const handleScanResult = useCallback((decodedText: string) => {
    if (hasScannedRef.current) return;

    if (decodedText.trim().toUpperCase() === VALID_CODE) {
      hasScannedRef.current = true;
      const currentStamps = stampsRef.current;
      if (currentStamps < TOTAL_STAMPS) {
        const newCount = Math.min(currentStamps + 1, TOTAL_STAMPS);
        setStamps(newCount);
        setSuccessMsg(`You now have ${newCount} of ${TOTAL_STAMPS} stamps.`);
        setSuccessOpen(true);
      }
      pauseScanner();
      setScannerOpen(false);
    } else {
      toast({ title: "Invalid code", description: "This QR code is not recognized.", variant: "destructive" });
    }
  }, [pauseScanner, toast]);

  const startScanner = useCallback(async () => {
    hasScannedRef.current = false;
    const el = document.getElementById("qr-reader");
    if (!el) return;

    // Singleton: stop any existing scanner first
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch { /* ignore */ }
      scannerRef.current = null;
      scannerInitializedRef.current = false;
    }
    stopAllVideoTracks();

    // Request camera access from user gesture context
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      // Stop pre-check stream — html5-qrcode opens its own
      stream.getTracks().forEach((t) => { t.enabled = false; t.stop(); });
      setCameraPermission("granted");
    } catch {
      setCameraPermission("denied");
      return;
    }

    const qr = new Html5Qrcode("qr-reader");
    scannerRef.current = qr;
    scannerInitializedRef.current = true;

    try {
      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        handleScanResult,
        () => {}
      );

      // Force playsinline for iOS PWA
      const video = el.querySelector("video");
      if (video) {
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
      }
    } catch {
      setCameraPermission("denied");
    }
  }, [handleScanResult, stopAllVideoTracks]);

  // Start scanner immediately when dialog opens
  useEffect(() => {
    if (scannerOpen && cameraPermission !== "denied") {
      const id = requestAnimationFrame(() => { startScanner(); });
      return () => cancelAnimationFrame(id);
    }
  }, [scannerOpen, cameraPermission, startScanner]);

  const handleScannerOpen = () => {
    if (stamps >= TOTAL_STAMPS) {
      setRewardOpen(true);
      return;
    }
    setScannerOpen(true);
  };

  const handleScannerClose = async () => {
    await pauseScanner();
    setScannerOpen(false);
  };

  const handleRedeem = () => {
    setStamps(0);
    setRedeemed(false);
    setRewardOpen(false);
    setRedeemSuccessOpen(true);
    setRedeemFading(false);

    // Auto-hide after 2 seconds with fade-out
    setTimeout(() => {
      setRedeemFading(true);
      setTimeout(() => {
        setRedeemSuccessOpen(false);
        setRedeemFading(false);
      }, 300);
    }, 1700);
  };

  const isComplete = stamps >= TOTAL_STAMPS;

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <div className="pt-8 px-4 max-w-lg mx-auto w-full">
        <h1 className="text-4xl font-display tracking-wider text-foreground mb-2 flex items-center gap-3">
          <Star className="w-7 h-7 text-primary" />
          LOYALTY
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          Collect {TOTAL_STAMPS} stamps to receive one free entry to an Eagle Amsterdam organized event.
        </p>
      </div>

      {/* Stamp Grid */}
      <div className="px-4 max-w-[90%] mx-auto w-full">
        {isComplete ? (
          <div className="relative rounded-2xl border-2 border-primary p-8 text-center neon-border">
            <Gift className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse-red" />
            <h2 className="text-2xl text-foreground mb-2">CONGRATS!</h2>
            <p className="text-foreground text-sm mb-6">
              <strong>Collect 10 stamps to receive one free entry to an Eagle Amsterdam organized event.</strong>
            </p>
            <Button variant="eagle" size="lg" className="w-full text-base py-4" onClick={() => setRewardOpen(true)}>
              <Gift className="w-5 h-5 mr-2" />
              Redeem reward
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="grid grid-cols-3 gap-4 mb-2">
              {Array.from({ length: TOTAL_STAMPS }).map((_, i) => {
                const filled = i < stamps;
                const isLast = i === TOTAL_STAMPS - 1;
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-full flex items-center justify-center transition-all duration-300 ${
                      isLast ? "col-start-2" : ""
                    } ${
                      filled
                        ? "bg-primary text-primary-foreground shadow-[var(--shadow-red)]"
                        : "bg-secondary text-muted-foreground border-2 border-border"
                    }`}
                  >
                    {filled ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9">
                        <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61z" />
                      </svg>
                    ) : (
                      <span className="text-base font-bold tracking-[-0.02em]">{i + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-center text-muted-foreground text-sm mt-4">
              {stamps} / {TOTAL_STAMPS} stamps collected
            </p>
          </div>
        )}

        {/* Scan Button */}
        <Button
          variant="eagle"
          size="lg"
          className="w-full mt-6 text-base py-4"
          onClick={handleScannerOpen}
        >
          <QrCode className="w-5 h-5 mr-2" />
          {isComplete ? "View reward" : "Scan for stamp"}
        </Button>
        <p className="text-muted-foreground text-xs text-center mt-3 tracking-[-0.02em] leading-snug italic">
          *Not valid for events by Ready2Kink, Horse Fair or other external event organizers.
        </p>
      </div>

      {/* QR Scanner Dialog */}
      <Dialog open={scannerOpen} onOpenChange={(open) => { if (!open) handleScannerClose(); }}>
        <DialogContent className="max-w-[400px] w-[90%] rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2 tracking-[-0.05em]">
              <QrCode className="w-5 h-5 text-primary" />
              Scan QR Code
            </DialogTitle>
            <DialogDescription className="text-muted-foreground tracking-[-0.02em]">
              Point your camera at the Eagle QR code to collect a stamp.
            </DialogDescription>
          </DialogHeader>

          {cameraPermission === "denied" ? (
            <div className="rounded-xl bg-secondary p-5 text-center space-y-3">
              <Camera className="w-10 h-10 text-primary mx-auto" />
              <p className="text-foreground text-base font-bold tracking-[-0.02em]">
                Camera access blocked
              </p>
              <p className="text-muted-foreground text-sm tracking-[-0.02em] leading-relaxed">
                You previously denied camera access. To fix this:<br />
                <strong>iOS Safari:</strong> Settings → Safari → Camera → Allow<br />
                <strong>Android Chrome:</strong> Tap the lock icon in the address bar → Permissions → Camera → Allow<br />
                Then reload this page.
              </p>
            </div>
          ) : (
            <div
              id="qr-reader"
              className="w-full rounded-lg overflow-hidden bg-background"
              style={{ minHeight: 280 }}
            />
          )}

          <Button variant="eagle-outline" onClick={handleScannerClose} className="w-full mt-2 tracking-[-0.02em]">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </DialogContent>
      </Dialog>

      {/* Reward Dialog */}
      <Dialog open={rewardOpen} onOpenChange={setRewardOpen}>
        <DialogContent className="max-w-[400px] w-[90%] rounded-2xl bg-card border-primary neon-border">
          <DialogHeader>
            <DialogTitle className="text-foreground text-2xl flex items-center gap-2 tracking-[-0.05em]">
              <Gift className="w-6 h-6 text-primary" />
              Free Entry!
            </DialogTitle>
            <DialogDescription className="text-foreground text-sm tracking-[-0.02em]">
              Show this screen to the bartender to claim your reward.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center">
            <Gift className="w-20 h-20 text-primary mx-auto my-4 animate-pulse-red" />
            <p className="text-foreground text-sm font-bold mb-2 tracking-[-0.02em]">
              Collect 10 stamps to receive one free entry to an Eagle Amsterdam organized event.
            </p>
            <p className="text-muted-foreground text-xs mb-4 tracking-[-0.02em]">
              The bartender will tap "Redeem" to reset your card.
            </p>
          </div>
          <Button variant="eagle" size="lg" className="w-full tracking-[-0.02em]" onClick={handleRedeem}>
            <RotateCcw className="w-5 h-5 mr-2" />
            Redeem & reset card
          </Button>
        </DialogContent>
      </Dialog>

      {/* Success Dialog (stamp collected) */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-[400px] w-[90%] rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2 tracking-[-0.05em]">
              <CheckCircle className="w-5 h-5 text-primary" />
              Success
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base tracking-[-0.02em]">
              {successMsg}
            </DialogDescription>
          </DialogHeader>
          <Button variant="eagle" className="w-full tracking-[-0.02em]" onClick={() => setSuccessOpen(false)}>
            OK
          </Button>
        </DialogContent>
      </Dialog>

      {/* Redeem Success Overlay — auto-dismiss with fade */}
      {redeemSuccessOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300 ${
            redeemFading ? "opacity-0" : "opacity-100"
          }`}
        >
          <div
            className={`max-w-[400px] w-[90%] rounded-2xl bg-card border border-primary p-8 text-center shadow-[var(--shadow-red-intense)] transition-all duration-300 ${
              redeemFading ? "scale-95 opacity-0" : "animate-scale-in scale-100 opacity-100"
            }`}
          >
            <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2" style={{ letterSpacing: "-0.05em" }}>
              Reward Redeemed!
            </h2>
            <p className="text-foreground tracking-[-0.02em]">
              Your stamp card has been reset. Enjoy! 🍻
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loyalty;
