import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QrCode, Star, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StampCard from "@/components/loyalty/StampCard";
import ScannerDialog from "@/components/loyalty/ScannerDialog";
import RewardDialog from "@/components/loyalty/RewardDialog";

const STORAGE_KEY = "eagle-loyalty-stamps";
const VALID_CODE = "EAGLE2026";
const TOTAL_STAMPS = 10;
const LAST_SCAN_KEY = "last_loyalty_scan";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const Loyalty = () => {
  const [stamps, setStamps] = useState(0);
  const [redeemed, setRedeemed] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [limitOpen, setLimitOpen] = useState(false);
  const [redeemSuccessOpen, setRedeemSuccessOpen] = useState(false);
  const [redeemFading, setRedeemFading] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
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
    if (stamps >= TOTAL_STAMPS && !redeemed) setRewardOpen(true);
  }, [stamps, redeemed]);

  const handleScanResult = useCallback((decodedText: string) => {
    if (decodedText.trim().toUpperCase() === VALID_CODE) {
      // Check 7-day cooldown
      const lastScan = localStorage.getItem(LAST_SCAN_KEY);
      if (lastScan && Date.now() - parseInt(lastScan, 10) < SEVEN_DAYS_MS) {
        setScannerOpen(false);
        setLimitOpen(true);
        return;
      }

      localStorage.setItem(LAST_SCAN_KEY, Date.now().toString());
      setStamps((prev) => {
        const newCount = Math.min(prev + 1, TOTAL_STAMPS);
        setSuccessMsg("Loyalty scan successful! See you next week.");
        setSuccessOpen(true);
        return newCount;
      });
      setScannerOpen(false);
    } else {
      toast({ title: "Invalid code", description: "This QR code is not recognized.", variant: "destructive" });
    }
  }, [toast]);

  const handlePermissionDenied = useCallback(() => setCameraBlocked(true), []);

  const handleScannerOpen = useCallback(async () => {
    if (stamps >= TOTAL_STAMPS) { setRewardOpen(true); return; }

    try {
      if (navigator.permissions?.query) {
        const result = await navigator.permissions.query({ name: "camera" as PermissionName });
        if (result.state === "denied") { setCameraBlocked(true); setScannerOpen(true); return; }
      }
    } catch { /* Permissions API not supported */ }

    setCameraBlocked(false);
    setScannerKey((k) => k + 1);
    setScannerOpen(true);
  }, [stamps]);

  const handleScannerClose = useCallback(() => setScannerOpen(false), []);

  const handleRedeem = useCallback(() => {
    setStamps(0);
    setRedeemed(false);
    setRewardOpen(false);
    setRedeemSuccessOpen(true);
    setRedeemFading(false);

    setTimeout(() => {
      setRedeemFading(true);
      setTimeout(() => { setRedeemSuccessOpen(false); setRedeemFading(false); }, 300);
    }, 1700);
  }, []);

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
        <StampCard stamps={stamps} onRewardOpen={() => setRewardOpen(true)} />

        <Button variant="eagle" size="lg" className="w-full mt-6 text-base py-4" onClick={handleScannerOpen}>
          <QrCode className="w-5 h-5 mr-2" />
          {isComplete ? "View reward" : "Scan for stamp"}
        </Button>
        <p className="text-muted-foreground text-xs text-center mt-3 tracking-[-0.02em] leading-snug italic">
          *Not valid for events by Ready2Kink, Horse Fair or other external event organizers.
        </p>
      </div>

      {/* QR Scanner — component FULLY UNMOUNTED when closed */}
      <ScannerDialog
        open={scannerOpen}
        scannerKey={scannerKey}
        cameraBlocked={cameraBlocked}
        onClose={handleScannerClose}
        onScanResult={handleScanResult}
        onPermissionDenied={handlePermissionDenied}
      />

      {/* Reward Dialog */}
      <RewardDialog open={rewardOpen} onOpenChange={setRewardOpen} onRedeem={handleRedeem} />

      {/* Success Dialog */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-[calc(100vw-3rem)] sm:max-w-sm mx-auto rounded-none bg-primary border-primary p-6">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wider text-primary-foreground text-xl flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary-foreground" />
              Success
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/90 text-sm leading-relaxed">
              {successMsg}
            </DialogDescription>
          </DialogHeader>
          <Button variant="eagle-outline" className="w-full rounded-none border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" onClick={() => setSuccessOpen(false)}>
            OK
          </Button>
        </DialogContent>
      </Dialog>

      {/* Limit Reached Dialog */}
      <Dialog open={limitOpen} onOpenChange={setLimitOpen}>
        <DialogContent className="max-w-[calc(100vw-3rem)] sm:max-w-sm mx-auto rounded-none bg-primary border-primary p-6">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wider text-primary-foreground text-xl">
              Limit Reached
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/90 text-sm leading-relaxed">
              You have already scanned this week! Come back next week for your next loyalty stamp.
            </DialogDescription>
          </DialogHeader>
          <Button variant="eagle-outline" className="w-full rounded-none border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" onClick={() => setLimitOpen(false)}>
            GOT IT
          </Button>
        </DialogContent>
      </Dialog>

      {redeemSuccessOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300 ${redeemFading ? "opacity-0" : "opacity-100"}`}>
          <div className={`max-w-[400px] w-[90%] rounded-none bg-primary border border-primary p-8 text-center transition-all duration-300 ${redeemFading ? "scale-95 opacity-0" : "animate-scale-in scale-100 opacity-100"}`}>
            <CheckCircle className="w-12 h-12 text-primary-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-primary-foreground mb-2" style={{ letterSpacing: "-0.05em" }}>Reward Redeemed!</h2>
            <p className="text-primary-foreground tracking-[-0.02em]">Your stamp card has been reset. Enjoy! 🍻</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loyalty;
