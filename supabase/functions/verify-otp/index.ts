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
    console.log(`[verify-otp] email="${email}" submitted_code="${code}"`);

    if (!email || !code) {
      return json({ success: false, error: "Email and code are required" }, 400);
    }

    const targetEmail = String(email).trim().toLowerCase();
    const submittedCode = String(code).trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Server time for comparison
    const now = new Date().toISOString();
    console.log(`[verify-otp] server_time=${now}`);

    // Fetch latest UNUSED, non-expired code for this email
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
      console.error("[verify-otp] DB error:", fetchError.message);
      return json({ success: false, error: "Database error" }, 500);
    }

    if (!otpRecord) {
      console.log("[verify-otp] No valid OTP record found");
      return json({ success: false, error: "No valid code found. Please request a new one." }, 400);
    }

    console.log(`[verify-otp] db_code="${otpRecord.code}" submitted="${submittedCode}" expires="${otpRecord.expires_at}"`);

    // Compare
    if (otpRecord.code !== submittedCode) {
      console.log("[verify-otp] MISMATCH");
      await supabase
        .from("otp_codes")
        .update({ attempts: (otpRecord.attempts || 0) + 1 })
        .eq("id", otpRecord.id);
      return json({ success: false, error: "Invalid code. Please try again." }, 400);
    }

    console.log("[verify-otp] MATCH — processing login");

    // Find or create user
    const { data: userData } = await supabase.auth.admin.getUserByEmail(targetEmail);
    const existingUser = userData?.user ?? null;
    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log(`[verify-otp] Existing user: ${userId}`);

      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", userId)
        .maybeSingle();

      if (!profile) {
        await supabase.from("profiles").upsert(
          { id: userId, name: otpRecord.name || "", email: targetEmail },
          { onConflict: "id" }
        );
      }
    } else {
      console.log("[verify-otp] Creating new user");
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: targetEmail,
        password: crypto.randomUUID(),
        email_confirm: true,
        user_metadata: { name: otpRecord.name },
      });

      if (createError) {
        console.error("[verify-otp] Create user failed:", createError.message);
        return json({ success: false, error: "Failed to create account" }, 500);
      }

      userId = newUser.user.id;

      // Profile + newsletter in parallel
      await Promise.all([
        supabase.from("profiles").upsert(
          { id: userId, name: otpRecord.name || "", email: targetEmail },
          { onConflict: "id" }
        ),
        (async () => {
          try {
            const token = Deno.env.get("SENDER_API_TOKEN");
            const group = Deno.env.get("SENDER_GROUP_ID");
            if (token && group) {
              await fetch("https://api.sender.net/v2/subscribers", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({ email: targetEmail, groups: [group] }),
              });
            }
          } catch (e) {
            console.error("[verify-otp] Newsletter error:", e);
          }
        })(),
      ]);
    }

    // Magic link + profile in parallel
    const [signInResult, profileResult] = await Promise.all([
      supabase.auth.admin.generateLink({ type: "magiclink", email: targetEmail }),
      supabase.from("profiles").select("name, member_number, created_at").eq("id", userId).single(),
    ]);

    const profile = profileResult.data;
    const resolvedName =
      profile?.name && profile.name.trim() !== "" ? profile.name : otpRecord.name || "";

    // Mark OTP as used ONLY after everything succeeded
    await supabase.from("otp_codes").update({ verified: true }).eq("id", otpRecord.id);
    console.log(`[verify-otp] OTP marked used for ${targetEmail}`);

    const result = {
      success: true,
      userId,
      email: targetEmail,
      name: resolvedName,
      member_number: profile?.member_number || "",
      created_at: profile?.created_at || "",
      hashed_token: signInResult.data?.properties?.hashed_token || "",
      verification_url: signInResult.data?.properties?.action_link || "",
    };

    console.log("[verify-otp] Success:", JSON.stringify({ ...result, hashed_token: "[redacted]" }));
    return json(result);
  } catch (error: any) {
    console.error("[verify-otp] Unhandled:", error.message);
    return json({ success: false, error: error.message || "Verification failed" }, 500);
  }
});
