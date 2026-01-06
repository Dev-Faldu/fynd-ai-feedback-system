import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface RatingFilterProps {
  selectedRating: number | null;
  onRatingChange: (rating: number | null) => void;
  reviewCounts: Record<number, number>;
}

export function RatingFilter({ selectedRating, onRatingChange, reviewCounts }: RatingFilterProps) {
  const ratings = [5, 4, 3, 2, 1];
  const total = Object.values(reviewCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onRatingChange(null)}
        className={cn(
          "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
          selectedRating === null
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        All ({total})
      </button>
      
      {ratings.map((rating) => {
        const count = reviewCounts[rating] || 0;
        const isSelected = selectedRating === rating;
        
        return (
          <button
            key={rating}
            onClick={() => onRatingChange(isSelected ? null : rating)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <Star className={cn(
              "w-3.5 h-3.5",
              isSelected ? "fill-current" : "fill-current"
            )} />
            {rating}
            <span className="text-xs opacity-70">({count})</span>
          </button>
        );
      })}
    </div>
  );
}
