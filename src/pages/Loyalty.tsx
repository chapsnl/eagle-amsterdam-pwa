import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { QrCode, Star, CheckCircle } from "lucide-react";
import StampCard from "@/components/loyalty/StampCard";
import ScannerDialog from "@/components/loyalty/ScannerDialog";
import RewardDialog from "@/components/loyalty/RewardDialog";
import WarningDialog from "@/components/shared/WarningDialog";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "eagle-loyalty-stamps";
const VALID_CODE = "EAGLE2026";
const TOTAL_STAMPS = 9;
const LAST_SCAN_KEY = "last_loyalty_scan";
const COOLDOWN_MS = 160 * 60 * 60 * 1000; // 160 hours

const Loyalty = () => {
  const [stamps, setStamps] = useState(0);
  const [redeemed, setRedeemed] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [limitOpen, setLimitOpen] = useState(false);
  const [limitMsg, setLimitMsg] = useState("");
  const [redeemSuccessOpen, setRedeemSuccessOpen] = useState(false);
  const [redeemFading, setRedeemFading] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [invalidOpen, setInvalidOpen] = useState(false);
  const [totalStampsEarned, setTotalStampsEarned] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      setStamps(data.stamps || 0);
      setRedeemed(data.redeemed || false);
    }
  }, []);

  useEffect(() => {
    const loadTotalStamps = async () => {
      try {
        const sessionRaw = localStorage.getItem("vip_session");
        if (!sessionRaw) return;
        const session = JSON.parse(sessionRaw);
        const { data } = await supabase
          .from("profiles")
          .select("total_stamps_earned")
          .eq("id", session.userId)
          .maybeSingle();
        if (data) setTotalStampsEarned(data.total_stamps_earned || 0);
      } catch {}
    };
    loadTotalStamps();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stamps, redeemed }));
  }, [stamps, redeemed]);

  useEffect(() => {
    if (stamps >= TOTAL_STAMPS && !redeemed) setRewardOpen(true);
  }, [stamps, redeemed]);

  const getRemainingHours = useCallback((): number | null => {
    const lastScan = localStorage.getItem(LAST_SCAN_KEY);
    if (!lastScan) return null;
    const elapsed = Date.now() - parseInt(lastScan, 10);
    if (elapsed >= COOLDOWN_MS) return null;
    return Math.ceil((COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
  }, []);

  const incrementTotalStamps = async () => {
    try {
      const sessionRaw = localStorage.getItem("vip_session");
      if (!sessionRaw) return;
      const session = JSON.parse(sessionRaw);
      const { data } = await supabase
        .from("profiles")
        .select("total_stamps_earned")
        .eq("id", session.userId)
        .maybeSingle();
      if (data) {
        await supabase
          .from("profiles")
          .update({ total_stamps_earned: (data.total_stamps_earned || 0) + 1 })
          .eq("id", session.userId);
      }
    } catch {
      // Silently fail
    }
  };

  const handleScanResult = useCallback((decodedText: string) => {
    if (decodedText.trim().toUpperCase() === VALID_CODE) {
      const remaining = getRemainingHours();
      if (remaining !== null) {
        setScannerOpen(false);
        setLimitMsg(`Next stamp available in ${remaining} hour${remaining !== 1 ? "s" : ""}.`);
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
      incrementTotalStamps();
    } else {
      setScannerOpen(false);
      setInvalidOpen(true);
      setTimeout(() => setInvalidOpen(false), 2000);
    }
  }, [getRemainingHours]);

  const handlePermissionDenied = useCallback(() => setCameraBlocked(true), []);

  const handleScannerOpen = useCallback(async () => {
    if (stamps >= TOTAL_STAMPS) { setRewardOpen(true); return; }
    const remaining = getRemainingHours();
    if (remaining !== null) {
      setLimitMsg(`Next stamp available in ${remaining} hour${remaining !== 1 ? "s" : ""}.`);
      setLimitOpen(true);
      return;
    }

    try {
      if (navigator.permissions?.query) {
        const result = await navigator.permissions.query({ name: "camera" as PermissionName });
        if (result.state === "denied") { setCameraBlocked(true); setScannerOpen(true); return; }
      }
    } catch {}

    setCameraBlocked(false);
    setScannerKey((k) => k + 1);
    setScannerOpen(true);
  }, [stamps, getRemainingHours]);

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
  const remainingHours = getRemainingHours();

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="pt-8 px-4 max-w-lg mx-auto w-full">
        <h1 className="text-4xl font-display tracking-wider text-foreground mb-2 flex items-center gap-3">
          <Star className="w-7 h-7 text-primary" />
          LOYALTY
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          Collect 9 stamps to receive one free entry to an Eagle Amsterdam organized event.
        </p>
      </div>

      <div className="px-4 max-w-[90%] mx-auto w-full">
        <StampCard stamps={stamps} onRewardOpen={() => setRewardOpen(true)} />

        {remainingHours !== null && !isComplete && (
          <p className="text-muted-foreground text-sm text-center mt-4">
            Next stamp available in <strong className="text-foreground">{remainingHours} hour{remainingHours !== 1 ? "s" : ""}</strong>.
          </p>
        )}

        <Button variant="eagle" size="lg" className="w-full mt-6 text-base py-4" onClick={handleScannerOpen}>
          <QrCode className="w-5 h-5 mr-2" />
          {isComplete ? "View reward" : "Scan for stamp"}
        </Button>
        <p className="text-muted-foreground text-xs text-center mt-3 tracking-[-0.02em] leading-snug italic">
          *Not valid for events by Ready2Kink, Horse Fair or other external event organizers.
        </p>
      </div>

      <ScannerDialog
        open={scannerOpen}
        scannerKey={scannerKey}
        cameraBlocked={cameraBlocked}
        onClose={handleScannerClose}
        onScanResult={handleScanResult}
        onPermissionDenied={handlePermissionDenied}
      />

      <RewardDialog open={rewardOpen} onOpenChange={setRewardOpen} onRedeem={handleRedeem} />

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-[400px] w-[90%] rounded-xl bg-card border-border">
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

      <WarningDialog
        open={invalidOpen}
        title="Invalid Code"
        message="This QR code is not recognized."
        onClose={() => setInvalidOpen(false)}
      />

      <WarningDialog
        open={limitOpen}
        title="Limit Reached"
        message={limitMsg}
        onClose={() => setLimitOpen(false)}
      />

      {redeemSuccessOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300 ${redeemFading ? "opacity-0" : "opacity-100"}`}>
          <div className={`max-w-[400px] w-[90%] rounded-xl bg-card border border-primary p-8 text-center shadow-[var(--shadow-red-intense)] transition-all duration-300 ${redeemFading ? "scale-95 opacity-0" : "animate-scale-in scale-100 opacity-100"}`}>
            <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2" style={{ letterSpacing: "-0.05em" }}>Reward Redeemed!</h2>
            <p className="text-foreground tracking-[-0.02em]">Your stamp card has been reset. Enjoy! 🍻</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loyalty;
