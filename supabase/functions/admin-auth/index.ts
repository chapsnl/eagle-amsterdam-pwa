import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "michael.roks@icloud.com";
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, email, password, code } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!email || email.toLowerCase() !== ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ success: false, error: "Access denied." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ success: false, error: "Admin account not found." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminUserId = profile.id;

    // ACTION: check-setup
    if (action === "check-setup") {
      const { data: cred } = await supabase
        .from("admin_credentials")
        .select("id")
        .eq("user_id", adminUserId)
        .single();

      return new Response(
        JSON.stringify({ success: true, hasPassword: !!cred }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: set-password
    if (action === "set-password") {
      if (!password || password.length < 8) {
        return new Response(
          JSON.stringify({ success: false, error: "Password must be at least 8 characters." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existing } = await supabase
        .from("admin_credentials")
        .select("id")
        .eq("user_id", adminUserId)
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({ success: false, error: "Password already set." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const passwordHash = await hashPassword(password);
      await supabase.from("admin_credentials").insert({
        user_id: adminUserId,
        password_hash: passwordHash,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: verify-password
    if (action === "verify-password") {
      if (!password) {
        return new Response(
          JSON.stringify({ success: false, error: "Password is required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: cred } = await supabase
        .from("admin_credentials")
        .select("password_hash, failed_attempts, locked_until")
        .eq("user_id", adminUserId)
        .single();

      if (!cred) {
        return new Response(
          JSON.stringify({ success: false, error: "No password set." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check lockout
      if (cred.locked_until && new Date(cred.locked_until) > new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: "Too many failed attempts. Try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const passwordHash = await hashPassword(password);
      if (passwordHash !== cred.password_hash) {
        const newAttempts = (cred.failed_attempts || 0) + 1;
        const updates: Record<string, unknown> = { failed_attempts: newAttempts };
        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          updates.locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
          updates.failed_attempts = 0;
        }
        await supabase.from("admin_credentials").update(updates).eq("user_id", adminUserId);

        return new Response(
          JSON.stringify({ success: false, error: "Incorrect password." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Password correct — reset counters
      await supabase.from("admin_credentials")
        .update({ failed_attempts: 0, locked_until: null })
        .eq("user_id", adminUserId);

      // Generate and send OTP
      const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

      await supabase.from("otp_codes").delete().eq("email", normalizedEmail);
      await supabase.from("otp_codes").insert({
        email: normalizedEmail,
        code: otpCode,
        name: "Admin",
      });

      const { default: nodemailer } = await import("npm:nodemailer@6.9.16");
      const SMTP_HOST = Deno.env.get("SMTP_HOST");
      const SMTP_PORT = Deno.env.get("SMTP_PORT") || "465";
      const SMTP_USER = Deno.env.get("SMTP_USER");
      const SMTP_PASS = Deno.env.get("SMTP_PASS");

      if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        return new Response(
          JSON.stringify({ success: false, error: "Email service not configured." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const port = parseInt(SMTP_PORT);
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST, port, secure: port === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });

      const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#FFFFFF;font-family:Manrope,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="400" cellpadding="0" cellspacing="0" style="max-width:400px;width:100%;">
        <tr><td align="center" style="padding-bottom:30px;">
          <h1 style="margin:0;font-size:24px;font-weight:bold;color:#333;letter-spacing:2px;">EAGLE ADMIN</h1>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <p style="margin:0;font-size:16px;color:#000;">Your admin verification code:</p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <div style="background-color:#F2F2F2;padding:24px 32px;display:inline-block;">
            <span style="font-size:42px;font-weight:bold;color:#000;letter-spacing:12px;">${otpCode}</span>
          </div>
        </td></tr>
        <tr><td align="center">
          <p style="margin:0;font-size:13px;color:#999;">This code expires in 15 minutes.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      await transporter.sendMail({
        from: SMTP_USER,
        to: normalizedEmail,
        subject: "Eagle Admin - Verification Code",
        html: htmlBody,
      });

      return new Response(
        JSON.stringify({ success: true, otpSent: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: verify-otp
    if (action === "verify-otp") {
      if (!code) {
        return new Response(
          JSON.stringify({ success: false, error: "Code is required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: otpRecord } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("code", code)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!otpRecord) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid or expired code." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("otp_codes").update({ verified: true }).eq("id", otpRecord.id);
      await supabase.from("otp_codes").delete().eq("email", normalizedEmail);

      return new Response(
        JSON.stringify({
          success: true,
          adminUserId,
          sessionToken: crypto.randomUUID(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
