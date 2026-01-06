import { Review } from "@/types/review";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, MessageSquare, Star, AlertTriangle, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardsProps {
  reviews: Review[];
}

export function StatsCards({ reviews }: StatsCardsProps) {
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews 
    : 0;
  
  const positiveCount = reviews.filter(r => r.rating >= 4).length;
  const negativeCount = reviews.filter(r => r.rating <= 2).length;
  
  const positivePercentage = totalReviews > 0 
    ? Math.round((positiveCount / totalReviews) * 100) 
    : 0;

  const stats = [
    {
      label: "Total Reviews",
      value: totalReviews,
      icon: MessageSquare,
      trend: null,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      label: "Average Rating",
      value: averageRating.toFixed(1),
      icon: Star,
      trend: averageRating >= 3.5 ? "up" : averageRating < 2.5 ? "down" : null,
      color: averageRating >= 3.5 ? "text-success" : averageRating < 2.5 ? "text-destructive" : "text-warning",
      bgColor: averageRating >= 3.5 ? "bg-success/10" : averageRating < 2.5 ? "bg-destructive/10" : "bg-warning/10",
    },
    {
      label: "Positive Reviews",
      value: `${positivePercentage}%`,
      subValue: `(${positiveCount})`,
      icon: ThumbsUp,
      trend: positivePercentage >= 60 ? "up" : null,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Needs Attention",
      value: negativeCount,
      icon: AlertTriangle,
      trend: negativeCount > 0 ? "down" : null,
      color: negativeCount > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: negativeCount > 0 ? "bg-destructive/10" : "bg-muted",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="hover:shadow-elevated transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                  {stat.subValue && (
                    <span className="text-sm text-muted-foreground">{stat.subValue}</span>
                  )}
                </div>
              </div>
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg",
                stat.bgColor
              )}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
            </div>
            {stat.trend && (
              <div className="mt-2 flex items-center gap-1">
                {stat.trend === "up" ? (
                  <TrendingUp className="w-3.5 h-3.5 text-success" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                )}
                <span className={cn(
                  "text-xs font-medium",
                  stat.trend === "up" ? "text-success" : "text-destructive"
                )}>
                  {stat.trend === "up" ? "Good" : "Review needed"}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
