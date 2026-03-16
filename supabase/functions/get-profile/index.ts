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
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // First try to get existing profile
    let { data: profile, error } = await supabase
      .from("profiles")
      .select("member_number, profile_image_url, created_at, name, email, total_stamps_earned, vip_status")
      .eq("id", userId)
      .maybeSingle();

    // If no profile found, check if user exists in auth and create profile
    if (!profile) {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      
      if (!authUser?.user) {
        return new Response(
          JSON.stringify({ success: false, error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create the missing profile
      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          name: authUser.user.user_metadata?.name || "",
          email: authUser.user.email || "",
        })
        .select("member_number, profile_image_url, created_at, name, email, total_stamps_earned, vip_status")
        .single();

      if (insertError) {
        console.error("[get-profile] Insert error:", insertError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      profile = newProfile;
    }

    return new Response(
      JSON.stringify({ success: true, profile }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[get-profile] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to fetch profile" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
