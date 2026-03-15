import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ success: false, error: "Email and code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find valid OTP
    const { data: otpRecord, error: fetchError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("code", code)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      console.log("[VERIFY] Invalid or expired code for:", email);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as verified
    await supabase.from("otp_codes").update({ verified: true }).eq("id", otpRecord.id);

    // Sign up or sign in via Supabase Auth (using admin API to auto-confirm)
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;
    let token: string;

    if (existingUser) {
      // Existing user - generate magic link token
      userId = existingUser.id;

      // Update name in profile if needed
      await supabase
        .from("profiles")
        .update({ name: otpRecord.name })
        .eq("id", userId);

      // Generate session via admin
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: email.toLowerCase(),
      });

      if (sessionError) {
        console.error("[VERIFY] Session generation error:", sessionError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      token = sessionData.properties?.hashed_token || "";
    } else {
      // New user - create account
      const tempPassword = crypto.randomUUID();
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: otpRecord.name },
      });

      if (createError) {
        console.error("[VERIFY] User creation error:", createError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
      token = "";
    }

    // Sign in with OTP-verified email using admin
    const { data: signInData, error: signInError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email.toLowerCase(),
    });

    // Clean up used OTP codes for this email
    await supabase.from("otp_codes").delete().eq("email", email.toLowerCase());

    // Fetch member_number from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("member_number")
      .eq("id", userId)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        email: email.toLowerCase(),
        name: otpRecord.name,
        member_number: profile?.member_number || "",
        // Return the hashed_token so the client can exchange it for a session
        hashed_token: signInData?.properties?.hashed_token || "",
        verification_url: signInData?.properties?.action_link || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[VERIFY] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Verification failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
