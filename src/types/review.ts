export interface Review {
  id: string;
  rating: number;
  review: string;
  aiResponse: string;
  aiSummary: string;
  aiRecommendedAction: string;
  createdAt: string;
}

export interface ReviewSubmission {
  rating: number;
  review: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    count: number;
    limit: number;
    offset: number;
  };
}
