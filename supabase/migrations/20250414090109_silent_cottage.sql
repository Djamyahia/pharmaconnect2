/*
  # Remove manufacturer column from parapharmacy products

  1. Changes
    - First drop the search vector that depends on the manufacturer column
    - Then safely remove the manufacturer column
    - Finally recreate the search vector without the manufacturer field

  2. Implementation
    - Use CASCADE to handle dependencies properly
    - Recreate search vector with remaining fields
*/

-- First drop the search vector column since it depends on manufacturer
ALTER TABLE parapharmacy_products 
DROP COLUMN IF EXISTS search_vector;

-- Now we can safely remove the manufacturer column
ALTER TABLE parapharmacy_products
DROP COLUMN IF EXISTS manufacturer;

-- Finally, recreate the search vector without manufacturer
ALTER TABLE parapharmacy_products 
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('french', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('french', coalesce(brand, '')), 'B') ||
  setweight(to_tsvector('french', coalesce(description, '')), 'C')
) STORED;