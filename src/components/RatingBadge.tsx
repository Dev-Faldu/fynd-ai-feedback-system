import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface RatingBadgeProps {
  rating: number;
  showLabel?: boolean;
}

const ratingConfig: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "bg-rating-1", text: "text-white", label: "Very Poor" },
  2: { bg: "bg-rating-2", text: "text-white", label: "Poor" },
  3: { bg: "bg-rating-3", text: "text-white", label: "Average" },
  4: { bg: "bg-rating-4", text: "text-white", label: "Good" },
  5: { bg: "bg-rating-5", text: "text-white", label: "Excellent" },
};

export function RatingBadge({ rating, showLabel = false }: RatingBadgeProps) {
  const config = ratingConfig[rating] || ratingConfig[3];

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium",
      config.bg,
      config.text
    )}>
      <Star className="w-3.5 h-3.5 fill-current" />
      <span>{rating}</span>
      {showLabel && (
        <span className="text-xs opacity-90">· {config.label}</span>
      )}
    </div>
  );
}
