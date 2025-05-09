/*
  # Add price column to promotions table

  1. Changes
    - Add price column to promotions table
    - Update price when creating/updating promotions
    - Update active_promotions_view to include price
    - Add trigger to automatically set price from inventory

  2. Security
    - Maintain existing RLS policies
*/

-- Add price column to promotions table
ALTER TABLE promotions
ADD COLUMN price numeric(10,2);

-- Create function to get current price from inventory
CREATE OR REPLACE FUNCTION get_medication_price(
  p_medication_id uuid,
  p_wholesaler_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_price numeric;
BEGIN
  SELECT price INTO v_price
  FROM wholesaler_inventory
  WHERE medication_id = p_medication_id
  AND wholesaler_id = p_wholesaler_id;
  
  RETURN v_price;
END;
$$;

-- Create trigger function to set price from inventory
CREATE OR REPLACE FUNCTION set_promotion_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get current price from inventory
  NEW.price := get_medication_price(NEW.medication_id, NEW.wholesaler_id);
  
  IF NEW.price IS NULL THEN
    RAISE EXCEPTION 'No price found in inventory for this medication';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically set price
CREATE TRIGGER set_promotion_price_trigger
  BEFORE INSERT OR UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION set_promotion_price();

-- Update existing promotions with current prices
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, medication_id, wholesaler_id FROM promotions
  LOOP
    UPDATE promotions
    SET price = get_medication_price(r.medication_id, r.wholesaler_id)
    WHERE id = r.id;
  END LOOP;
END $$;

-- Drop existing view
DROP VIEW IF EXISTS active_promotions_view;

-- Recreate view with price
CREATE OR REPLACE VIEW active_promotions_view AS
SELECT 
  p.id,
  p.wholesaler_id,
  p.medication_id,
  p.free_units_percentage,
  p.start_date,
  p.end_date,
  p.price
FROM promotions p
WHERE 
  TIMEZONE('UTC', CURRENT_TIMESTAMP) >= p.start_date
  AND TIMEZONE('UTC', CURRENT_TIMESTAMP) <= p.end_date
  AND can_view_promotion(p.wholesaler_id);

-- Grant appropriate permissions
GRANT SELECT ON active_promotions_view TO authenticated;