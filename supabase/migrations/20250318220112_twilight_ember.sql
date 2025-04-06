/*
  # Fix promotions status check

  1. Changes
    - Update active_promotions_view to handle timezone comparisons correctly
    - Use TIMEZONE('UTC', CURRENT_TIMESTAMP) for consistent timezone handling
    - Add explicit timezone conversion for date comparisons
*/

-- Drop the existing view
DROP VIEW IF EXISTS active_promotions_view;

-- Recreate the view with proper timezone handling
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
  TIMEZONE('UTC', CURRENT_TIMESTAMP) >= p.start_date
  AND TIMEZONE('UTC', CURRENT_TIMESTAMP) <= p.end_date
  AND can_view_promotion(p.wholesaler_id);

-- Grant appropriate permissions
GRANT SELECT ON active_promotions_view TO authenticated;