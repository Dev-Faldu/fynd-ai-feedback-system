import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { ReviewCard } from "@/components/ReviewCard";
import { StatsCards } from "@/components/StatsCards";
import { RatingFilter } from "@/components/RatingFilter";
import { fetchReviews, subscribeToReviews } from "@/lib/api";
import { Review } from "@/types/review";
import { RefreshCw, Inbox, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadReviews = useCallback(async () => {
    setError(null);
    const result = await fetchReviews();
    
    if (result.success && result.data) {
      setReviews(result.data);
    } else {
      setError(result.error || "Failed to load reviews");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadReviews();
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToReviews((newReview) => {
      setReviews((prev) => [newReview, ...prev]);
      toast({
        title: "New review received!",
        description: `${newReview.rating}-star review submitted`,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [loadReviews, toast]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadReviews();
    setIsRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Reviews have been updated.",
    });
  };

  const filteredReviews = selectedRating 
    ? reviews.filter(r => r.rating === selectedRating)
    : reviews;

  const reviewCounts = reviews.reduce((acc, r) => {
    acc[r.rating] = (acc[r.rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor customer feedback and AI-generated insights
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 rounded-lg border border-destructive/50 bg-destructive/10 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Failed to load reviews</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-auto">
              Retry
            </Button>
          </div>
        )}

        {/* Stats Overview */}
        <div className="mb-8">
          <StatsCards reviews={reviews} />
        </div>

        {/* Filters & Reviews List */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold">Recent Submissions</h2>
            <RatingFilter 
              selectedRating={selectedRating}
              onRatingChange={setSelectedRating}
              reviewCounts={reviewCounts}
            />
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin mb-4" />
              <p className="text-muted-foreground">Loading reviews...</p>
            </div>
          ) : filteredReviews.length > 0 ? (
            <div className="grid gap-4">
              {filteredReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No reviews yet</h3>
              <p className="text-muted-foreground max-w-sm">
                {selectedRating 
                  ? `No ${selectedRating}-star reviews found. Try a different filter.`
                  : "Submitted reviews will appear here in real-time."}
              </p>
            </div>
          )}
        </div>

        {/* Real-time indicator */}
        <div className="fixed bottom-4 right-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border text-xs text-muted-foreground shadow-card">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Live updates enabled
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
