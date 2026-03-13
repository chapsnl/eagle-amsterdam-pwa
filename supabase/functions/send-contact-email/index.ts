const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, question } = await req.json();

    // Validate inputs
    if (!name || !email || !subject || !question) {
      return new Response(
        JSON.stringify({ success: false, error: 'All fields are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Length limits
    if (name.length > 100 || email.length > 255 || subject.length > 200 || question.length > 5000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Input exceeds maximum length' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SMTP_HOST = Deno.env.get('SMTP_HOST');
    const SMTP_PORT = Deno.env.get('SMTP_PORT') || '587';
    const SMTP_USER = Deno.env.get('SMTP_USER');
    const SMTP_PASS = Deno.env.get('SMTP_PASS');
    const SMTP_FROM = Deno.env.get('SMTP_FROM') || SMTP_USER;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.error('SMTP credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use SMTPClient from deno-smtp
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

    const port = parseInt(SMTP_PORT);
    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port,
        tls: false,
        auth: {
          username: SMTP_USER,
          password: SMTP_PASS,
        },
      },
    });

    const htmlBody = `
      <div style="font-family: 'Manrope', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #FF0000; border-bottom: 2px solid #FF0000; padding-bottom: 10px;">
          New Contact Form Submission
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 10px; font-weight: bold; color: #333; width: 120px; vertical-align: top;">Name:</td>
            <td style="padding: 10px; color: #555;">${name.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 10px; font-weight: bold; color: #333; vertical-align: top;">Email:</td>
            <td style="padding: 10px; color: #555;">
              <a href="mailto:${email.replace(/"/g, '&quot;')}" style="color: #FF0000;">${email.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; color: #333; vertical-align: top;">Subject:</td>
            <td style="padding: 10px; color: #555;">${subject.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 10px; font-weight: bold; color: #333; vertical-align: top;">Question:</td>
            <td style="padding: 10px; color: #555; white-space: pre-wrap;">${question.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; font-size: 12px; color: #999;">
          Sent from Eagle Amsterdam PWA Contact Form
        </p>
      </div>
    `;

    await client.send({
      from: SMTP_FROM,
      to: "eagleamsterdam@me.com",
      subject: `[Eagle Contact] ${subject}`,
      content: "auto",
      html: htmlBody,
      replyTo: email,
    });

    await client.close();

    console.log('Contact email sent successfully');
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending contact email:', error);
    const msg = error instanceof Error ? error.message : 'Failed to send email';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
