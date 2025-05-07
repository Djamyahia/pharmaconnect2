/*
  # Add quota and free units fields to offers system

  1. Changes
    - Add max_quota_selections column to promotional_offers table
    - Add free_units_enabled column to promotional_offers table
    - Add is_quota column to offer_products table
    - Add free_units_percentage column to offer_products table
    - Update active_offers_view to include new fields

  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to the promotional_offers table
ALTER TABLE promotional_offers
ADD COLUMN IF NOT EXISTS max_quota_selections integer,
ADD COLUMN IF NOT EXISTS free_units_enabled boolean DEFAULT false;

-- Add new columns to the offer_products table
ALTER TABLE offer_products
ADD COLUMN IF NOT EXISTS is_quota boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS free_units_percentage numeric(5,2);

-- Drop existing view
DROP VIEW IF EXISTS active_offers_view;

-- Recreate view with new fields
CREATE VIEW active_offers_view AS
SELECT 
  o.*,
  json_agg(
    json_build_object(
      'id', p.id,
      'medication_id', p.medication_id,
      'quantity', p.quantity,
      'price', p.price,
      'is_priority', p.is_priority,
      'priority_message', p.priority_message,
      'is_quota', p.is_quota,
      'free_units_percentage', p.free_units_percentage,
      'medication', m.*
    )
  ) as products
FROM promotional_offers o
JOIN offer_products p ON p.offer_id = o.id
JOIN medications m ON m.id = p.medication_id
WHERE CURRENT_TIMESTAMP BETWEEN o.start_date AND o.end_date
GROUP BY o.id;

-- Grant appropriate permissions
GRANT SELECT ON active_offers_view TO public;

-- Add 'quota' as a valid type for promotional_offers
ALTER TABLE promotional_offers
DROP CONSTRAINT IF EXISTS promotional_offers_type_check;

ALTER TABLE promotional_offers
ADD CONSTRAINT promotional_offers_type_check
CHECK (type IN ('pack', 'threshold', 'quota'));

-- Update the check constraint for promotional_offers
ALTER TABLE promotional_offers
DROP CONSTRAINT IF EXISTS promotional_offers_check1;

ALTER TABLE promotional_offers
ADD CONSTRAINT promotional_offers_check1
CHECK (
  (type = 'threshold' AND min_purchase_amount IS NOT NULL AND min_purchase_amount > 0) OR
  (type = 'pack' AND min_purchase_amount IS NULL) OR
  (type = 'quota' AND max_quota_selections IS NOT NULL AND max_quota_selections > 0)
);