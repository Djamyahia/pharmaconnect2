-- Update the active promotions view to remove unit calculations
DROP VIEW IF EXISTS active_promotions_view;

CREATE OR REPLACE VIEW active_promotions_view AS
SELECT 
  p.id,
  p.wholesaler_id,
  p.medication_id,
  p.free_units_percentage,
  p.start_date,
  p.end_date
FROM promotions p
WHERE 
  TIMEZONE('UTC', CURRENT_TIMESTAMP) >= p.start_date
  AND TIMEZONE('UTC', CURRENT_TIMESTAMP) <= p.end_date
  AND can_view_promotion(p.wholesaler_id);

-- Grant appropriate permissions
GRANT SELECT ON active_promotions_view TO authenticated;