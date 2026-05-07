-- Allow 0.5 as minimum rating (left half of first star)
-- Previous constraint mistakenly set minimum to 1.0

ALTER TABLE media_items
  DROP CONSTRAINT IF EXISTS media_items_rating_check;

ALTER TABLE media_items
  ADD CONSTRAINT media_items_rating_check
    CHECK (rating >= 0.5 AND rating <= 10.0);
