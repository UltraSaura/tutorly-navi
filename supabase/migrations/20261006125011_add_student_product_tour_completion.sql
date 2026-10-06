-- Persist the student product-tour state on the existing user profile.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS product_tour_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.product_tour_completed_at IS
  'When the student first completed or skipped the guided product tour.';
