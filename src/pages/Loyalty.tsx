import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { QrCode, Star, CheckCircle, ArrowLeft } from "lucide-react";
import StampCard from "@/components/loyalty/StampCard";
import ScannerDialog from "@/components/loyalty/ScannerDialog";
import RewardDialog from "@/components/loyalty/RewardDialog";
import { useAuth } from "@/hooks/useAuth";
import { useLoyaltyStamps } from "@/hooks/useLoyaltyStamps";

const VALID_CODE = "EAGLE2026";

const Loyalty = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { stamps, loading: stampsLoading, addStamp, resetCard, canScan, totalStamps } = useLoyaltyStamps();

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

  // Redirect to VIP if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/vip", { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Show reward dialog when 10 stamps reached
  useEffect(() => {
    if (stamps >= totalStamps) setRewardOpen(true);
  }, [stamps, totalStamps]);

  const handleScanResult = useCallback(async (decodedText: string) => {
    if (decodedText.trim().toUpperCase() === VALID_CODE) {
      if (!canScan()) {
        setScannerOpen(false);
        setLimitOpen(true);
        return;
      }

      const success = await addStamp();
      if (success) {
        setSuccessMsg("Loyalty scan successful! See you next week.");
        setSuccessOpen(true);
      }
      setScannerOpen(false);
    } else {
      setScannerOpen(false);
      setInvalidOpen(true);
      setTimeout(() => setInvalidOpen(false), 2000);
    }
  }, [addStamp, canScan]);

  const handlePermissionDenied = useCallback(() => setCameraBlocked(true), []);

  const handleScannerOpen = useCallback(async () => {
    if (stamps >= totalStamps) { setRewardOpen(true); return; }

    try {
      if (navigator.permissions?.query) {
        const result = await navigator.permissions.query({ name: "camera" as PermissionName });
        if (result.state === "denied") { setCameraBlocked(true); setScannerOpen(true); return; }
      }
    } catch { /* Permissions API not supported */ }

    setCameraBlocked(false);
    setScannerKey((k) => k + 1);
    setScannerOpen(true);
  }, [stamps, totalStamps]);

  const handleScannerClose = useCallback(() => setScannerOpen(false), []);

  const handleRedeem = useCallback(async () => {
    await resetCard();
    setRewardOpen(false);
    setRedeemSuccessOpen(true);
    setRedeemFading(false);

    setTimeout(() => {
      setRedeemFading(true);
      setTimeout(() => { setRedeemSuccessOpen(false); setRedeemFading(false); }, 300);
    }, 1700);
  }, [resetCard]);

  // Show loading while checking auth or loading stamps
  if (authLoading || stampsLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isComplete = stamps >= totalStamps;

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <div className="pt-8 px-4 max-w-lg mx-auto w-full">
        <button
          onClick={() => navigate("/vip")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Terug naar VIP</span>
        </button>
        <h1 className="text-4xl font-display tracking-wider text-foreground mb-2 flex items-center gap-3">
          <Star className="w-7 h-7 text-primary" />
          LOYALTY
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          Collect {totalStamps} stamps to receive one free entry to an Eagle Amsterdam organized event.
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

      {/* QR Scanner */}
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

      {/* Invalid QR Code Popup */}
      <AlertDialog open={invalidOpen} onOpenChange={setInvalidOpen}>
        <AlertDialogContent className="bg-card border-border max-w-[calc(100vw-3rem)] sm:max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display tracking-wider text-foreground">
              Invalid Code
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This QR code is not recognized.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>

      {/* Limit Reached Popup */}
      <AlertDialog open={limitOpen} onOpenChange={setLimitOpen}>
        <AlertDialogContent className="bg-card border-border max-w-[calc(100vw-3rem)] sm:max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display tracking-wider text-foreground">
              Limit Reached
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              You have already scanned this week! Come back next week for your next loyalty stamp.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-primary text-primary-foreground hover:bg-primary/90">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {redeemSuccessOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300 ${redeemFading ? "opacity-0" : "opacity-100"}`}>
          <div className={`max-w-[400px] w-[90%] rounded-2xl bg-card border border-primary p-8 text-center shadow-[var(--shadow-red-intense)] transition-all duration-300 ${redeemFading ? "scale-95 opacity-0" : "animate-scale-in scale-100 opacity-100"}`}>
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
