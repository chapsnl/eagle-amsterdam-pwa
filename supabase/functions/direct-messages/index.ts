import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ONESIGNAL_APP_ID = "e5e608d0-1fad-4e9a-84ca-9812ac96a3a1";

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
      .select("id, name, email")
      .eq("id", userId)
      .maybeSingle();
    if (!me) return json({ error: "User not found" }, 404);

    const isAdmin = me.email === "michael.roks@icloud.com";

    if (action === "broadcast") {
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      const { content } = body;
      if (!content?.trim()) return json({ error: "Missing content" }, 400);
      const text = String(content).slice(0, 1000);
      const { data: users, error: usersErr } = await admin
        .from("profiles")
        .select("id, name")
        .neq("id", userId);
      if (usersErr) return json({ error: usersErr.message }, 500);
      const rows = (users || []).map((u) => ({
        sender_id: userId,
        recipient_id: u.id,
        sender_nickname: (me.name || "EAGLE").slice(0, 30),
        recipient_nickname: (u.name || "Member").slice(0, 30),
        content: text,
      }));
      if (rows.length === 0) return json({ success: true, count: 0 });
      const { error: insErr } = await admin.from("direct_messages").insert(rows);
      if (insErr) return json({ error: insErr.message }, 500);
      return json({ success: true, count: rows.length });
    }

    if (action === "broadcast_push") {
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      const { content } = body;
      if (!content?.trim()) return json({ error: "Missing content" }, 400);
      // Keep it short — this is a push notification, not an inbox message.
      const text = String(content).trim().slice(0, 200);

      const onesignalKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
      if (!onesignalKey) return json({ error: "Push service not configured" }, 500);

      const pushPayload = {
        app_id: ONESIGNAL_APP_ID,
        included_segments: ["Subscribed Users"],
        target_channel: "push",
        headings: { en: "EAGLE" },
        contents: { en: text },
        web_push_topic: `broadcast-${Date.now()}`,
      };

      const pushRes = await fetch("https://api.onesignal.com/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${onesignalKey}`,
          Accept: "application/json",
        },
        body: JSON.stringify(pushPayload),
      });

      const pushText = await pushRes.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(pushText);
      } catch {
        // non-JSON response
      }

      if (!pushRes.ok || parsed?.id == null) {
        const detail =
          parsed?.errors?.[0] || parsed?.errors || pushText || "Push failed";
        return json({ error: String(detail) }, 502);
      }

      return json({ success: true, push: true, recipients: parsed?.recipients ?? 0 });
    }

    if (action === "admin_recall") {
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      const { messageId, recallAll } = body;
      if (recallAll && messageId) {
        // Recall every message with the same sender_id + content + close timestamp (a broadcast batch)
        const { data: src } = await admin
          .from("direct_messages")
          .select("sender_id, content, created_at")
          .eq("id", messageId)
          .maybeSingle();
        if (!src) return json({ error: "Not found" }, 404);
        const t = new Date(src.created_at).getTime();
        const from = new Date(t - 60_000).toISOString();
        const to = new Date(t + 60_000).toISOString();
        const { error } = await admin
          .from("direct_messages")
          .delete()
          .eq("sender_id", src.sender_id)
          .eq("content", src.content)
          .gte("created_at", from)
          .lte("created_at", to);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }
      if (!messageId) return json({ error: "messageId required" }, 400);
      const { error } = await admin.from("direct_messages").delete().eq("id", messageId);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "admin_hide") {
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      const { messageId, hideAll } = body;
      if (!messageId) return json({ error: "messageId required" }, 400);
      if (hideAll) {
        const { data: src } = await admin
          .from("direct_messages")
          .select("sender_id, content, created_at")
          .eq("id", messageId)
          .maybeSingle();
        if (!src) return json({ error: "Not found" }, 404);
        const t = new Date(src.created_at).getTime();
        const from = new Date(t - 60_000).toISOString();
        const to = new Date(t + 60_000).toISOString();
        const { error } = await admin
          .from("direct_messages")
          .update({ sender_deleted: true })
          .eq("sender_id", src.sender_id)
          .eq("content", src.content)
          .gte("created_at", from)
          .lte("created_at", to);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }
      const { error } = await admin
        .from("direct_messages")
        .update({ sender_deleted: true })
        .eq("id", messageId);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

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
