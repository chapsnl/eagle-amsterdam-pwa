import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ONESIGNAL_APP_ID = "e5e608d0-1fad-4e9a-84ca-9812ac96a3a1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminUserId, targetUserId, voucherTitle, voucherDescription } = await req.json();

    if (!adminUserId || !targetUserId || !voucherTitle) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Insert voucher
    const { error: insertError } = await supabase.from("member_vouchers").insert({
      user_id: targetUserId,
      title: voucherTitle,
      description: voucherDescription || null,
    });

    if (insertError) {
      console.error("[admin-dispatch-voucher] Insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send push notification via OneSignal
    try {
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", targetUserId)
        .maybeSingle();

      if (targetProfile?.email) {
        const onesignalKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
        if (onesignalKey) {
          await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${onesignalKey}`,
            },
            body: JSON.stringify({
              app_id: ONESIGNAL_APP_ID,
              include_aliases: { external_id: [targetProfile.email] },
              target_channel: "push",
              headings: { en: "New Voucher! 🎁" },
              contents: { en: `You received a new voucher: ${voucherTitle}!` },
            }),
          });
        }
      }
    } catch (pushErr) {
      console.error("[admin-dispatch-voucher] Push notification error:", pushErr);
      // Don't fail the whole request if push fails
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[admin-dispatch-voucher] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
