/*
  # Add free text products to promotional offers

  1. Changes
    - Add free_text_products column to promotional_offers table
      - Allows storing additional product descriptions as text
    - Update active_offers_view to include the new field

  2. Security
    - Maintain existing RLS policies
*/

-- Add free_text_products column to promotional_offers table
ALTER TABLE promotional_offers
ADD COLUMN IF NOT EXISTS free_text_products text;

-- Drop and recreate view to include new column
DROP VIEW IF EXISTS active_offers_view;

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