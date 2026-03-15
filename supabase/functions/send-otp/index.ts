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
    const { name, email, subscriptionId } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required" }),
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

    // Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(`[OTP] Generated code for ${email}: ${code}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("otp_codes").delete().eq("email", email.toLowerCase());

    const { error: insertError } = await supabase.from("otp_codes").insert({
      email: email.toLowerCase(),
      code,
      name: name || "",
    });

    if (insertError) {
      console.error("[OTP] DB insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to store verification code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const errors: string[] = [];

    // === SMTP ===
    const SMTP_HOST = Deno.env.get("SMTP_HOST");
    const SMTP_PORT = Deno.env.get("SMTP_PORT") || "465";
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASS = Deno.env.get("SMTP_PASS");

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      errors.push("SMTP not configured");
    } else {
      try {
        const port = parseInt(SMTP_PORT);
        const transporter = nodemailer.createTransport({
          host: SMTP_HOST, port, secure: port === 465,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        });

        await transporter.verify();

        const htmlBody = `
<!DOCTYPE html>
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
                <span style="font-size:42px;font-weight:bold;color:#000000;letter-spacing:12px;">${code}</span>
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
          from: SMTP_USER, to: email,
          subject: "Eagle Amsterdam - Your VIP Code",
          html: htmlBody,
        });

        console.log("[OTP] Email sent successfully");
      } catch (smtpErr: any) {
        console.error("[OTP] SMTP error:", smtpErr);
        errors.push(`SMTP Error: ${smtpErr.message}`);
      }
    }

    // === OneSignal Push (Subscription-first fallback logic) ===
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
    const ONESIGNAL_APP_ID = "e5e608d0-1fad-4e9a-84ca-9812ac96a3a1";

    if (ONESIGNAL_REST_API_KEY) {
      const pushContent = `${code} is your Eagle VIP code.`;
      const normalizedEmail = email.toLowerCase();
      const normalizedSubscriptionId =
        typeof subscriptionId === "string" && subscriptionId.trim().length > 0
          ? subscriptionId.trim()
          : null;

      const sendPushToTarget = async (
        pushBody: Record<string, unknown>,
        targetType: "subscription_id" | "external_id"
      ): Promise<boolean> => {
        try {
          const pushResponse = await fetch("https://api.onesignal.com/notifications?c=push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify(pushBody),
          });

          const pushResult = await pushResponse.json();
          const hasErrors = Array.isArray(pushResult?.errors)
            ? pushResult.errors.length > 0
            : !!pushResult?.errors;
          const messageId = typeof pushResult?.id === "string" ? pushResult.id : "";
          const recipients = Number(pushResult?.recipients ?? 0);

          if (pushResponse.ok && !hasErrors && messageId.length > 0) {
            console.log(
              `[OTP] Push accepted via ${targetType}. messageId=${messageId}, recipients=${Number.isNaN(recipients) ? "n/a" : recipients}`
            );
            return true;
          }

          console.warn(`[OTP] Push via ${targetType} failed:`, {
            status: pushResponse.status,
            errors: pushResult?.errors,
            id: pushResult?.id,
            recipients: pushResult?.recipients,
            full: pushResult,
          });
          return false;
        } catch (pushErr: any) {
          console.error(`[OTP] Push via ${targetType} failed:`, pushErr.message);
          errors.push(`Push Error: ${pushErr.message}`);
          return false;
        }
      };

      let delivered = false;

      // Absolute primary: direct subscription targeting
      if (normalizedSubscriptionId) {
        delivered = await sendPushToTarget(
          {
            app_id: ONESIGNAL_APP_ID,
            include_subscription_ids: [normalizedSubscriptionId],
            target_channel: "push",
            isAnyWeb: true,
            headings: { en: "Eagle Amsterdam VIP" },
            contents: { en: pushContent },
          },
          "subscription_id"
        );
      }

      // Fallback: external_id alias targeting
      if (!delivered) {
        await sendPushToTarget(
          {
            app_id: ONESIGNAL_APP_ID,
            include_aliases: { external_id: [normalizedEmail] },
            target_channel: "push",
            isAnyWeb: true,
            headings: { en: "Eagle Amsterdam VIP" },
            contents: { en: pushContent },
          },
          "external_id"
        );
      }
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
