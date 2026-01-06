import { useState } from "react";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Send, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import { submitReview } from "@/lib/api";
import { Review } from "@/types/review";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ReviewFormProps {
  onSubmitSuccess?: (review: Review) => void;
}

export function ReviewForm({ onSubmitSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a star rating before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setAiResponse(null);
    setIsSuccess(false);

    const result = await submitReview({
      rating,
      review: reviewText.trim(),
    });

    setIsSubmitting(false);

    if (result.success && result.data) {
      setAiResponse(result.data.aiResponse);
      setIsSuccess(true);
      onSubmitSuccess?.(result.data);
      toast({
        title: "Feedback submitted!",
        description: "Thank you for sharing your experience with us.",
      });
    } else {
      toast({
        title: "Submission failed",
        description: result.error || "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setRating(0);
    setReviewText("");
    setAiResponse(null);
    setIsSuccess(false);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-semibold">Share Your Feedback</CardTitle>
          <CardDescription className="text-base">
            Your experience matters to us. Help us improve!
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                How would you rate your experience?
              </Label>
              <div className="flex justify-center py-4">
                <StarRating 
                  rating={rating} 
                  onRatingChange={setRating}
                  size="lg"
                />
              </div>
              {rating > 0 && (
                <p className="text-center text-sm text-muted-foreground animate-fade-in">
                  {rating === 1 && "We're sorry to hear that. Please tell us more."}
                  {rating === 2 && "We'd love to know how we can do better."}
                  {rating === 3 && "Thanks! Any specific feedback?"}
                  {rating === 4 && "Great! What made your experience good?"}
                  {rating === 5 && "Wonderful! We're thrilled you loved it!"}
                </p>
              )}
            </div>

            {/* Review Text */}
            <div className="space-y-2">
              <Label htmlFor="review" className="text-sm font-medium">
                Tell us more (optional)
              </Label>
              <Textarea
                id="review"
                placeholder="Share details about your experience..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="min-h-[120px] resize-none"
                maxLength={2000}
              />
              <div className="text-right text-xs text-muted-foreground">
                {reviewText.length}/2000
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={rating === 0 || isSubmitting || isSuccess}
              className="w-full h-12 text-base font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing with AI...
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Submitted Successfully
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* AI Response Card */}
      {aiResponse && (
        <Card className={cn(
          "animate-slide-up border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
        )}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-lg">Thank You!</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed">{aiResponse}</p>
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="mt-4"
            >
              Submit Another Review
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
