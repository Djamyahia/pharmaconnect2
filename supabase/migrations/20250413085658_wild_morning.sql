/*
  # Update parapharmacy products to handle image uploads

  1. Changes
    - Add image_data column to store base64 encoded images
    - Remove image_url column as it's no longer needed
    - Update search vector to exclude image-related columns
*/

-- First remove the image_url column
ALTER TABLE parapharmacy_products
DROP COLUMN IF EXISTS image_url;

-- Add image_data column for storing base64 encoded images
ALTER TABLE parapharmacy_products
ADD COLUMN image_data text;

-- Update search vector to exclude image data
DROP TRIGGER IF EXISTS update_parapharmacy_products_search_vector ON parapharmacy_products;

ALTER TABLE parapharmacy_products 
  DROP COLUMN IF EXISTS search_vector;

ALTER TABLE parapharmacy_products 
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('french', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(brand, '')), 'B') ||
    setweight(to_tsvector('french', coalesce(manufacturer, '')), 'B') ||
    setweight(to_tsvector('french', coalesce(description, '')), 'C')
  ) STORED;