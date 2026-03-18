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
    const { adminUserId } = await req.json();

    if (!adminUserId) {
      return new Response(
        JSON.stringify({ success: false, error: "adminUserId is required" }),
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

    // Get all members
    const { data: members, error } = await supabase
      .from("profiles")
      .select("id, name, email, vip_status, total_stamps_earned, member_number, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin-get-members] Query error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get active (unredeemed) voucher counts per user
    const { data: vouchers } = await supabase
      .from("member_vouchers")
      .select("user_id")
      .eq("redeemed", false);

    const voucherCounts: Record<string, number> = {};
    if (vouchers) {
      for (const v of vouchers) {
        voucherCounts[v.user_id] = (voucherCounts[v.user_id] || 0) + 1;
      }
    }

    const membersWithVouchers = (members || []).map((m: any) => ({
      ...m,
      active_vouchers: voucherCounts[m.id] || 0,
    }));

    // Get current active loyalty code
    const { data: codeData } = await supabase
      .from("active_loyalty_code")
      .select("code, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        success: true,
        members: members || [],
        activeCode: codeData?.code || null,
        codeUpdatedAt: codeData?.created_at || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[admin-get-members] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
