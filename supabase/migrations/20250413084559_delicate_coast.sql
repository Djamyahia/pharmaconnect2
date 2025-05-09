/*
  # Add brand and manufacturer columns to parapharmacy products

  1. Changes
    - Add brand column to parapharmacy_products table
    - Add manufacturer column to parapharmacy_products table
    - Update search vector to include brand and manufacturer
    - Add these fields to the search index

  2. Security
    - Maintain existing RLS policies
*/

-- Add brand and manufacturer columns
ALTER TABLE parapharmacy_products
ADD COLUMN brand text,
ADD COLUMN manufacturer text;

-- Update search vector to include brand and manufacturer
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