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

    // Send via SMTP
    const SMTP_HOST = Deno.env.get("SMTP_HOST");
    const SMTP_PORT = Deno.env.get("SMTP_PORT") || "465";
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASS = Deno.env.get("SMTP_PASS");

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.error("[OTP] SMTP credentials not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    console.log("[OTP] SMTP transport created, verifying connection...");

    try {
      await transporter.verify();
      console.log("[OTP] SMTP connection verified successfully");
    } catch (verifyErr) {
      console.error("[OTP] SMTP verification failed:", verifyErr);
      return new Response(
        JSON.stringify({ success: false, error: `SMTP Connection Error: ${verifyErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 30px; background: #000; color: #fff;">
        <h2 style="color: #b43227; text-align: center; margin-bottom: 20px;">Eagle Amsterdam</h2>
        <p style="text-align: center; font-size: 16px; margin-bottom: 10px;">Your VIP verification code:</p>
        <div style="text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #b43227; padding: 20px; background: #111; margin: 20px 0;">
          ${code}
        </div>
        <p style="text-align: center; font-size: 13px; color: #999;">This code expires in 15 minutes.</p>
      </div>
    `;

    console.log(`[OTP] Sending email from ${SMTP_USER} to ${email}...`);

    await transporter.sendMail({
      from: SMTP_USER,
      to: email,
      subject: "Eagle Amsterdam - Your VIP Code",
      html: htmlBody,
    });

    console.log("[OTP] Email sent successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[OTP] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to send code" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
