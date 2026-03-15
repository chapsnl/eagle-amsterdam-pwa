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
    const { name, email } = await req.json();

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

    // Delete any existing codes for this email
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

        const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="400" cellpadding="0" cellspacing="0" style="max-width:400px;width:100%;">
          <!-- Title -->
          <tr>
            <td align="center" style="padding-bottom:30px;">
              <h1 style="margin:0;font-size:24px;font-weight:bold;color:#333333;letter-spacing:2px;">EAGLE AMSTERDAM</h1>
            </td>
          </tr>
          <!-- Subtitle -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <p style="margin:0;font-size:16px;color:#000000;">Your VIP verification code:</p>
            </td>
          </tr>
          <!-- Code Box -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <div style="background-color:#F2F2F2;padding:24px 32px;display:inline-block;">
                <span style="font-size:36px;font-weight:bold;color:#000000;letter-spacing:10px;">${code}</span>
              </div>
            </td>
          </tr>
          <!-- Expiry -->
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

    // === CHANNEL 2: Send via OneSignal Push ===
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
    const ONESIGNAL_APP_ID = "e5e608d0-1fad-4e9a-84ca-9812ac96a3a1";

    if (ONESIGNAL_REST_API_KEY) {
      try {
        console.log("[OTP] Push request sent to OneSignal for external_id:", email.toLowerCase());

        const pushResponse = await fetch("https://onesignal.com/api/v1/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
          },
          body: JSON.stringify({
            app_id: ONESIGNAL_APP_ID,
            // Target the specific user by their external ID (email)
            include_aliases: { external_id: [email.toLowerCase()] },
            target_channel: "push",
            headings: { en: "Eagle Amsterdam VIP" },
            contents: { en: `Your verification code is: ${code}` },
          }),
        });

        const pushData = await pushResponse.json();

        if (!pushResponse.ok) {
          console.error("[OTP] OneSignal error:", pushData);
          errors.push(`Push Error: ${JSON.stringify(pushData.errors || pushData)}`);
        } else {
          console.log("[OTP] Push notification sent:", pushData.id);
        }
      } catch (pushErr: any) {
        console.error("[OTP] Push error:", pushErr);
        errors.push(`Push Error: ${pushErr.message}`);
      }
    } else {
      console.log("[OTP] OneSignal REST API key not configured, skipping push");
    }

    // Return success if at least one channel worked
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
