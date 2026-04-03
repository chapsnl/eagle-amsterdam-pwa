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
    const { adminUserId, action, ticket } = await req.json();

    if (!adminUserId) {
      return new Response(
        JSON.stringify({ success: false, error: "adminUserId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: adminUserId });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: "Access denied." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: list — get all tickets (including inactive)
    if (action === "list") {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, tickets: data ?? [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: update — update a ticket
    if (action === "update" && ticket?.id) {
      const updates: Record<string, unknown> = {};
      if (ticket.name !== undefined) updates.name = ticket.name;
      if (ticket.type !== undefined) updates.type = ticket.type;
      if (ticket.url !== undefined) updates.url = ticket.url;
      if (ticket.popup_message !== undefined) updates.popup_message = ticket.popup_message;
      if (ticket.display_order !== undefined) updates.display_order = ticket.display_order;
      if (ticket.active !== undefined) updates.active = ticket.active;

      const { error } = await supabase
        .from("tickets")
        .update(updates)
        .eq("id", ticket.id);

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: swap-order — swap display_order of two tickets
    if (action === "swap-order" && ticket?.id1 && ticket?.id2) {
      const { data: t1 } = await supabase.from("tickets").select("display_order").eq("id", ticket.id1).single();
      const { data: t2 } = await supabase.from("tickets").select("display_order").eq("id", ticket.id2).single();

      if (t1 && t2) {
        await supabase.from("tickets").update({ display_order: t2.display_order }).eq("id", ticket.id1);
        await supabase.from("tickets").update({ display_order: t1.display_order }).eq("id", ticket.id2);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
