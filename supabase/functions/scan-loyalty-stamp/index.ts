import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOTAL_STAMPS = 9;
const COOLDOWN_MS = 160 * 60 * 60 * 1000; // 160 hours

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

    // Validate QR code server-side
    const validCode = Deno.env.get("LOYALTY_QR_CODE") || "EAGLE2026";
    if (code.trim().toUpperCase() !== validCode.toUpperCase()) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_code" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current loyalty_stamps row
    const { data: loyalty } = await supabase
      .from("loyalty_stamps")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // Check cooldown
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

    // Check if card is already full
    const currentStamps = loyalty?.stamps ?? 0;
    if (currentStamps >= TOTAL_STAMPS) {
      return new Response(
        JSON.stringify({ success: false, error: "card_full" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newStamps = Math.min(currentStamps + 1, TOTAL_STAMPS);
    const now = new Date().toISOString();

    // Upsert loyalty_stamps
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

    return new Response(
      JSON.stringify({
        success: true,
        stamps: newStamps,
        totalStampsEarned: newTotal,
        vipStatus: newStatus,
        levelUp: newStatus !== oldStatus ? newStatus : null,
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
