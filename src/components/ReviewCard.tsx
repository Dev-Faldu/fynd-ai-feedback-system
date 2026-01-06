import { Review } from "@/types/review";
import { RatingBadge } from "./RatingBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MessageSquare, Lightbulb, Clock, FileText } from "lucide-react";
import { format } from "date-fns";

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Card className="animate-fade-in hover:shadow-elevated transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <RatingBadge rating={review.rating} showLabel />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {format(new Date(review.createdAt), "MMM d, yyyy · h:mm a")}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* User Review */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <MessageSquare className="w-3.5 h-3.5" />
            Customer Review
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            {review.review || <span className="italic text-muted-foreground">No review text provided</span>}
          </p>
        </div>

        {/* AI Summary */}
        <div className="space-y-1.5 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <FileText className="w-3.5 h-3.5" />
            AI Summary
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            {review.aiSummary}
          </p>
        </div>

        {/* Recommended Action */}
        <div className="space-y-1.5 p-3 rounded-lg border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 text-xs font-medium text-primary uppercase tracking-wide">
            <Lightbulb className="w-3.5 h-3.5" />
            Recommended Action
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            {review.aiRecommendedAction}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
