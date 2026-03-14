import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QrCode, Gift, RotateCcw, X, Star } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "eagle-loyalty-stamps";
const VALID_CODE = "EAGLE2026";
const TOTAL_STAMPS = 10;

const eagleStampSvg = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61z" />
  </svg>
);

const Loyalty = () => {
  const [stamps, setStamps] = useState(0);
  const [redeemed, setRedeemed] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();

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

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    await stopScanner();
    await new Promise((r) => setTimeout(r, 300));

    const el = document.getElementById("qr-reader");
    if (!el) return;

    const qr = new Html5Qrcode("qr-reader");
    scannerRef.current = qr;

    try {
      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          if (decodedText.trim().toUpperCase() === VALID_CODE) {
            if (stamps < TOTAL_STAMPS) {
              setStamps((prev) => Math.min(prev + 1, TOTAL_STAMPS));
              toast({ title: "Stamp added!", description: `You now have ${Math.min(stamps + 1, TOTAL_STAMPS)} of ${TOTAL_STAMPS} stamps.` });
            }
            stopScanner();
            setScannerOpen(false);
          } else {
            toast({ title: "Invalid code", description: "This QR code is not recognized.", variant: "destructive" });
          }
        },
        () => {}
      );
    } catch {
      toast({ title: "Camera error", description: "Could not access the camera. Please allow camera permissions.", variant: "destructive" });
      setScannerOpen(false);
    }
  }, [stamps, stopScanner, toast]);

  const handleScannerOpen = () => {
    if (stamps >= TOTAL_STAMPS) {
      setRewardOpen(true);
      return;
    }
    setScannerOpen(true);
  };

  const handleScannerClose = async () => {
    await stopScanner();
    setScannerOpen(false);
  };

  const handleRedeem = () => {
    setStamps(0);
    setRedeemed(false);
    setRewardOpen(false);
    toast({ title: "Redeemed!", description: "Your stamp card has been reset. Enjoy! 🍻" });
  };

  const isComplete = stamps >= TOTAL_STAMPS;

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header — matches Agenda & Contact layout */}
      <div className="pt-6 px-4 max-w-lg mx-auto w-full">
        <h1 className="text-4xl font-display tracking-wider text-foreground mb-2 flex items-center gap-3">
          <Star className="w-7 h-7 text-primary" />
          LOYALTY
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          Collect {TOTAL_STAMPS} stamps and earn one time free entry.
        </p>
      </div>

      {/* Stamp Grid */}
      <div className="px-4 max-w-[90%] mx-auto w-full">
        {isComplete ? (
          <div className="relative rounded-2xl border-2 border-primary p-8 text-center neon-border">
            <Gift className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse-red" />
            <h2 className="text-2xl text-foreground mb-2">CONGRATS!</h2>
            <p className="text-foreground text-sm mb-6">
              <strong>Collect 10 stamps and earn one time free entry.</strong>
            </p>
            <Button variant="eagle" size="lg" className="w-full" onClick={() => setRewardOpen(true)}>
              <Gift className="w-5 h-5 mr-2" />
              Redeem reward
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="grid grid-cols-5 gap-4 mb-2">
              {Array.from({ length: TOTAL_STAMPS }).map((_, i) => {
                const filled = i < stamps;
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-full flex items-center justify-center transition-all duration-300 ${
                      filled
                        ? "bg-primary text-primary-foreground shadow-[var(--shadow-red)]"
                        : "bg-secondary text-muted-foreground border border-border"
                    }`}
                  >
                    {filled ? eagleStampSvg : <span className="text-xs font-semibold">{i + 1}</span>}
                  </div>
                );
              })}
            </div>
            <p className="text-center text-muted-foreground text-xs mt-4">
              {stamps} / {TOTAL_STAMPS} stamps collected
            </p>
          </div>
        )}

        {/* Scan Button */}
        <Button
          variant="eagle"
          size="lg"
          className="w-full mt-6"
          onClick={handleScannerOpen}
        >
          <QrCode className="w-5 h-5 mr-2" />
          {isComplete ? "View reward" : "Scan for stamp"}
        </Button>
      </div>

      {/* QR Scanner Dialog */}
      <Dialog open={scannerOpen} onOpenChange={(open) => { if (!open) handleScannerClose(); }}>
        <DialogContent className="max-w-[400px] w-[90%] rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              Scan QR Code
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Point your camera at the Eagle QR code to collect a stamp.
            </DialogDescription>
          </DialogHeader>
          <div
            id="qr-reader"
            className="w-full rounded-lg overflow-hidden bg-background"
            style={{ minHeight: 280 }}
          />
          <Button variant="eagle-outline" onClick={handleScannerClose} className="w-full mt-2">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </DialogContent>
      </Dialog>

      {/* Reward Dialog */}
      <Dialog open={rewardOpen} onOpenChange={setRewardOpen}>
        <DialogContent className="max-w-[400px] w-[90%] rounded-2xl bg-card border-primary neon-border">
          <DialogHeader>
            <DialogTitle className="text-foreground text-2xl flex items-center gap-2">
              <Gift className="w-6 h-6 text-primary" />
              Free Entry!
            </DialogTitle>
            <DialogDescription className="text-foreground text-sm">
              Show this screen to the bartender to claim your reward.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center">
            <Gift className="w-20 h-20 text-primary mx-auto my-4 animate-pulse-red" />
            <p className="text-foreground text-sm font-bold mb-2">
              Collect 10 stamps and earn one time free entry.
            </p>
            <p className="text-muted-foreground text-xs mb-4">
              The bartender will tap "Redeem" to reset your card.
            </p>
          </div>
          <Button variant="eagle" size="lg" className="w-full" onClick={handleRedeem}>
            <RotateCcw className="w-5 h-5 mr-2" />
            Redeem & reset card
          </Button>
        </DialogContent>
      </Dialog>

      {scannerOpen && <ScannerStarter start={startScanner} />}
    </div>
  );
};

const ScannerStarter = ({ start }: { start: () => void }) => {
  useEffect(() => { start(); }, [start]);
  return null;
};

export default Loyalty;
