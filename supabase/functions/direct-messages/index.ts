import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, userId } = body;
    if (!userId) return json({ error: "userId required" }, 400);

    const { data: me } = await admin
      .from("profiles")
      .select("id, name")
      .eq("id", userId)
      .maybeSingle();
    if (!me) return json({ error: "User not found" }, 404);

    if (action === "list") {
      const { data, error } = await admin
        .from("direct_messages")
        .select("*")
        .or(
          `and(recipient_id.eq.${userId},recipient_deleted.eq.false),and(sender_id.eq.${userId},sender_deleted.eq.false)`
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return json({ error: error.message }, 500);
      const unread = (data || []).filter(
        (m) => m.recipient_id === userId && !m.read_at
      ).length;
      return json({ success: true, messages: data || [], unread });
    }

    if (action === "unread_count") {
      const { count } = await admin
        .from("direct_messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .eq("recipient_deleted", false)
        .is("read_at", null);
      return json({ success: true, unread: count || 0 });
    }

    if (action === "send") {
      const { recipientId, content, recipientNickname } = body;
      if (!recipientId || !content?.trim()) return json({ error: "Missing fields" }, 400);
      if (recipientId === userId) return json({ error: "Cannot message yourself" }, 400);
      const text = String(content).slice(0, 1000);

      const { data: recipient } = await admin
        .from("profiles")
        .select("id, name")
        .eq("id", recipientId)
        .maybeSingle();
      if (!recipient) return json({ error: "Recipient not found" }, 404);

      const { data: msg, error } = await admin
        .from("direct_messages")
        .insert({
          sender_id: userId,
          recipient_id: recipientId,
          sender_nickname: (me.name || "Member").slice(0, 30),
          recipient_nickname: (recipientNickname || recipient.name || "Member").slice(0, 30),
          content: text,
        })
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, message: msg });
    }

    if (action === "mark_read") {
      const { messageId } = body;
      if (!messageId) return json({ error: "messageId required" }, 400);
      const { error } = await admin
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("id", messageId)
        .eq("recipient_id", userId)
        .is("read_at", null);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "mark_all_read") {
      await admin
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", userId)
        .is("read_at", null);
      return json({ success: true });
    }

    if (action === "delete") {
      const { messageId } = body;
      if (!messageId) return json({ error: "messageId required" }, 400);
      const { data: msg } = await admin
        .from("direct_messages")
        .select("*")
        .eq("id", messageId)
        .maybeSingle();
      if (!msg) return json({ error: "Not found" }, 404);

      const patch: Record<string, boolean> = {};
      if (msg.sender_id === userId) patch.sender_deleted = true;
      if (msg.recipient_id === userId) patch.recipient_deleted = true;
      if (Object.keys(patch).length === 0) return json({ error: "Forbidden" }, 403);

      await admin.from("direct_messages").update(patch).eq("id", messageId);

      // Hard-delete if both sides deleted
      const fully =
        (patch.sender_deleted || msg.sender_deleted) &&
        (patch.recipient_deleted || msg.recipient_deleted);
      if (fully) {
        await admin.from("direct_messages").delete().eq("id", messageId);
      }
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: "Internal error" }, 500);
  }
});
