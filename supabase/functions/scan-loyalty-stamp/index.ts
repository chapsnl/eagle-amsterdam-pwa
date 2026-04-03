import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOTAL_STAMPS = 6;
const COOLDOWN_MS = 160 * 60 * 60 * 1000; // 160 hours

function getCallerUserId(req: Request): string | null {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, code } = await req.json();

    if (!userId || !code) {
      return new Response(
        JSON.stringify({ success: false, error: "userId and code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerUserId = getCallerUserId(req);
    if (!callerUserId || callerUserId !== userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: activeCode, error: codeReadError } = await supabase
      .from("active_loyalty_code")
      .select("code")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeReadError) {
      console.error("[scan-loyalty-stamp] DB read error:", codeReadError.message);
      return new Response(
        JSON.stringify({ success: false, error: "server_error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!activeCode?.code) {
      return new Response(
        JSON.stringify({ success: false, error: "no_active_code" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validCode = activeCode.code;

    if (code.trim().toUpperCase() !== validCode.toUpperCase()) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_code" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: loyalty } = await supabase
      .from("loyalty_stamps")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (loyalty?.last_scan_at) {
      const elapsed = Date.now() - new Date(loyalty.last_scan_at).getTime();
      if (elapsed < COOLDOWN_MS) {
        const hoursLeft = Math.ceil((COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
        return new Response(
          JSON.stringify({ success: false, error: "cooldown", hoursLeft }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const currentStamps = loyalty?.stamps ?? 0;
    if (currentStamps >= TOTAL_STAMPS) {
      return new Response(
        JSON.stringify({ success: false, error: "card_full" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newStamps = Math.min(currentStamps + 1, TOTAL_STAMPS);
    const now = new Date().toISOString();

    if (loyalty) {
      await supabase
        .from("loyalty_stamps")
        .update({ stamps: newStamps, last_scan_at: now, redeemed: false })
        .eq("user_id", userId);
    } else {
      await supabase
        .from("loyalty_stamps")
        .insert({ user_id: userId, stamps: newStamps, last_scan_at: now, redeemed: false });
    }

    // Update total_stamps_earned and recalculate vip_status
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_stamps_earned, vip_status")
      .eq("id", userId)
      .maybeSingle();

    const oldTotal = profile?.total_stamps_earned ?? 0;
    const newTotal = oldTotal + 1;
    const oldStatus = profile?.vip_status || "Regular";
    const newStatus = calculateVipStatus(newTotal);

    const updates: Record<string, unknown> = { total_stamps_earned: newTotal };
    if (newStatus !== oldStatus) {
      updates.vip_status = newStatus;
    }

    await supabase.from("profiles").update(updates).eq("id", userId);

    // Auto-grant FREE ENTRY voucher when card is full (6 stamps)
    let voucherGranted = false;
    if (newStamps >= TOTAL_STAMPS) {
      // Check if user already has an unredeemed FREE ENTRY voucher
      const { data: existingVoucher } = await supabase
        .from("member_vouchers")
        .select("id")
        .eq("user_id", userId)
        .eq("title", "FREE ENTRY SUNDAY SEX PARTY")
        .eq("redeemed", false)
        .limit(1);

      if (!existingVoucher || existingVoucher.length === 0) {
        await supabase.from("member_vouchers").insert({
          user_id: userId,
          title: "FREE ENTRY SUNDAY SEX PARTY",
          description: "Free entry to a Sunday Sex Party — NcAdam, Horsemen and Knights, or Cum Hunks. Enjoy!",
        });
        voucherGranted = true;

        // Reset the stamp card to 0
        await supabase
          .from("loyalty_stamps")
          .update({ stamps: 0, redeemed: false })
          .eq("user_id", userId);
      }

      // Send push notification about the voucher
      if (voucherGranted) {
        try {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", userId)
            .maybeSingle();

          if (userProfile?.email) {
            const onesignalKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
            if (onesignalKey) {
              await fetch("https://api.onesignal.com/notifications", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Key ${onesignalKey}`,
                },
                body: JSON.stringify({
                  app_id: "e5e608d0-1fad-4e9a-84ca-9812ac96a3a1",
                  include_aliases: { external_id: [userProfile.email] },
                  target_channel: "push",
                  headings: { en: "🎉 Free Entry Unlocked!" },
                  contents: { en: "You've earned free entry to a Sunday Sex Party! Check your Member Deals." },
                }),
              });
            }
          }
        } catch (e) {
          console.error("[scan-loyalty-stamp] Push notification error:", e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        stamps: voucherGranted ? 0 : newStamps,
        totalStampsEarned: newTotal,
        vipStatus: newStatus,
        levelUp: newStatus !== oldStatus ? newStatus : null,
        voucherGranted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[scan-loyalty-stamp] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Scan failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function calculateVipStatus(totalStamps: number): string {
  if (totalStamps >= 50) return "Slut";
  if (totalStamps >= 25) return "Cruiser";
  if (totalStamps >= 10) return "Party Boy";
  return "Regular";
}
