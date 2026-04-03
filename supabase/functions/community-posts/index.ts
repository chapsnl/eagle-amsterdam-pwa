import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // GET posts
    if (action === "list") {
      // Delete posts older than 14 days with no replies
      const fourteenDaysAgo = new Date(
        Date.now() - 14 * 24 * 60 * 60 * 1000
      ).toISOString();

      // Find top-level posts older than 14 days
      const { data: oldPosts } = await supabaseAdmin
        .from("community_posts")
        .select("id")
        .is("parent_id", null)
        .lt("created_at", fourteenDaysAgo);

      if (oldPosts && oldPosts.length > 0) {
        for (const post of oldPosts) {
          // Check if it has replies
          const { count } = await supabaseAdmin
            .from("community_posts")
            .select("id", { count: "exact", head: true })
            .eq("parent_id", post.id);

          if (!count || count === 0) {
            await supabaseAdmin
              .from("community_posts")
              .delete()
              .eq("id", post.id);
          }
        }
      }

      // Fetch all posts (top-level + replies), newest first
      const { data: posts, error } = await supabaseAdmin
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, posts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE post
    if (action === "create") {
      const { nickname, topic, content, parentId } = body;

      if (!nickname || !topic || !content) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (content.split("\n").length > 5 || content.length > 500) {
        return new Response(
          JSON.stringify({ error: "Content exceeds maximum length" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: post, error } = await supabaseAdmin
        .from("community_posts")
        .insert({
          user_id: user.id,
          parent_id: parentId || null,
          nickname: nickname.slice(0, 30),
          topic: topic.slice(0, 100),
          content: content.slice(0, 500),
        })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, post }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
