import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  sender_nickname: string;
  recipient_nickname: string;
  content: string;
  created_at: string;
  read_at: string | null;
  sender_deleted: boolean;
  recipient_deleted: boolean;
}

const TWENTY_FOUR_HOURS = 24 * 60 * 60_000;

function getSessionUserId(): string | null {
  try {
    const raw = localStorage.getItem("vip_session");
    if (!raw) return null;
    return JSON.parse(raw)?.userId ?? null;
  } catch {
    return null;
  }
}

async function fetchMessages(userId: string) {
  const { data, error } = await supabase.functions.invoke("direct-messages", {
    body: { action: "list", userId },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to load messages");
  return {
    messages: (data.messages || []) as DirectMessage[],
    unread: (data.unread || 0) as number,
  };
}

/**
 * 24h cache for low data usage. Realtime websocket pushes new/deleted messages
 * instantly (no extra HTTP). Manual refresh via `refresh()`.
 */
export function useDirectMessages() {
  const userId = getSessionUserId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["direct-messages", userId],
    queryFn: () => fetchMessages(userId!),
    enabled: !!userId,
    staleTime: TWENTY_FOUR_HOURS,
    gcTime: TWENTY_FOUR_HOURS,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const refresh = useCallback(async () => {
    if (!userId) return;
    await queryClient.invalidateQueries({ queryKey: ["direct-messages", userId] });
  }, [queryClient, userId]);

  // Realtime: invalidate cache whenever a message touching this user changes.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`dm-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ["direct-messages", userId] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages", filter: `sender_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ["direct-messages", userId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return { ...query, refresh };
}
