import { useState, useCallback, useEffect } from "react";
import { Bell, BellRing } from "lucide-react";
import { toast } from "@/components/ui/sonner";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}

const STORAGE_KEY = "eagle-push-subscribed";

const NotificationBell = () => {
  const [requesting, setRequesting] = useState(false);
  const [subscribed, setSubscribed] = useState<boolean | null>(() => {
    // Persist: if previously subscribed, stay hidden immediately
    return localStorage.getItem(STORAGE_KEY) === "true" ? true : null;
  });

  useEffect(() => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      const permission = await OneSignal.Notifications.permission;
      setSubscribed(permission);
      localStorage.setItem(STORAGE_KEY, String(permission));

      OneSignal.Notifications.addEventListener("permissionChange", (granted: boolean) => {
        setSubscribed(granted);
        localStorage.setItem(STORAGE_KEY, String(granted));
        if (granted) {
          toast.success("Thanks! You'll now receive updates from Eagle Amsterdam. 🦅");
        }
      });
    });
  }, []);

  const handleClick = useCallback(() => {
    if (requesting) return;
    setRequesting(true);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.Slidedown.promptPush();
      } catch {
        // User dismissed or error
      } finally {
        setRequesting(false);
      }
    });
  }, [requesting]);

  // Hide if already subscribed, still checking, or previously subscribed
  if (subscribed !== false) return null;

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
