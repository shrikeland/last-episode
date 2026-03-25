-- Add 'animation' as a valid media type (animated films like Zootopia)
ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_type_check;
ALTER TABLE media_items ADD CONSTRAINT media_items_type_check
  CHECK (type IN ('movie', 'animation', 'tv', 'anime'));