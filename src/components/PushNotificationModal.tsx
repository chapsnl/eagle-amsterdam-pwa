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

const ACCEPTED_KEY = "eagle-push-accepted";
const DISMISSED_AT_KEY = "eagle-push-dismissed-at";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function PushNotificationModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Never show again if accepted
    if (localStorage.getItem(ACCEPTED_KEY) === "true") return;

    // Check 7-day cooldown after dismiss
    const dismissedAt = localStorage.getItem(DISMISSED_AT_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < SEVEN_DAYS_MS) return;
    }

    const timer = setTimeout(async () => {
      // Check if already subscribed via OneSignal
      try {
        const perm = await (window as any).OneSignal?.Notifications?.permission;
        if (perm) {
          localStorage.setItem(ACCEPTED_KEY, "true");
          return;
        }
      } catch {
        // OneSignal not ready
      }
      setOpen(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleAccept = async () => {
    setOpen(false);
    localStorage.setItem(ACCEPTED_KEY, "true");
    localStorage.removeItem(DISMISSED_AT_KEY);
    try {
      // Use native permission request since we disabled OneSignal slidedown
      const OneSignal = (window as any).OneSignal;
      if (OneSignal?.Notifications) {
        await OneSignal.Notifications.requestPermission();
      }
    } catch {
      // fallback: ignore if OneSignal isn't available
    }
  };

  const handleDismiss = () => {
    setOpen(false);
    localStorage.setItem(DISMISSED_AT_KEY, Date.now().toString());
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent className="bg-card border-primary/30 w-[90%] max-w-[400px] mx-auto rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] neon-border overflow-hidden">
        <DialogHeader className="items-center text-center gap-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/30">
            <Bell className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="font-display text-2xl tracking-wide text-foreground">
            18+ to Enter and Subscribe
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
            Yes I am 18+ and want to receive notifications about events, line-ups and special offers at Eagle Amsterdam.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          <Button variant="eagle" className="w-full" onClick={handleAccept}>
            ENTER
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleDismiss}>
            No, thanks
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
