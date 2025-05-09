/*
  # Fix promotions view and add parapharmacy support

  1. Changes
    - Add product_id column to promotions table
    - Update promotions table to support both medications and parapharmacy products
    - Update active_promotions_view to include both types of promotions
    - Add check constraint to ensure either medication_id or product_id is set

  2. Security
    - Maintain existing RLS policies
*/

-- First, add product_id column to promotions table
ALTER TABLE promotions
ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES parapharmacy_products(id);

-- Add check constraint to ensure either medication_id or product_id is set
ALTER TABLE promotions
ADD CONSTRAINT promotions_product_check
CHECK (
  (medication_id IS NOT NULL AND product_id IS NULL) OR
  (product_id IS NOT NULL AND medication_id IS NULL)
);

-- Drop existing view
DROP VIEW IF EXISTS active_promotions_view;

-- Create new view with support for both types of promotions
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

-- Update existing RLS policies
DROP POLICY IF EXISTS "Wholesalers can manage their promotions" ON promotions;
CREATE POLICY "Wholesalers can manage their promotions"
  ON promotions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'wholesaler'
      AND id = promotions.wholesaler_id
    )
  );

DROP POLICY IF EXISTS "Pharmacists can view promotions" ON promotions;
CREATE POLICY "Pharmacists can view promotions"
  ON promotions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'pharmacist'
    )
  );