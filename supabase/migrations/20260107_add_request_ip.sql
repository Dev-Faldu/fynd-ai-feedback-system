-- Add request_ip column to reviews for basic rate limiting and audit
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS request_ip TEXT;

CREATE INDEX IF NOT EXISTS idx_reviews_request_ip ON public.reviews(request_ip);

-- (Optional) Keep existing permissive INSERT policy; request_ip is recorded by server-side functions.
