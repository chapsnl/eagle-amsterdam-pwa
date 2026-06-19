import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminUserId, title, message, url } = await req.json();

    if (!adminUserId || !message || !String(message).trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify admin
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", adminUserId)
      .maybeSingle();

    if (!adminProfile || adminProfile.email !== "michael.roks@icloud.com") {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const onesignalKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
    const onesignalAppId = Deno.env.get("ONESIGNAL_APP_ID");

    if (!onesignalKey || !onesignalAppId) {
      return new Response(
        JSON.stringify({ success: false, error: "OneSignal not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const heading = (title && String(title).trim()) || "Eagle Amsterdam";
    const body = String(message).trim().slice(0, 500);

    const pushPayload: Record<string, unknown> = {
      app_id: onesignalAppId,
      included_segments: ["Total Subscriptions"],
      target_channel: "push",
      headings: { en: heading },
      contents: { en: body },
      web_push_topic: `broadcast-${Date.now()}`,
    };

    if (url && typeof url === "string" && url.trim()) {
      pushPayload.url = url.trim();
    }

    console.log("[admin-push-all] Sending push to all subscribed users");

    const pushRes = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${onesignalKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(pushPayload),
    });

    const pushBody = await pushRes.text();
    console.log("[admin-push-all] OneSignal response:", pushRes.status, pushBody);

    if (!pushRes.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `OneSignal error (${pushRes.status}): ${pushBody}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed: any = null;
    try { parsed = JSON.parse(pushBody); } catch { /* ignore */ }
    const recipients = parsed?.recipients ?? null;
    const notificationId = parsed?.id ?? null;

    return new Response(
      JSON.stringify({ success: true, recipients, notificationId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[admin-push-all] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
