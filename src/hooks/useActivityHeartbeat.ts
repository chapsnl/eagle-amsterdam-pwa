import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_INTERVAL = 60_000; // 1 minute

export const useActivityHeartbeat = () => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const sendHeartbeat = async () => {
      // Skip when the tab/PWA is not visible — saves ~85% of background traffic
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

      const stored = localStorage.getItem("vip_session");
      if (!stored) return;
      try {
        const { userId } = JSON.parse(stored);
        if (!userId) return;
        // Fire-and-forget: swallow ALL errors (including transient 503s from edge runtime)
        // so a heartbeat hiccup never bubbles to the ErrorBoundary / blank screen.
        supabase.functions
          .invoke("update-activity", { body: { userId } })
          .catch(() => {});
      } catch {}
    };

    // Send immediately on mount (only if visible)
    sendHeartbeat();

    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Fire one beat when the user returns to the tab so "online" status is fresh
    const onVisibility = () => {
      if (document.visibilityState === "visible") sendHeartbeat();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
};
