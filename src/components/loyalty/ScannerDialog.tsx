import { lazy, memo, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, X, Camera } from "lucide-react";

const QRScanner = lazy(() => import("@/components/loyalty/QRScanner"));

interface ScannerDialogProps {
  open: boolean;
  scannerKey: number;
  cameraBlocked: boolean;
  onClose: () => void;
  onScanResult: (text: string) => void;
  onPermissionDenied: () => void;
}

const ScannerDialog = memo(({ open, scannerKey, cameraBlocked, onClose, onScanResult, onPermissionDenied }: ScannerDialogProps) => (
  <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent className="max-w-[400px] w-[90%] rounded-2xl bg-card border-border">
      <DialogHeader>
        <DialogTitle className="text-foreground flex items-center gap-2 tracking-[-0.05em]">
          <QrCode className="w-5 h-5 text-primary" />
          Scan QR Code
        </DialogTitle>
        <DialogDescription className="text-muted-foreground tracking-[-0.02em]">
          Point your camera at the Eagle QR code to collect a token.
        </DialogDescription>
      </DialogHeader>

      {cameraBlocked ? (
        <div className="rounded-xl bg-secondary p-5 text-center space-y-3">
          <Camera className="w-10 h-10 text-primary mx-auto" />
          <p className="text-foreground text-base font-bold tracking-[-0.02em]">Camera access blocked</p>
          <p className="text-muted-foreground text-sm tracking-[-0.02em] leading-relaxed">
            You previously denied camera access. To fix this:<br />
            <strong>iOS Safari:</strong> Settings → Safari → Camera → Allow<br />
            <strong>Android Chrome:</strong> Tap the lock icon in the address bar → Permissions → Camera → Allow<br />
            Then reload this page.
          </p>
        </div>
      ) : (
        <Suspense fallback={<div className="w-full rounded-lg bg-background" style={{ minHeight: 280 }} />}>
          <QRScanner
            key={scannerKey}
            onScanResult={onScanResult}
            onPermissionDenied={onPermissionDenied}
          />
        </Suspense>
      )}

      <Button variant="eagle-outline" onClick={onClose} className="w-full mt-2 tracking-[-0.02em]">
        <X className="w-4 h-4 mr-2" />
        Cancel
      </Button>
    </DialogContent>
  </Dialog>
));

ScannerDialog.displayName = "ScannerDialog";

export default ScannerDialog;
