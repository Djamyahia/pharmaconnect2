/*
  # Add metadata column to orders table

  1. Changes
    - Add metadata column to orders table to store additional order information
    - This column will be used to store data related to special offers and other order metadata
    - The column is of type jsonb to allow flexible storage of structured data

  2. Security
    - Maintain existing RLS policies
*/

-- Add metadata column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Update active_offers_view to include the metadata column
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

-- Grant appropriate permissions
GRANT SELECT ON active_offers_view TO public;