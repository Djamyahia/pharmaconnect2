-- Add custom_total_price column to promotional_offers table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'promotional_offers' 
    AND column_name = 'custom_total_price'
  ) THEN
    ALTER TABLE promotional_offers 
    ADD COLUMN custom_total_price numeric(10,2);
  END IF;
END $$;

-- Drop existing view if it exists
DROP VIEW IF EXISTS active_offers_view;

-- Create view for active offers with products
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