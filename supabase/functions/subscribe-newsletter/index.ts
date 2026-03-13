const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SENDER_API_TOKEN = Deno.env.get('SENDER_API_TOKEN');
    if (!SENDER_API_TOKEN) throw new Error('SENDER_API_TOKEN is not configured');

    const SENDER_GROUP_ID = Deno.env.get('SENDER_GROUP_ID');
    if (!SENDER_GROUP_ID) throw new Error('SENDER_GROUP_ID is not configured');

    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add subscriber to Sender.net
    const response = await fetch('https://api.sender.net/v2/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDER_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        groups: [SENDER_GROUP_ID],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Sender.net error:', JSON.stringify(data));
      throw new Error(`Sender.net API failed [${response.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error subscribing:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
