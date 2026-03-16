import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const normalizeQrValue = (value: string) =>
  value
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .toUpperCase();

const VALID_CODE = Deno.env.get("LOYALTY_QR_CODE") ?? "";
if (!VALID_CODE) throw new Error("Missing LOYALTY_QR_CODE secret");
const NORMALIZED_VALID_CODE = normalizeQrValue(VALID_CODE);
const COOLDOWN_MS = 160 * 60 * 60 * 1000; // 160 hours
const TOTAL_STAMPS = 9;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    const { scannedCode } = await req.json();

    // Validate QR code server-side
    if (!scannedCode || scannedCode.trim().toUpperCase() !== VALID_CODE) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get or create stamp record
    let { data: stampRecord } = await supabase
      .from("loyalty_stamps")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!stampRecord) {
      const { data: newRecord, error: insertErr } = await supabase
        .from("loyalty_stamps")
        .insert({ user_id: userId, stamps: 0 })
        .select("*")
        .single();

      if (insertErr) {
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create stamp record" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      stampRecord = newRecord;
    }

    // Check cooldown server-side
    if (stampRecord.last_scan_at) {
      const lastScan = new Date(stampRecord.last_scan_at).getTime();
      const elapsed = Date.now() - lastScan;
      if (elapsed < COOLDOWN_MS) {
        const remainingHours = Math.ceil((COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
        return new Response(
          JSON.stringify({ success: false, error: "cooldown", remainingHours }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if card is already full
    if (stampRecord.stamps >= TOTAL_STAMPS) {
      return new Response(
        JSON.stringify({ success: false, error: "card_full", stamps: stampRecord.stamps }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newStamps = Math.min(stampRecord.stamps + 1, TOTAL_STAMPS);
    const now = new Date().toISOString();

    // Update stamps and cooldown
    await supabase
      .from("loyalty_stamps")
      .update({ stamps: newStamps, last_scan_at: now })
      .eq("user_id", userId);

    // Update total_stamps_earned in profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_stamps_earned, vip_status")
      .eq("id", userId)
      .single();

    const currentTotal = profile?.total_stamps_earned ?? 0;
    const newTotal = currentTotal + 1;

    // Calculate VIP status
    let newStatus = "Regular";
    if (newTotal >= 50) newStatus = "Slut";
    else if (newTotal >= 25) newStatus = "Party Boy";
    else if (newTotal >= 10) newStatus = "Cruiser";

    const updates: Record<string, unknown> = { total_stamps_earned: newTotal };
    if (newStatus !== (profile?.vip_status || "Regular")) {
      updates.vip_status = newStatus;
    }

    await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    return new Response(
      JSON.stringify({
        success: true,
        stamps: newStamps,
        totalStampsEarned: newTotal,
        vipStatus: newStatus,
        levelUp: newStatus !== (profile?.vip_status || "Regular") ? newStatus : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[scan-loyalty-token] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
