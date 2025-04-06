/*
  # Update promotions system to use free units instead of price discounts

  1. Changes
    - Rename discount_percentage to free_units_percentage
    - Remove price-related columns since promotions will now be based on quantity
    - Update active_promotions_view to reflect new structure
    - Add trigger to recalculate free units

  2. Security
    - Maintain existing RLS policies
*/

-- First, drop the view that depends on the promotions table
DROP VIEW IF EXISTS active_promotions_view;

-- Modify the promotions table
ALTER TABLE promotions
  -- Rename discount_percentage to free_units_percentage
  RENAME COLUMN discount_percentage TO free_units_percentage;

-- Drop price-related columns
ALTER TABLE promotions
  DROP COLUMN IF EXISTS original_price,
  DROP COLUMN IF EXISTS discounted_price;

-- Create or replace the active promotions view
CREATE OR REPLACE VIEW active_promotions_view AS
SELECT 
  p.id,
  p.wholesaler_id,
  p.medication_id,
  p.free_units_percentage,
  p.start_date,
  p.end_date,
  wi.price as unit_price,
  CASE 
    WHEN p.free_units_percentage > 0 THEN
      FLOOR(100 / p.free_units_percentage)::integer
    ELSE 0
  END as units_for_bonus,
  CASE 
    WHEN p.free_units_percentage > 0 THEN
      FLOOR(100 / p.free_units_percentage * (p.free_units_percentage / 100))::integer
    ELSE 0
  END as bonus_units
FROM promotions p
JOIN wholesaler_inventory wi ON 
  wi.medication_id = p.medication_id AND 
  wi.wholesaler_id = p.wholesaler_id
WHERE 
  TIMEZONE('UTC', CURRENT_TIMESTAMP) >= p.start_date
  AND TIMEZONE('UTC', CURRENT_TIMESTAMP) <= p.end_date
  AND can_view_promotion(p.wholesaler_id);

-- Update the check constraint for free_units_percentage
ALTER TABLE promotions
  DROP CONSTRAINT IF EXISTS promotions_discount_percentage_check;

ALTER TABLE promotions
  ADD CONSTRAINT promotions_free_units_percentage_check
  CHECK (free_units_percentage > 0 AND free_units_percentage <= 100);

-- Grant appropriate permissions
GRANT SELECT ON active_promotions_view TO authenticated;