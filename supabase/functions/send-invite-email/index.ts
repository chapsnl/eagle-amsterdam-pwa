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

    if (!adminUserId || !email) {
      return new Response(
        JSON.stringify({ success: false, error: "adminUserId and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin
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

    const port = parseInt(smtpPort);
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port,
      secure: port === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.verify();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">

<!-- Header -->
<tr><td style="background:#1a1a1a;padding:24px;text-align:center;">
  <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:1px;">EAGLE AMSTERDAM</h1>
</td></tr>

<!-- Welcome -->
<tr><td style="padding:24px 24px 8px;">
  <h2 style="font-size:18px;font-weight:700;color:#1a1a1a;border-bottom:2px solid #e0e0e0;padding-bottom:12px;margin:0 0 16px;">You're Invited! 🦅</h2>
  <p style="font-size:14px;color:#1a1a1a;line-height:1.6;margin:0 0 16px;">
    Welcome to the Eagle Amsterdam App — your VIP pass to exclusive perks, free vouchers, and loyalty rewards.
  </p>
</td></tr>

<!-- Benefits -->
<tr><td style="padding:0 24px 8px;">
  <h2 style="font-size:18px;font-weight:700;color:#1a1a1a;border-bottom:2px solid #e0e0e0;padding-bottom:12px;margin:0 0 16px;">What's In It For You?</h2>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:8px 0;"><span style="width:140px;display:inline-block;font-size:14px;font-weight:600;color:#555;">🎟️ Free Coat Check</span><span style="font-size:14px;color:#1a1a1a;">Get a free coat check voucher when you sign up</span></td></tr>
    <tr><td style="padding:8px 0;"><span style="width:140px;display:inline-block;font-size:14px;font-weight:600;color:#555;">🪙 Free Token</span><span style="font-size:14px;color:#1a1a1a;">Start with a free loyalty token towards free entry</span></td></tr>
    <tr><td style="padding:8px 0;"><span style="width:140px;display:inline-block;font-size:14px;font-weight:600;color:#555;">🎉 Free Entry</span><span style="font-size:14px;color:#1a1a1a;">Collect 6 tokens for free entry to Sunday Sex Parties — NcAdam, Horsemen and Knights, Cum Hunks</span></td></tr>
    <tr><td style="padding:8px 0;"><span style="width:140px;display:inline-block;font-size:14px;font-weight:600;color:#555;">🍺 Free Drinks</span><span style="font-size:14px;color:#1a1a1a;">Earn free drink vouchers as rewards</span></td></tr>
    <tr><td style="padding:8px 0;"><span style="width:140px;display:inline-block;font-size:14px;font-weight:600;color:#555;">🔔 Notifications</span><span style="font-size:14px;color:#1a1a1a;">Get notified instantly when you receive a free voucher in your Member Deals</span></td></tr>
  </table>
</td></tr>

<!-- VIP Status -->
<tr><td style="padding:0 24px 8px;">
  <h2 style="font-size:18px;font-weight:700;color:#1a1a1a;border-bottom:2px solid #e0e0e0;padding-bottom:12px;margin:0 0 16px;">Climb the VIP Ranks 🏆</h2>
  <p style="font-size:14px;color:#1a1a1a;line-height:1.6;margin:0 0 12px;">
    The more you visit, the higher your status. Each level unlocks exclusive benefits:
  </p>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:8px 0;"><span style="font-size:14px;font-weight:600;color:#555;">Regular</span><span style="font-size:14px;color:#1a1a1a;"> — Your starting point. Collect tokens for free entry!</span></td></tr>
    <tr><td style="padding:8px 0;"><span style="font-size:14px;font-weight:600;color:#555;">Party Boy</span><span style="font-size:14px;color:#1a1a1a;"> — Fast-Lane access at the door</span></td></tr>
    <tr><td style="padding:8px 0;"><span style="font-size:14px;font-weight:600;color:#555;">Cruiser</span><span style="font-size:14px;color:#1a1a1a;"> — Priority access + free entry during Pride and city-wide events</span></td></tr>
    <tr><td style="padding:8px 0;"><span style="font-size:14px;font-weight:600;color:#555;">Slut</span><span style="font-size:14px;color:#1a1a1a;"> — All of the above + lifetime free coat check and more surprises...</span></td></tr>
  </table>
</td></tr>

<!-- Install iPhone -->
<tr><td style="padding:0 24px 8px;">
  <h2 style="font-size:18px;font-weight:700;color:#1a1a1a;border-bottom:2px solid #e0e0e0;padding-bottom:12px;margin:0 0 16px;">📱 Install on iPhone</h2>
  <ol style="font-size:14px;color:#1a1a1a;line-height:1.8;margin:0;padding-left:20px;">
    <li>Open <strong>Safari</strong> and go to <a href="https://eagle-app.lovable.app" style="color:#1a1a1a;font-weight:600;">eagle-app.lovable.app</a></li>
    <li>Tap the <strong>Share</strong> button (square with arrow) at the bottom</li>
    <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
    <li>Tap <strong>"Add"</strong> in the top right</li>
    <li>Open the app from your home screen and sign up!</li>
  </ol>
  <p style="font-size:14px;color:#1a1a1a;margin:12px 0 0;">
    <strong>Watch the video:</strong>
    <a href="https://www.eagleamsterdam.com/video/iphone.mp4" style="color:#1a1a1a;font-weight:600;">iPhone Install Guide →</a>
  </p>
</td></tr>

<!-- Install Android -->
<tr><td style="padding:0 24px 8px;">
  <h2 style="font-size:18px;font-weight:700;color:#1a1a1a;border-bottom:2px solid #e0e0e0;padding-bottom:12px;margin:0 0 16px;">🤖 Install on Android</h2>
  <ol style="font-size:14px;color:#1a1a1a;line-height:1.8;margin:0;padding-left:20px;">
    <li>Open <strong>Chrome</strong> and go to <a href="https://eagle-app.lovable.app" style="color:#1a1a1a;font-weight:600;">eagle-app.lovable.app</a></li>
    <li>Tap the <strong>three dots</strong> (⋮) in the top right</li>
    <li>Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></li>
    <li>Tap <strong>"Add"</strong> to confirm</li>
    <li>Open the app from your home screen and sign up!</li>
  </ol>
  <p style="font-size:14px;color:#1a1a1a;margin:12px 0 0;">
    <strong>Watch the video:</strong>
    <a href="https://www.eagleamsterdam.com/video/android.mp4" style="color:#1a1a1a;font-weight:600;">Android Install Guide →</a>
  </p>
</td></tr>

<!-- Push Notifications -->
<tr><td style="padding:0 24px 16px;">
  <h2 style="font-size:18px;font-weight:700;color:#1a1a1a;border-bottom:2px solid #e0e0e0;padding-bottom:12px;margin:0 0 16px;">🔔 Don't Miss Your Free Vouchers!</h2>
  <p style="font-size:14px;color:#1a1a1a;line-height:1.6;margin:0;">
    Make sure to <strong>enable Push Notifications</strong> when you set up your profile. Whenever you receive a free voucher — like free drinks, free entry, or coat check — you'll get a notification instantly so you never miss out!
  </p>
</td></tr>

<!-- CTA -->
<tr><td style="padding:0 24px 24px;text-align:center;">
  <a href="https://eagle-app.lovable.app" style="display:inline-block;background:#1a1a1a;color:#ffffff;padding:10px 20px;border-radius:6px;font-weight:600;text-decoration:none;font-size:14px;">
    Open Eagle App →
  </a>
</td></tr>

<!-- Footer -->
<tr><td style="background:#f9f9f9;border-top:1px solid #e0e0e0;padding:16px 24px;text-align:center;">
  <p style="margin:0;font-size:12px;color:#999;">Eagle Amsterdam · Warmoesstraat 90 · Amsterdam</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

    await transporter.sendMail({
      from: `"Eagle Amsterdam" <${Deno.env.get("SMTP_USER")}>`,
      to: email,
      subject: "You're Invited to the Eagle Amsterdam App! 🦅",
      html: htmlContent,
    });

    return new Response(
      JSON.stringify({ success: true }),
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
