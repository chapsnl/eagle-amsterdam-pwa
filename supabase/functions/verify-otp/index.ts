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
    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ success: false, error: "Email and code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetEmail = email.toLowerCase();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate OTP
    const { data: otpRecord, error: fetchError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", targetEmail)
      .eq("code", code)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as verified (fire-and-forget)
    supabase.from("otp_codes").update({ verified: true }).eq("id", otpRecord.id).then(() => {});

    // Use getUserByEmail instead of listUsers — much faster
    const { data: userData } = await supabase.auth.admin.getUserByEmail(targetEmail);
    const existingUser = userData?.user ?? null;

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      // Ensure profile exists — run in parallel with generate link
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", userId)
        .maybeSingle();

      if (!existingProfile) {
        await supabase.from("profiles").upsert({
          id: userId,
          name: otpRecord.name || "",
          email: targetEmail,
        }, { onConflict: "id" });
      } else if ((!existingProfile.name || existingProfile.name.trim() === "") && otpRecord.name) {
        supabase.from("profiles").update({ name: otpRecord.name }).eq("id", userId).then(() => {});
      }
    } else {
      const tempPassword = crypto.randomUUID();
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: targetEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: otpRecord.name },
      });

      if (createError) {
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;

      // Profile upsert + newsletter subscription in parallel
      const profilePromise = supabase.from("profiles").upsert({
        id: userId,
        name: otpRecord.name,
        email: targetEmail,
      }, { onConflict: "id" });

      const newsletterPromise = (async () => {
        try {
          const SENDER_API_TOKEN = Deno.env.get("SENDER_API_TOKEN");
          const SENDER_GROUP_ID = Deno.env.get("SENDER_GROUP_ID");
          if (SENDER_API_TOKEN && SENDER_GROUP_ID) {
            await fetch("https://api.sender.net/v2/subscribers", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${SENDER_API_TOKEN}`,
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
              body: JSON.stringify({
                email: targetEmail,
                groups: [SENDER_GROUP_ID],
              }),
            });
          }
        } catch (e) {
          console.error("Sender.net subscription failed (non-blocking):", e);
        }
      })();

      await Promise.all([profilePromise, newsletterPromise]);
    }

    // Generate magic link + fetch profile + cleanup OTP in parallel
    const [signInResult, profileResult] = await Promise.all([
      supabase.auth.admin.generateLink({
        type: "magiclink",
        email: targetEmail,
      }),
      supabase
        .from("profiles")
        .select("name, member_number, created_at")
        .eq("id", userId)
        .single(),
    ]);

    // Fire-and-forget OTP cleanup
    supabase.from("otp_codes").delete().eq("email", targetEmail).then(() => {});

    const profile = profileResult.data;
    const resolvedName = (profile?.name && profile.name.trim() !== "") ? profile.name : otpRecord.name;

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        email: targetEmail,
        name: resolvedName,
        member_number: profile?.member_number || "",
        created_at: profile?.created_at || "",
        hashed_token: signInResult.data?.properties?.hashed_token || "",
        verification_url: signInResult.data?.properties?.action_link || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Verification failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
