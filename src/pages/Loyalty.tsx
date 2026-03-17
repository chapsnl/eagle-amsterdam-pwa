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
const LIFETIME_STAMPS_KEY = "eagle-lifetime-stamps";
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
  const [redeemSuccessOpen, setRedeemSuccessOpen] = useState(false);
  const [redeemFading, setRedeemFading] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [invalidOpen, setInvalidOpen] = useState(false);
  const [totalStampsEarned, setTotalStampsEarned] = useState<number>(0);

  useEffect(() => {
    const loadStamps = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          setStamps(data.stamps || 0);
          setRedeemed(data.redeemed || false);
        }

        const sessionRaw = localStorage.getItem("vip_session");
        if (!sessionRaw) return;

        const session = JSON.parse(sessionRaw);
        const { data } = await supabase.functions.invoke("get-profile", {
          body: { userId: session.userId },
        });

        if (data?.success && data.profile) {
          const syncedStamps = data.profile.current_stamps ?? 0;
          const syncedRedeemed = data.profile.current_redeemed ?? false;
          setStamps(syncedStamps);
          setRedeemed(syncedRedeemed);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ stamps: syncedStamps, redeemed: syncedRedeemed }));
        }
      } catch {}
    };
    loadStamps();
  }, []);

  useEffect(() => {
    const loadTotalStamps = async () => {
      try {
        const cachedTotal = localStorage.getItem(LIFETIME_STAMPS_KEY);
        if (cachedTotal !== null) {
          const parsedTotal = Number(cachedTotal);
          if (Number.isFinite(parsedTotal) && parsedTotal >= 0) {
            setTotalStampsEarned(parsedTotal);
          }
        }

        const sessionRaw = localStorage.getItem("vip_session");
        if (!sessionRaw) return;

        const session = JSON.parse(sessionRaw);
        const { data } = await supabase.functions.invoke("get-profile", {
          body: { userId: session.userId },
        });

        if (data?.success && data.profile) {
          const lifetimeTotal = data.profile.total_stamps_earned ?? 0;
          setTotalStampsEarned(lifetimeTotal);
          localStorage.setItem(LIFETIME_STAMPS_KEY, String(lifetimeTotal));
        }
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

  const [levelUpMsg, setLevelUpMsg] = useState<string | null>(null);
  const [levelUpFading, setLevelUpFading] = useState(false);

  const handleScanResult = useCallback(async (decodedText: string) => {
    try {
      const sessionRaw = localStorage.getItem("vip_session");
      if (!sessionRaw) {
        setScannerOpen(false);
        setInvalidOpen(true);
        return;
      }

      const session = JSON.parse(sessionRaw);
      const { data } = await supabase.functions.invoke("scan-loyalty-stamp", {
        body: { userId: session.userId, code: decodedText.trim() },
      });

      setScannerOpen(false);

      if (!data?.success) {
        if (data?.error === "invalid_code") {
          setInvalidOpen(true);
        } else if (data?.error === "cooldown") {
          setLimitOpen(true);
        } else if (data?.error === "card_full") {
          setRewardOpen(true);
        }
        return;
      }

      // Update local state from server response
      setStamps(data.stamps);
      setTotalStampsEarned(data.totalStampsEarned);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ stamps: data.stamps, redeemed: false }));
      localStorage.setItem(LIFETIME_STAMPS_KEY, String(data.totalStampsEarned));

      setSuccessMsg("Loyalty scan successful!");
      setSuccessOpen(true);

      if (data.levelUp) {
        setLevelUpMsg(`🎉 You've reached ${data.levelUp} status!`);
        setLevelUpFading(false);
        setTimeout(() => {
          setLevelUpFading(true);
          setTimeout(() => setLevelUpMsg(null), 400);
        }, 3000);
      }
    } catch {
      setScannerOpen(false);
      setInvalidOpen(true);
    }
  }, []);

  const handlePermissionDenied = useCallback(() => setCameraBlocked(true), []);

  const handleScannerOpen = useCallback(async () => {
    if (stamps >= TOTAL_STAMPS) { setRewardOpen(true); return; }

    try {
      if (navigator.permissions?.query) {
        const result = await navigator.permissions.query({ name: "camera" as PermissionName });
        if (result.state === "denied") { setCameraBlocked(true); setScannerOpen(true); return; }
      }
    } catch {}

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
      <div className="pt-8 px-4 max-w-lg mx-auto w-full">
        <h1 className="text-4xl font-display tracking-wider text-foreground mb-2 flex items-center gap-3">
          <Star className="w-7 h-7 text-primary" />
          LOYALTY
        </h1>
      </div>

      <div className="px-4 max-w-[90%] mx-auto w-full">
        <StampCard stamps={stamps} onRewardOpen={() => setRewardOpen(true)} />



        <Button variant="eagle" size="lg" className="w-full mt-6 text-base py-4" onClick={handleScannerOpen}>
          <QrCode className="w-5 h-5 mr-2" />
          {isComplete ? "View reward" : "Scan for token"}
        </Button>
        <p className="text-muted-foreground text-xs text-center mt-3 tracking-[-0.02em] leading-snug italic">
          *Not valid for events by Ready2Kink, Horse Fair or other external event organizers.
        </p>

        <div className="mt-6 rounded-xl bg-card border border-border p-4 text-center">
          <p className="text-muted-foreground text-xs uppercase tracking-widest mb-1">Lifetime Token Balance</p>
          <p className="text-3xl font-bold text-primary">{totalStampsEarned}</p>
        </div>
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
        message="This QR code is not valid."
        onClose={() => setInvalidOpen(false)}
      />

      <WarningDialog
        open={limitOpen}
        title="Limit Reached"
        message="This code can only be scanned once a week. Try again next week!"
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

      {levelUpMsg && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-400 ${levelUpFading ? "opacity-0 -translate-y-4" : "opacity-100 translate-y-0"}`}>
          <div className="bg-card border border-primary rounded-xl px-6 py-4 shadow-lg text-center">
            <p className="text-foreground text-sm font-bold">{levelUpMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loyalty;
