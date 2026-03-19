import nodemailer from "npm:nodemailer@6.9.16";
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
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return json({ success: false, error: "Email is required" }, 400);
    }

    const targetEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      return json({ success: false, error: "Invalid email address" }, 400);
    }

    // ── Generate a clean 4-digit code ──
    const code = String(Math.floor(1000 + Math.random() * 9000));
    console.log(`[send-otp] Generated code "${code}" for ${targetEmail}`);

    // ── Supabase client (service role) ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Delete any previous codes for this email ──
    await supabase.from("otp_codes").delete().eq("email", targetEmail);
    console.log(`[send-otp] Cleared old codes for ${targetEmail}`);

    // ── Insert new code (expires_at defaults to NOW() + 15 min in DB, but we override to 10 min) ──
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("otp_codes").insert({
      email: targetEmail,
      code,
      name: "",
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("[send-otp] Insert failed:", insertError.message);
      return json({ success: false, error: "Failed to store verification code" }, 500);
    }

    console.log(`[send-otp] Stored code, expires at ${expiresAt}`);

    // ── SMTP setup ──
    const SMTP_HOST = Deno.env.get("SMTP_HOST");
    const SMTP_PORT = Deno.env.get("SMTP_PORT") || "465";
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASS = Deno.env.get("SMTP_PASS");

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return json({ success: false, error: "SMTP not configured" }, 500);
    }

    const port = parseInt(SMTP_PORT);
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });

    // ── Email body — plain digits, no hidden characters ──
    const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="400" cellpadding="0" cellspacing="0" style="max-width:400px;width:100%;">
<tr><td align="center" style="padding-bottom:30px;">
<h1 style="margin:0;font-size:24px;font-weight:bold;color:#333;letter-spacing:2px;">EAGLE AMSTERDAM</h1>
</td></tr>
<tr><td align="center" style="padding-bottom:24px;">
<p style="margin:0;font-size:16px;color:#000;">Your VIP verification code:</p>
</td></tr>
<tr><td align="center" style="padding-bottom:24px;">
<div style="background:#f2f2f2;padding:24px 32px;display:inline-block;">
<span style="font-size:42px;font-weight:bold;color:#000;letter-spacing:12px;font-family:monospace;">${code}</span>
</div>
</td></tr>
<tr><td align="center">
<p style="margin:0;font-size:13px;color:#999;">This code expires in 10 minutes.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

    const textBody = `Your Eagle Amsterdam VIP code is: ${code}\n\nThis code expires in 10 minutes.`;

    let smtpError: string | null = null;
    try {
      await transporter.sendMail({
        from: SMTP_USER,
        to: targetEmail,
        subject: "Eagle Amsterdam - Your VIP Code",
        text: textBody,
        html: htmlBody,
      });
      console.log(`[send-otp] Email sent successfully to ${targetEmail}`);
    } catch (e: any) {
      smtpError = e.message || "Email delivery failed";
      console.error(`[send-otp] SMTP error: ${smtpError}`);
    }

    if (smtpError) {
      return json({ success: true, smtp_error: smtpError });
    }

    return json({ success: true });
  } catch (error: any) {
    console.error("[send-otp] Unhandled error:", error.message);
    return json({ success: false, error: error.message || "Failed to send code" }, 500);
  }
});
