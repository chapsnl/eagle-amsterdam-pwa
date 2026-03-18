import { useState, useCallback } from "react";
import { ScanLine, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import QRScanner from "@/components/loyalty/QRScanner";

interface MemberScannerSectionProps {
  onMemberFound: (memberNumber: string) => void;
}

const MemberScannerSection = ({ onMemberFound }: MemberScannerSectionProps) => {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [cameraBlocked, setCameraBlocked] = useState(false);

  const handleScanResult = useCallback(
    (decodedText: string) => {
      setScanning(false);
      onMemberFound(decodedText.trim());
    },
    [onMemberFound]
  );

  const handlePermissionDenied = useCallback(() => {
    setCameraBlocked(true);
    setScanning(false);
  }, []);

  const startScan = () => {
    setCameraBlocked(false);
    setScannerKey((k) => k + 1);
    setScanning(true);
  };

  const stopScan = () => {
    setScanning(false);
  };

  return (
    <section className="space-y-0">
      <button
        onClick={() => {
          if (open && scanning) stopScan();
          setOpen(!open);
        }}
        className="w-full flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3"
      >
        <h2 className="text-foreground font-bold text-lg flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-primary" />
          Scan Member Pass
        </h2>
        {open ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="bg-card rounded-b-xl px-4 pb-4 pt-2 space-y-4 border border-t-0 border-border -mt-2 rounded-t-none">
          {!scanning ? (
            <div className="space-y-3 text-center">
              <p className="text-muted-foreground text-xs">
                Scan a member's QR code from their Member Pass to quickly find their account and assign vouchers.
              </p>
              {cameraBlocked ? (
                <div className="rounded-xl bg-secondary p-4 text-center space-y-2">
                  <p className="text-foreground text-sm font-bold">Camera access blocked</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Allow camera access in your browser settings and reload.
                  </p>
                </div>
              ) : (
                <Button
                  onClick={startScan}
                  className="w-full bg-primary text-primary-foreground font-bold text-sm py-3"
                >
                  <ScanLine className="w-4 h-4 mr-2" />
                  Scan Now
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <QRScanner
                key={scannerKey}
                onScanResult={handleScanResult}
                onPermissionDenied={handlePermissionDenied}
              />
              <Button
                variant="outline"
                onClick={stopScan}
                className="w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default MemberScannerSection;
