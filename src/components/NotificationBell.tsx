import { useState, useCallback } from "react";
import { Bell, BellRing } from "lucide-react";
import { toast } from "@/components/ui/sonner";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}

const NotificationBell = () => {
  const [requesting, setRequesting] = useState(false);

  const handleClick = useCallback(() => {
    if (requesting) return;
    setRequesting(true);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        const permission = await OneSignal.Notifications.permission;
        if (permission) {
          toast("You're already subscribed to notifications! 🔔");
          setRequesting(false);
          return;
        }

        await OneSignal.Slidedown.promptPush();

        // Check after prompt
        const granted = await OneSignal.Notifications.permission;
        if (granted) {
          toast.success("Thanks! You'll now receive updates from Eagle Amsterdam. 🦅");
        }
      } catch {
        // User dismissed or error
      } finally {
        setRequesting(false);
      }
    });
  }, [requesting]);

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
      aria-label="Enable notifications"
    >
      {requesting ? (
        <BellRing className="w-5 h-5 animate-pulse" />
      ) : (
        <Bell className="w-5 h-5" />
      )}
    </button>
  );
};

export default NotificationBell;
