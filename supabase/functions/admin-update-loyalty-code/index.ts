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
    const { adminUserId, newCode } = await req.json();

    if (!adminUserId || !newCode) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedCode = newCode.trim().toUpperCase();
    if (trimmedCode.length < 3 || trimmedCode.length > 50) {
      return new Response(
        JSON.stringify({ success: false, error: "Code must be 3-50 characters" }),
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

    // Delete all old codes
    await supabase.from("active_loyalty_code").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Insert new code
    const { error: insertError } = await supabase.from("active_loyalty_code").insert({
      code: trimmedCode,
      created_by: adminUserId,
    });

    if (insertError) {
      console.error("[admin-update-loyalty-code] Insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reset all users' last_scan_at so everyone can scan the new code immediately
    await supabase
      .from("loyalty_stamps")
      .update({ last_scan_at: null })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // Send email with the new code to admin
    try {
      const smtpHost = Deno.env.get("SMTP_HOST");
      const smtpPort = Deno.env.get("SMTP_PORT");
      const smtpUser = Deno.env.get("SMTP_USER");
      const smtpPass = Deno.env.get("SMTP_PASS");

      if (smtpHost && smtpPort && smtpUser && smtpPass) {
        const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

        const client = new SMTPClient({
          connection: {
            hostname: smtpHost,
            port: parseInt(smtpPort),
            tls: true,
            auth: {
              username: smtpUser,
              password: smtpPass,
            },
          },
        });

        const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(trimmedCode)}`;

        await client.send({
          from: smtpUser,
          to: "michael.roks@icloud.com",
          subject: `New Loyalty QR Code: ${trimmedCode}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #b43227;">New Loyalty QR Code</h1>
              <p>The loyalty QR code has been updated to:</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <h2 style="color: #333; letter-spacing: 3px;">${trimmedCode}</h2>
              </div>
              <p>QR Code:</p>
              <div style="text-align: center;">
                <img src="${qrDataUrl}" alt="QR Code" width="300" height="300" />
              </div>
              <p style="color: #666; font-size: 12px; margin-top: 20px;">
                The old code has been invalidated and all user cooldowns have been reset. Print this QR code or display it on a tablet at the bar.
              </p>
            </div>
          `,
        });

        await client.close();
      }
    } catch (emailErr) {
      console.error("[admin-update-loyalty-code] Email error:", emailErr);
    }

    return new Response(
      JSON.stringify({ success: true, code: trimmedCode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[admin-update-loyalty-code] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
