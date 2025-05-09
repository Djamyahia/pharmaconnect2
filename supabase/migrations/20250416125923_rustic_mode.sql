/*
  # Fix promotions view relationships

  1. Changes
    - Drop existing active_promotions_view
    - Create new active_promotions_view with proper relationships
    - Add proper column definitions to support both medications and parapharmacy products

  2. Security
    - Maintain existing RLS policies
*/

DROP VIEW IF EXISTS active_promotions_view;

CREATE VIEW active_promotions_view AS
SELECT 
  p.id,
  p.wholesaler_id,
  p.medication_id,
  p.product_id,
  p.free_units_percentage,
  p.start_date,
  p.end_date,
  p.expiry_date,
  p.created_at
FROM promotions p
WHERE 
  p.start_date <= CURRENT_TIMESTAMP 
  AND p.end_date >= CURRENT_TIMESTAMP
  AND (p.expiry_date IS NULL OR p.expiry_date > CURRENT_DATE);

-- Grant permissions to authenticated users
GRANT SELECT ON active_promotions_view TO authenticated;