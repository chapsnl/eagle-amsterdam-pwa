import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_INTERVAL = 60_000; // 1 minute

export const useActivityHeartbeat = () => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const sendHeartbeat = async () => {
      const stored = localStorage.getItem("vip_session");
      if (!stored) return;
      try {
        const { userId } = JSON.parse(stored);
        if (!userId) return;
        await supabase.functions.invoke("update-activity", {
          body: { userId },
        });
      } catch {}
    };

    // Send immediately on mount
    sendHeartbeat();

    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
};
