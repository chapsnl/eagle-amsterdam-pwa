import nodemailer from "npm:nodemailer@6.9.16";
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
    const { adminUserId, email } = await req.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();

    if (!adminUserId || !normalizedEmail) {
      return new Response(
        JSON.stringify({ success: false, error: "adminUserId and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = Deno.env.get("SMTP_PORT") || "465";
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    if (!smtpHost || !smtpUser || !smtpPass) {
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const port = parseInt(smtpPort, 10);
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port,
      secure: port === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        servername: smtpHost,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    const appUrl = "https://app.eagleamsterdam.com";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Eagle Amsterdam Invitation</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="420" cellpadding="0" cellspacing="0" style="max-width:420px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;letter-spacing:2px;color:#111111;">EAGLE AMSTERDAM</h1>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding-bottom:16px;">
              <p style="margin:0;font-size:18px;line-height:1.5;color:#111111;font-weight:700;">You are invited to join the Eagle App.</p>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding-bottom:20px;">
              <p style="margin:0;font-size:15px;line-height:1.7;color:#333333;">Open the app to access your member benefits, vouchers, and loyalty rewards.</p>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding-bottom:20px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#111111;border-radius:6px;">
                    <a href="${appUrl}" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Open Eagle App</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding-bottom:20px;">
              <p style="margin:0;font-size:14px;line-height:1.7;color:#555555;">If you use iPhone: open the link in Safari and choose <strong>Add to Home Screen</strong>.</p>
              <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#555555;">If you use Android: open the link in Chrome and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding-bottom:24px;">
              <p style="margin:0;font-size:14px;line-height:1.7;color:#555555;">App link: <a href="${appUrl}" style="color:#111111;text-decoration:underline;">${appUrl}</a></p>
            </td>
          </tr>
          <tr>
            <td align="left" style="border-top:1px solid #e5e5e5;padding-top:18px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#888888;">Eagle Amsterdam</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const textContent = `You are invited to join the Eagle App.

Open the app: ${appUrl}

Use iPhone:
Open the link in Safari and choose Add to Home Screen.

Use Android:
Open the link in Chrome and choose Install app or Add to Home screen.

Eagle Amsterdam`;

    const info = await transporter.sendMail({
      from: `Eagle Amsterdam <${smtpUser}>`,
      to: normalizedEmail,
      subject: "Eagle Amsterdam - Invitation",
      text: textContent,
      html: htmlContent,
      replyTo: smtpUser,
    });

    console.log("[send-invite-email] Sent", JSON.stringify({
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    }));

    if (Array.isArray(info.rejected) && info.rejected.length > 0) {
      throw new Error(`Invite rejected for: ${info.rejected.join(", ")}`);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: info.messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-invite-email] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to send invite" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
