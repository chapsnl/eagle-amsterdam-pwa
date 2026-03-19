import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code } = await req.json();
    console.log(`[verify-otp] Attempt — email: ${email}, code submitted: "${code}"`);

    if (!email || !code) {
      return json({ success: false, error: "Email and code are required" }, 400);
    }

    const targetEmail = email.trim().toLowerCase();
    const submittedCode = String(code).trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Fetch the latest unused, non-expired OTP for this email ──
    const now = new Date().toISOString();
    console.log(`[verify-otp] Server time (ISO): ${now}`);

    const { data: otpRecord, error: fetchError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", targetEmail)
      .eq("verified", false)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("[verify-otp] DB fetch error:", fetchError.message);
      return json({ success: false, error: "Database error" }, 500);
    }

    if (!otpRecord) {
      console.log(`[verify-otp] No valid OTP found for ${targetEmail}`);
      return json({ success: false, error: "No valid code found. Please request a new one." }, 400);
    }

    console.log(`[verify-otp] DB code: "${otpRecord.code}", submitted: "${submittedCode}", expires: ${otpRecord.expires_at}`);

    // ── Compare codes ──
    if (otpRecord.code !== submittedCode) {
      console.log("[verify-otp] Code mismatch!");
      // Increment attempts
      await supabase
        .from("otp_codes")
        .update({ attempts: (otpRecord.attempts || 0) + 1 })
        .eq("id", otpRecord.id);
      return json({ success: false, error: "Invalid code. Please try again." }, 400);
    }

    console.log("[verify-otp] Code matches! Processing login...");

    // ── Find or create user ──
    const { data: userData } = await supabase.auth.admin.getUserByEmail(targetEmail);
    const existingUser = userData?.user ?? null;

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log(`[verify-otp] Existing user: ${userId}`);

      // Ensure profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", userId)
        .maybeSingle();

      if (!existingProfile) {
        await supabase.from("profiles").upsert(
          { id: userId, name: otpRecord.name || "", email: targetEmail },
          { onConflict: "id" }
        );
      }
    } else {
      console.log("[verify-otp] Creating new user...");
      const tempPassword = crypto.randomUUID();
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: targetEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: otpRecord.name },
      });

      if (createError) {
        console.error("[verify-otp] User creation failed:", createError.message);
        return json({ success: false, error: "Failed to create account" }, 500);
      }

      userId = newUser.user.id;
      console.log(`[verify-otp] New user created: ${userId}`);

      // Profile + newsletter in parallel
      const profilePromise = supabase.from("profiles").upsert(
        { id: userId, name: otpRecord.name || "", email: targetEmail },
        { onConflict: "id" }
      );

      const newsletterPromise = (async () => {
        try {
          const SENDER_API_TOKEN = Deno.env.get("SENDER_API_TOKEN");
          const SENDER_GROUP_ID = Deno.env.get("SENDER_GROUP_ID");
          if (SENDER_API_TOKEN && SENDER_GROUP_ID) {
            await fetch("https://api.sender.net/v2/subscribers", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${SENDER_API_TOKEN}`,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({ email: targetEmail, groups: [SENDER_GROUP_ID] }),
            });
          }
        } catch (e) {
          console.error("[verify-otp] Newsletter subscription failed:", e);
        }
      })();

      await Promise.all([profilePromise, newsletterPromise]);
    }

    // ── Generate magic link + fetch profile in parallel ──
    const [signInResult, profileResult] = await Promise.all([
      supabase.auth.admin.generateLink({ type: "magiclink", email: targetEmail }),
      supabase.from("profiles").select("name, member_number, created_at").eq("id", userId).single(),
    ]);

    const profile = profileResult.data;
    const resolvedName =
      profile?.name && profile.name.trim() !== "" ? profile.name : otpRecord.name || "";

    // ── Mark code as used ONLY after everything succeeded ──
    await supabase.from("otp_codes").update({ verified: true }).eq("id", otpRecord.id);
    console.log(`[verify-otp] OTP marked as used for ${targetEmail}`);

    const response = {
      success: true,
      userId,
      email: targetEmail,
      name: resolvedName,
      member_number: profile?.member_number || "",
      created_at: profile?.created_at || "",
      hashed_token: signInResult.data?.properties?.hashed_token || "",
      verification_url: signInResult.data?.properties?.action_link || "",
    };

    console.log("[verify-otp] Success response:", JSON.stringify({ ...response, hashed_token: "[redacted]" }));
    return json(response);
  } catch (error: any) {
    console.error("[verify-otp] Unhandled error:", error.message);
    return json({ success: false, error: error.message || "Verification failed" }, 500);
  }
});
