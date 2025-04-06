/*
  # Add Original Price and Active Promotions View

  1. Changes
    - Add original_price column to promotions table
    - Create materialized view for active promotions with calculated prices
    - Add security through view access policies

  2. Security
    - Implement security through view access functions
    - Ensure proper access control for different user roles
*/

-- Add original_price column to promotions with a default value
ALTER TABLE promotions
ADD COLUMN IF NOT EXISTS original_price decimal(10,2) DEFAULT 0;

-- Update existing promotions to get price from inventory
DO $$
BEGIN
  UPDATE promotions p
  SET original_price = wi.price
  FROM wholesaler_inventory wi
  WHERE p.medication_id = wi.medication_id
    AND p.wholesaler_id = wi.wholesaler_id
    AND p.original_price = 0;
END $$;

-- Now make the column NOT NULL after populating data
ALTER TABLE promotions
ALTER COLUMN original_price SET NOT NULL;

-- Create a secure function to check if a user can access promotion data
CREATE OR REPLACE FUNCTION can_view_promotion(promotion_wholesaler_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow access if user is the wholesaler who created the promotion
  IF EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'wholesaler'
    AND id = promotion_wholesaler_id
  ) THEN
    RETURN true;
  END IF;

  -- Allow access if user is a pharmacist
  IF EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'pharmacist'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Create a secure view for active promotions
CREATE OR REPLACE VIEW active_promotions_view AS
SELECT 
  p.id,
  p.wholesaler_id,
  p.medication_id,
  p.discount_percentage,
  p.original_price,
  p.original_price * (1 - p.discount_percentage / 100) as discounted_price,
  p.start_date,
  p.end_date
FROM promotions p
WHERE 
  CURRENT_TIMESTAMP BETWEEN p.start_date AND p.end_date
  AND can_view_promotion(p.wholesaler_id);

-- Grant appropriate permissions
GRANT SELECT ON active_promotions_view TO authenticated;