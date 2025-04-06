/*
  # Add inventory management features

  1. Functions
    - `update_inventory_quantity` - Function to update inventory quantities when orders are accepted

  2. Indexes
    - Add indexes for faster searches on medications table
    - Add full-text search capabilities
*/

-- Create function to update inventory quantities
CREATE OR REPLACE FUNCTION update_inventory_quantity(
  p_wholesaler_id uuid,
  p_medication_id uuid,
  p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE wholesaler_inventory
  SET quantity = quantity - p_quantity
  WHERE wholesaler_id = p_wholesaler_id
    AND medication_id = p_medication_id;
END;
$$;

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_medications_commercial_name 
  ON medications(commercial_name);

CREATE INDEX IF NOT EXISTS idx_medications_category
  ON medications(category);

-- Add text search capabilities
ALTER TABLE medications 
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(commercial_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(scientific_name, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS medications_search_idx 
  ON medications USING gin(search_vector);