import nodemailer from "npm:nodemailer@6.9.16";
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
    const { name, email, subscription_id } = await req.json();

    if (!name || !email) {
      return new Response(
        JSON.stringify({ success: false, error: "Name and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[OTP] Generated code for ${email}: ${code}`);

    // Store in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("otp_codes").delete().eq("email", email.toLowerCase());

    const { error: insertError } = await supabase.from("otp_codes").insert({
      email: email.toLowerCase(),
      code,
      name,
    });

    if (insertError) {
      console.error("[OTP] DB insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to store verification code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const errors: string[] = [];

    // === CHANNEL 1: Send via SMTP ===
    const SMTP_HOST = Deno.env.get("SMTP_HOST");
    const SMTP_PORT = Deno.env.get("SMTP_PORT") || "465";
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASS = Deno.env.get("SMTP_PASS");

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.error("[OTP] SMTP credentials not configured");
      errors.push("SMTP not configured");
    } else {
      try {
        console.log(`[OTP] SMTP connecting to ${SMTP_HOST}:${SMTP_PORT} as ${SMTP_USER}`);
        const port = parseInt(SMTP_PORT);
        const transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port,
          secure: port === 465,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
          debug: true,
          logger: true,
        });

        await transporter.verify();
        console.log("[OTP] SMTP connection verified");

        const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="400" cellpadding="0" cellspacing="0" style="max-width:400px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:30px;">
              <h1 style="margin:0;font-size:24px;font-weight:bold;color:#333333;letter-spacing:2px;">EAGLE AMSTERDAM</h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <p style="margin:0;font-size:16px;color:#000000;">Your VIP verification code:</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <div style="background-color:#F2F2F2;padding:24px 32px;display:inline-block;">
                <span style="font-size:36px;font-weight:bold;color:#000000;letter-spacing:10px;">${code}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center">
              <p style="margin:0;font-size:13px;color:#999999;">This code expires in 15 minutes.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        await transporter.sendMail({
          from: SMTP_USER,
          to: email,
          subject: "Eagle Amsterdam - Your VIP Code",
          html: htmlBody,
        });

        console.log("[OTP] Email sent successfully");
      } catch (smtpErr: any) {
        console.error("[OTP] SMTP error:", smtpErr);
        errors.push(`SMTP Error: ${smtpErr.message}`);
      }
    }

    // === CHANNEL 2: Send via OneSignal Push (Dual-Targeting) ===
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
    const ONESIGNAL_APP_ID = "e5e608d0-1fad-4e9a-84ca-9812ac96a3a1";
    console.log("[OTP] OneSignal REST key present:", !!ONESIGNAL_REST_API_KEY);
    console.log("[OTP] subscription_id received from client:", subscription_id || "none");

    if (ONESIGNAL_REST_API_KEY) {
      // Build targeting: use subscription_id if available, always include external_id
      const pushBody: any = {
        app_id: ONESIGNAL_APP_ID,
        headings: { en: "Eagle Amsterdam VIP" },
        contents: { en: `${code} is your Eagle VIP code. Enter it in the app to continue.` },
      };

      if (subscription_id) {
        // Dual-targeting: direct subscription + external_id alias
        pushBody.include_subscription_ids = [subscription_id];
        console.log("[OTP] Using direct subscription_id targeting:", subscription_id);
      } else {
        // Fallback: external_id alias only
        pushBody.include_aliases = { external_id: [email.toLowerCase()] };
        pushBody.target_channel = "push";
        console.log("[OTP] Using external_id alias targeting:", email.toLowerCase());
      }

      try {
        const pushResponse = await fetch("https://onesignal.com/api/v1/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
          },
          body: JSON.stringify(pushBody),
        });

        const pushResult = await pushResponse.json();
        console.log("[OTP] OneSignal response:", JSON.stringify(pushResult));

        if (!pushResponse.ok) {
          errors.push(`Push Error: ${JSON.stringify(pushResult.errors || pushResult)}`);

          // If subscription_id targeting failed, retry with external_id
          if (subscription_id) {
            console.log("[OTP] Retrying with external_id fallback...");
            const fallbackBody = {
              app_id: ONESIGNAL_APP_ID,
              include_aliases: { external_id: [email.toLowerCase()] },
              target_channel: "push",
              headings: { en: "Eagle Amsterdam VIP" },
              contents: { en: `${code} is your Eagle VIP code. Enter it in the app to continue.` },
            };

            const fallbackResponse = await fetch("https://onesignal.com/api/v1/notifications", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
              },
              body: JSON.stringify(fallbackBody),
            });
            const fallbackResult = await fallbackResponse.json();
            console.log("[OTP] OneSignal fallback response:", JSON.stringify(fallbackResult));
          }
        } else {
          console.log("[OTP] Push sent, recipients:", pushResult.recipients);
        }
      } catch (pushErr: any) {
        console.error("[OTP] Push error:", pushErr);
        errors.push(`Push Error: ${pushErr.message}`);
      }
    } else {
      console.log("[OTP] OneSignal REST API key not configured, skipping push");
    }

    const smtpFailed = errors.some((e) => e.startsWith("SMTP"));

    return new Response(
      JSON.stringify({
        success: true,
        warnings: errors.length > 0 ? errors : undefined,
        smtp_error: smtpFailed ? errors.find((e) => e.startsWith("SMTP")) : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[OTP] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to send code" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
