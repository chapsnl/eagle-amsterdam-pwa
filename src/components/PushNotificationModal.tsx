import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const DISMISSED_KEY = "eagle-push-modal-dismissed";

export default function PushNotificationModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or already subscribed
    if (localStorage.getItem(DISMISSED_KEY) === "true") return;

    const timer = setTimeout(async () => {
      // Check if OneSignal is loaded and user is already subscribed
      try {
        const perm = await (window as any).OneSignal?.Notifications?.permission;
        if (perm) return; // already subscribed
      } catch {
        // OneSignal not ready yet, show modal anyway
      }
      setOpen(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleAccept = async () => {
    setOpen(false);
    localStorage.setItem(DISMISSED_KEY, "true");
    try {
      await (window as any).OneSignal?.Slidedown?.promptPush();
    } catch {
      // fallback: ignore if OneSignal isn't available
    }
  };

  const handleDismiss = () => {
    setOpen(false);
    localStorage.setItem(DISMISSED_KEY, "true");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent className="bg-card border-primary/30 max-w-sm mx-auto neon-border">
        <DialogHeader className="items-center text-center gap-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/30">
            <Bell className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="font-display text-2xl tracking-wide text-foreground">
            Stay up to date!
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
            Yes I am 18+ and want to receive notifications about events, line-ups and offers at Eagle Amsterdam.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          <Button variant="eagle" className="w-full" onClick={handleAccept}>
            Subscribe
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleDismiss}>
            No, thanks
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
