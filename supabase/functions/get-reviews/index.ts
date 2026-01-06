import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const allowedOrigin = allowed.length === 0 ? null : (allowed.includes(origin) ? origin : null);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (allowedOrigin) headers["Access-Control-Allow-Origin"] = allowedOrigin;
  return headers;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const corsHeaders = getCorsHeaders(req);

    // Parse query parameters
    const url = new URL(req.url);
    const ratingFilter = url.searchParams.get("rating");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    console.log(`Fetching reviews: rating=${ratingFilter}, limit=${limit}, offset=${offset}`);

    // Build query
    let query = supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply rating filter if specified
    if (ratingFilter && !isNaN(parseInt(ratingFilter))) {
      const rating = parseInt(ratingFilter);
      if (rating >= 1 && rating <= 5) {
        query = query.eq("rating", rating);
      }
    }

    const { data: reviews, error: dbError } = await query;

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to fetch reviews");
    }

    console.log(`Fetched ${reviews?.length || 0} reviews`);

    // Transform to consistent API format
    const formattedReviews = (reviews || []).map((r) => ({
      id: r.id,
      rating: r.rating,
      review: r.review_text,
      aiResponse: r.ai_response,
      aiSummary: r.ai_summary,
      aiRecommendedAction: r.ai_recommended_action,
      createdAt: r.created_at,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: formattedReviews,
        meta: {
          count: formattedReviews.length,
          limit,
          offset,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Fetch reviews error:", error);
    const corsHeaders = getCorsHeaders(req);

    return new Response(
      JSON.stringify({ error: "Failed to fetch reviews. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
