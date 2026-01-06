import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const allowedOrigin = allowed.length === 0 ? null : (allowed.includes(origin) ? origin : null);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (allowedOrigin) headers["Access-Control-Allow-Origin"] = allowedOrigin;
  return headers;
}

// Prompts for AI generation - centralized for maintainability
const PROMPTS = {
  userResponse: (rating: number, reviewText: string) => `
You are a professional customer service representative for a business. Generate a warm, personalized response to a customer who left a ${rating}-star review.

Customer's review: "${reviewText || 'No text provided'}"

Guidelines based on rating:
- 1-2 stars: Apologetic, empathetic, offer to make things right, express genuine concern
- 3 stars: Balanced acknowledgment, thank for feedback, express commitment to improvement
- 4-5 stars: Grateful, enthusiastic, express appreciation, invite them back

Keep the response:
- Between 2-4 sentences
- Professional but warm
- Specific to their feedback if they provided details
- Action-oriented for negative reviews

Respond with ONLY the customer-facing message, no JSON or metadata.`,

  adminSummary: (rating: number, reviewText: string) => `
Analyze this customer feedback and provide a brief operational summary for internal use.

Rating: ${rating}/5 stars
Review: "${reviewText || 'No text provided'}"

Provide a 1-2 sentence summary that includes:
- Sentiment assessment (positive/negative/neutral/mixed)
- Key concerns or praise points
- Review detail level (brief/detailed)

Format: Plain text summary only, no JSON.`,

  recommendedAction: (rating: number, reviewText: string) => `
Based on this customer feedback, recommend the most appropriate follow-up action.

Rating: ${rating}/5 stars
Review: "${reviewText || 'No text provided'}"

Provide a specific, actionable recommendation based on:
- 1-2 stars: Urgent recovery actions (escalation, outreach, compensation consideration)
- 3 stars: Standard follow-up (feedback collection, monitoring)
- 4-5 stars: Retention actions (loyalty programs, testimonial requests, referral opportunities)

Format: Single action recommendation, 1-2 sentences, plain text only.`
};

async function callLovableAI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a helpful AI assistant for customer feedback analysis. Always respond concisely and professionally." },
        { role: "user", content: prompt }
      ],
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI Gateway error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("RATE_LIMITED");
    }
    if (response.status === 402) {
      throw new Error("PAYMENT_REQUIRED");
    }
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { rating, review } = await req.json();

    // Build CORS headers for responses
    const corsHeaders = getCorsHeaders(req);

    // Input validation: rating
    if (typeof rating !== "number" || !Number.isFinite(rating) || rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ error: "Invalid rating. Must be a number between 1 and 5." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize and limit review text (strip scripts and HTML tags)
    function sanitizeReview(input: unknown) {
      if (typeof input !== "string") return "";
      let s = input.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
      s = s.replace(/<[^>]*>/g, "");
      // Remove control characters without using control-character regex literals
      s = Array.from(s).filter((ch) => {
        const code = ch.charCodeAt(0);
        return code >= 32 && code !== 127;
      }).join("");
      return s.trim().slice(0, 2000);
    }

    const reviewText = sanitizeReview(review);

    console.log(`Processing review: rating=${rating}, reviewLength=${reviewText.length}`);

    // Generate all AI responses in parallel
    const [aiResponse, aiSummary, aiRecommendedAction] = await Promise.all([
      callLovableAI(PROMPTS.userResponse(rating, reviewText), LOVABLE_API_KEY),
      callLovableAI(PROMPTS.adminSummary(rating, reviewText), LOVABLE_API_KEY),
      callLovableAI(PROMPTS.recommendedAction(rating, reviewText), LOVABLE_API_KEY),
    ]);

    console.log("AI responses generated successfully");

    // Determine client IP for basic rate limiting
    function getClientIP(req: Request) {
      const fwd = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
      if (fwd) return fwd.split(",")[0].trim();
      return "unknown";
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Simple DB-backed rate limiting: max submissions per IP per hour
    const ip = getClientIP(req);
    try {
      const since = new Date(Date.now() - (Number(Deno.env.get("RATE_LIMIT_WINDOW_MINUTES") || "60") * 60 * 1000)).toISOString();
      const maxPerWindow = Number(Deno.env.get("RATE_LIMIT_MAX_PER_WINDOW") || "10");

      const countResp = await supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since)
        .eq("request_ip", ip as string);

      const recentCount = (countResp.count ?? 0) as number;
      if (recentCount >= maxPerWindow) {
        return new Response(
          JSON.stringify({ error: "Too many submissions from this IP. Try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (e) {
      console.warn("Rate limit check failed, continuing:", e);
    }

    // Store in database
    const { data: insertedReview, error: dbError } = await supabase
      .from("reviews")
      .insert({
        rating,
        review_text: reviewText,
        ai_response: aiResponse,
        ai_summary: aiSummary,
        ai_recommended_action: aiRecommendedAction,
        request_ip: ip,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to save review");
    }

    console.log(`Review saved successfully: ${insertedReview.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: insertedReview.id,
          rating: insertedReview.rating,
          review: insertedReview.review_text,
          aiResponse: insertedReview.ai_response,
          aiSummary: insertedReview.ai_summary,
          aiRecommendedAction: insertedReview.ai_recommended_action,
          createdAt: insertedReview.created_at,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Submit review error:", error);

    const corsHeaders = getCorsHeaders(req);
    let status = 500;
    let message = "An error occurred processing your review. Please try again.";

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage === "RATE_LIMITED") {
      status = 429;
      message = "Service is temporarily busy. Please wait a moment and try again.";
    } else if (errorMessage === "PAYMENT_REQUIRED") {
      status = 402;
      message = "AI service quota exceeded. Please contact support.";
    }

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
