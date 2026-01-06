import { supabase } from "@/integrations/supabase/client";
import { Review, ReviewSubmission, ApiResponse } from "@/types/review";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function submitReview(submission: ReviewSubmission): Promise<ApiResponse<Review>> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/submit-review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submission),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Failed to submit review",
      };
    }

    return data;
  } catch (error) {
    console.error("Submit review error:", error);
    return {
      success: false,
      error: "Network error. Please check your connection and try again.",
    };
  }
}

export async function fetchReviews(ratingFilter?: number): Promise<ApiResponse<Review[]>> {
  try {
    let url = `${SUPABASE_URL}/functions/v1/get-reviews`;
    
    if (ratingFilter) {
      url += `?rating=${ratingFilter}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Failed to fetch reviews",
      };
    }

    return data;
  } catch (error) {
    console.error("Fetch reviews error:", error);
    return {
      success: false,
      error: "Network error. Please check your connection.",
    };
  }
}

// Subscribe to real-time updates
export function subscribeToReviews(callback: (review: Review) => void) {
  const channel = supabase
    .channel("reviews-realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "reviews",
      },
      (payload) => {
        type RawReview = {
          id: string;
          rating: number;
          review_text: string;
          ai_response: string;
          ai_summary: string;
          ai_recommended_action: string;
          created_at: string;
        };

        const newReview = payload.new as unknown as RawReview;
        callback({
          id: newReview.id,
          rating: newReview.rating,
          review: newReview.review_text,
          aiResponse: newReview.ai_response,
          aiSummary: newReview.ai_summary,
          aiRecommendedAction: newReview.ai_recommended_action,
          createdAt: newReview.created_at,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
