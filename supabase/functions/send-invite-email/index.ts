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
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);overflow:hidden;">

<!-- Header -->
<tr><td style="background:#1a1a1a;padding:32px 24px;text-align:center;">
  <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:2px;">EAGLE AMSTERDAM</h1>
  <p style="margin:8px 0 0;font-size:13px;color:#999;letter-spacing:1px;">VIP MEMBER INVITATION</p>
</td></tr>

<!-- Intro -->
<tr><td style="padding:32px 32px 24px;">
  <p style="font-size:15px;color:#333;line-height:1.7;margin:0;">
    You've been personally invited to join the <strong>Eagle Amsterdam App</strong> — your digital pass to exclusive perks, free vouchers, and loyalty rewards.
  </p>
</td></tr>

<!-- Benefits -->
<tr><td style="padding:0 32px 24px;">
  <h2 style="font-size:16px;font-weight:700;color:#1a1a1a;margin:0 0 16px;padding-bottom:8px;border-bottom:1px solid #e5e5e5;">Member Benefits</h2>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;"><span style="font-size:20px;vertical-align:middle;">🧥</span> <span style="font-size:14px;color:#333;margin-left:8px;"><strong>Free Coat Check</strong> voucher on sign-up</span></td></tr>
    <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;"><span style="font-size:20px;vertical-align:middle;">⭐</span> <span style="font-size:14px;color:#333;margin-left:8px;"><strong>Free Loyalty Token</strong> to start collecting</span></td></tr>
    <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;"><span style="font-size:20px;vertical-align:middle;">🎟️</span> <span style="font-size:14px;color:#333;margin-left:8px;"><strong>Free Entry</strong> after 6 tokens (Sunday Sex Parties)</span></td></tr>
    <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;"><span style="font-size:20px;vertical-align:middle;">🍺</span> <span style="font-size:14px;color:#333;margin-left:8px;"><strong>Free Drinks</strong> as loyalty rewards</span></td></tr>
    <tr><td style="padding:10px 0;"><span style="font-size:20px;vertical-align:middle;">🔔</span> <span style="font-size:14px;color:#333;margin-left:8px;"><strong>Push Notifications</strong> for new vouchers</span></td></tr>
  </table>
</td></tr>

<!-- VIP Ranks -->
<tr><td style="padding:0 32px 24px;">
  <h2 style="font-size:16px;font-weight:700;color:#1a1a1a;margin:0 0 16px;padding-bottom:8px;border-bottom:1px solid #e5e5e5;">VIP Status Ranks</h2>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:8px 12px;background:#f9f9f9;border-radius:6px;margin-bottom:4px;"><strong style="color:#555;">Regular</strong><span style="color:#666;font-size:13px;"> — Collect tokens for free entry</span></td></tr>
    <tr><td style="height:4px;"></td></tr>
    <tr><td style="padding:8px 12px;background:#f9f9f9;border-radius:6px;"><strong style="color:#555;">Party Boy</strong><span style="color:#666;font-size:13px;"> — Fast-lane access at the door</span></td></tr>
    <tr><td style="height:4px;"></td></tr>
    <tr><td style="padding:8px 12px;background:#f9f9f9;border-radius:6px;"><strong style="color:#555;">Cruiser</strong><span style="color:#666;font-size:13px;"> — Priority access + free entry during Pride</span></td></tr>
    <tr><td style="height:4px;"></td></tr>
    <tr><td style="padding:8px 12px;background:#f9f9f9;border-radius:6px;"><strong style="color:#555;">Slut</strong><span style="color:#666;font-size:13px;"> — All perks + lifetime free coat check & more</span></td></tr>
  </table>
</td></tr>

<!-- Install Instructions -->
<tr><td style="padding:0 32px 24px;">
  <h2 style="font-size:16px;font-weight:700;color:#1a1a1a;margin:0 0 16px;padding-bottom:8px;border-bottom:1px solid #e5e5e5;">How to Install</h2>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:12px 16px;background:#f9f9f9;border-radius:8px;vertical-align:top;width:50%;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1a1a1a;">iPhone (Safari)</p>
        <ol style="font-size:13px;color:#555;line-height:1.8;margin:0;padding-left:18px;">
          <li>Open Safari → <a href="${appUrl}" style="color:#1a1a1a;font-weight:600;">app.eagleamsterdam.com</a></li>
          <li>Tap <strong>Share</strong> → <strong>Add to Home Screen</strong></li>
          <li>Open the app and sign up</li>
        </ol>
        <p style="margin:8px 0 0;font-size:12px;"><a href="https://www.eagleamsterdam.com/video/iphone.mp4" style="color:#555;">Watch video guide →</a></p>
      </td>
      <td style="width:12px;"></td>
      <td style="padding:12px 16px;background:#f9f9f9;border-radius:8px;vertical-align:top;width:50%;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1a1a1a;">Android (Chrome)</p>
        <ol style="font-size:13px;color:#555;line-height:1.8;margin:0;padding-left:18px;">
          <li>Open Chrome → <a href="${appUrl}" style="color:#1a1a1a;font-weight:600;">app.eagleamsterdam.com</a></li>
          <li>Tap <strong>⋮</strong> → <strong>Install app</strong></li>
          <li>Open the app and sign up</li>
        </ol>
        <p style="margin:8px 0 0;font-size:12px;"><a href="https://www.eagleamsterdam.com/video/android.mp4" style="color:#555;">Watch video guide →</a></p>
      </td>
    </tr>
  </table>
</td></tr>

<!-- CTA -->
<tr><td style="padding:0 32px 32px;text-align:center;">
  <a href="${appUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;padding:14px 32px;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px;letter-spacing:0.5px;">
    Open Eagle App
  </a>
  <p style="margin:12px 0 0;font-size:12px;color:#999;">Enable push notifications to never miss a free voucher!</p>
</td></tr>

<!-- Footer -->
<tr><td style="background:#fafafa;border-top:1px solid #eee;padding:20px 32px;text-align:center;">
  <p style="margin:0;font-size:11px;color:#aaa;">Eagle Amsterdam · Warmoesstraat 90 · Amsterdam</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

    const textContent = `You're invited to the Eagle Amsterdam App!

Open the app: ${appUrl}

Benefits:
- Free coat check voucher on sign-up
- Free loyalty token to start collecting
- Free entry after 6 tokens (Sunday Sex Parties)
- Free drink vouchers as rewards
- Push notifications for new vouchers

VIP Ranks: Regular → Party Boy → Cruiser → Slut

Install on iPhone: Open Safari → ${appUrl} → Share → Add to Home Screen
Video guide: https://www.eagleamsterdam.com/video/iphone.mp4

Install on Android: Open Chrome → ${appUrl} → Menu → Install app
Video guide: https://www.eagleamsterdam.com/video/android.mp4`;

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
