import { useState, useCallback } from "react";
import { ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import QRScanner from "@/components/loyalty/QRScanner";

interface MemberScannerSectionProps {
  onMemberFound: (memberNumber: string) => boolean;
}

const MemberScannerSection = ({ onMemberFound }: MemberScannerSectionProps) => {
  const [open, setOpen] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleScanResult = useCallback(
    (decodedText: string) => {
      const found = onMemberFound(decodedText.trim());
      if (found) {
        setOpen(false);
        setNotFound(false);
      } else {
        setNotFound(true);
        // Reset scanner to allow another scan
        setScannerKey((k) => k + 1);
      }
    },
    [onMemberFound]
  );

  const handlePermissionDenied = useCallback(() => {
    setCameraBlocked(true);
  }, []);

  const handleOpen = () => {
    setCameraBlocked(false);
    setNotFound(false);
    setScannerKey((k) => k + 1);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setNotFound(false);
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        className="w-full bg-primary text-primary-foreground font-bold text-sm py-6 rounded-xl"
      >
        <ScanLine className="w-5 h-5 mr-2" />
        Scan Member Pass
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="bg-card border-border max-w-md mx-auto p-0 gap-0 [&>button]:hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <DialogTitle className="text-foreground font-bold text-lg flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-primary" />
              Scan Member Pass
            </DialogTitle>
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 pb-4 space-y-3">
            {cameraBlocked ? (
              <div className="rounded-xl bg-secondary p-4 text-center space-y-2">
                <p className="text-foreground text-sm font-bold">Camera access blocked</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Allow camera access in your browser settings and reload.
                </p>
              </div>
            ) : (
              <>
                <QRScanner
                  key={scannerKey}
                  onScanResult={handleScanResult}
                  onPermissionDenied={handlePermissionDenied}
                />
                {notFound && (
                  <div className="rounded-xl bg-destructive/20 border border-destructive/30 p-3 text-center animate-fade-in">
                    <p className="text-destructive text-sm font-bold">No user found</p>
                    <p className="text-muted-foreground text-xs mt-1">Try scanning another pass.</p>
                  </div>
                )}
              </>
            )}

            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MemberScannerSection;
