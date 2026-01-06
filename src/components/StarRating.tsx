import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

const gapClasses = {
  sm: "gap-1",
  md: "gap-1.5",
  lg: "gap-2",
};

export function StarRating({ 
  rating, 
  onRatingChange, 
  readonly = false,
  size = "md" 
}: StarRatingProps) {
  const handleClick = (index: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(index + 1);
    }
  };

  return (
    <div className={cn("flex items-center", gapClasses[size])}>
      {[0, 1, 2, 3, 4].map((index) => {
        const isFilled = index < rating;
        return (
          <button
            key={index}
            type="button"
            onClick={() => handleClick(index)}
            disabled={readonly}
            className={cn(
              "transition-all duration-150",
              !readonly && "hover:scale-110 cursor-pointer",
              readonly && "cursor-default"
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors duration-150",
                isFilled 
                  ? "fill-warning text-warning" 
                  : "fill-transparent text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
