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
  <title>Eagle Amsterdam App Invitation</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#1a1a1a;padding:28px 24px;text-align:center;">
              <h1 style="margin:0;font-size:24px;line-height:1.2;font-weight:800;color:#ffffff;letter-spacing:1.5px;">EAGLE AMSTERDAM</h1>
              <p style="margin:10px 0 0;font-size:12px;line-height:1.5;color:#d4d4d8;text-transform:uppercase;letter-spacing:1.2px;">VIP Member Invitation</p>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 20px;">
              <h2 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#1a1a1a;">You’re invited to the Eagle App</h2>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#3f3f46;">
                Join the <strong>Eagle Amsterdam App</strong> to unlock exclusive perks, free vouchers, and loyalty rewards.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;">
                <tr>
                  <td style="padding:18px 18px 6px;font-size:15px;font-weight:700;color:#1a1a1a;">What you get</td>
                </tr>
                <tr><td style="padding:6px 18px;font-size:14px;line-height:1.6;color:#3f3f46;">• Free coat check voucher when you sign up</td></tr>
                <tr><td style="padding:6px 18px;font-size:14px;line-height:1.6;color:#3f3f46;">• A free loyalty token to get started</td></tr>
                <tr><td style="padding:6px 18px;font-size:14px;line-height:1.6;color:#3f3f46;">• Free entry rewards after collecting 6 tokens</td></tr>
                <tr><td style="padding:6px 18px;font-size:14px;line-height:1.6;color:#3f3f46;">• Free drink vouchers and member rewards</td></tr>
                <tr><td style="padding:6px 18px 18px;font-size:14px;line-height:1.6;color:#3f3f46;">• Push notifications when new vouchers arrive</td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 20px;">
              <h3 style="margin:0 0 12px;font-size:16px;line-height:1.4;color:#1a1a1a;">VIP status ranks</h3>
              <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#3f3f46;"><strong>Regular</strong> — Collect tokens for free entry</p>
              <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#3f3f46;"><strong>Party Boy</strong> — Fast-lane access at the door</p>
              <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#3f3f46;"><strong>Cruiser</strong> — Priority access and free entry during major events</p>
              <p style="margin:0;font-size:14px;line-height:1.7;color:#3f3f46;"><strong>Slut</strong> — All perks plus lifetime free coat check and more</p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:16px;border:1px solid #e5e7eb;border-radius:10px;font-size:14px;line-height:1.7;color:#3f3f46;">
                    <strong style="color:#1a1a1a;">Install on iPhone</strong><br />
                    Open Safari, go to <a href="${appUrl}" style="color:#1a1a1a;font-weight:700;text-decoration:underline;">app.eagleamsterdam.com</a>, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
                    <br /><br />
                    <a href="https://www.eagleamsterdam.com/video/iphone.mp4" style="color:#52525b;text-decoration:underline;">Watch iPhone guide</a>
                  </td>
                </tr>
                <tr><td style="height:12px;"></td></tr>
                <tr>
                  <td style="padding:16px;border:1px solid #e5e7eb;border-radius:10px;font-size:14px;line-height:1.7;color:#3f3f46;">
                    <strong style="color:#1a1a1a;">Install on Android</strong><br />
                    Open Chrome, go to <a href="${appUrl}" style="color:#1a1a1a;font-weight:700;text-decoration:underline;">app.eagleamsterdam.com</a>, tap the menu, then choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                    <br /><br />
                    <a href="https://www.eagleamsterdam.com/video/android.mp4" style="color:#52525b;text-decoration:underline;">Watch Android guide</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 24px 32px;text-align:center;">
              <a href="${appUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;line-height:1;padding:14px 28px;border-radius:8px;">Open Eagle App</a>
              <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#71717a;">Enable push notifications so you never miss a free voucher.</p>
            </td>
          </tr>

          <tr>
            <td style="border-top:1px solid #e5e7eb;padding:18px 24px;text-align:center;background:#fafafa;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#71717a;">Eagle Amsterdam · Warmoesstraat 90 · Amsterdam</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const textContent = `You're invited to the Eagle Amsterdam App.

Open the app: ${appUrl}

What you get:
- Free coat check voucher when you sign up
- A free loyalty token to get started
- Free entry rewards after collecting 6 tokens
- Free drink vouchers and member rewards
- Push notifications when new vouchers arrive

VIP status ranks:
- Regular: Collect tokens for free entry
- Party Boy: Fast-lane access at the door
- Cruiser: Priority access and free entry during major events
- Slut: All perks plus lifetime free coat check and more

Install on iPhone:
Open Safari, go to ${appUrl}, tap Share, then Add to Home Screen.
Guide: https://www.eagleamsterdam.com/video/iphone.mp4

Install on Android:
Open Chrome, go to ${appUrl}, tap the menu, then choose Install app or Add to Home screen.
Guide: https://www.eagleamsterdam.com/video/android.mp4`;

    const info = await transporter.sendMail({
      from: smtpUser,
      to: normalizedEmail,
      subject: "Eagle Amsterdam App Invitation",
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
