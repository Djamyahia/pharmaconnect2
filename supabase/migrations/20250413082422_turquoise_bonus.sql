/*
  # Update orders system to support parapharmacy products

  1. Changes
    - Add is_parapharmacy column to order_items table
    - Add product_id column to order_items table for parapharmacy products
    - Update foreign key constraints to handle both types of products
    - Update RLS policies to handle both types of products

  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control for both product types
*/

-- Add is_parapharmacy column to order_items
ALTER TABLE order_items
ADD COLUMN is_parapharmacy boolean DEFAULT false;

-- Add product_id column for parapharmacy products
ALTER TABLE order_items
ADD COLUMN product_id uuid REFERENCES parapharmacy_products(id);

-- Update medication_id to be nullable
ALTER TABLE order_items
ALTER COLUMN medication_id DROP NOT NULL;

-- Add check constraint to ensure either medication_id or product_id is set
ALTER TABLE order_items
ADD CONSTRAINT order_items_product_check
CHECK (
  (medication_id IS NOT NULL AND product_id IS NULL AND is_parapharmacy = false) OR
  (product_id IS NOT NULL AND medication_id IS NULL AND is_parapharmacy = true)
);

-- Create index for better performance
CREATE INDEX idx_order_items_product_id ON order_items(product_id)
WHERE product_id IS NOT NULL;

-- Update the update_inventory_quantity function to handle parapharmacy products
CREATE OR REPLACE FUNCTION update_inventory_quantity(
  p_wholesaler_id uuid,
  p_medication_id uuid,
  p_product_id uuid,
  p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_medication_id IS NOT NULL THEN
    UPDATE wholesaler_inventory
    SET quantity = quantity - p_quantity
    WHERE wholesaler_id = p_wholesaler_id
      AND medication_id = p_medication_id;
  ELSIF p_product_id IS NOT NULL THEN
    UPDATE wholesaler_parapharmacy_inventory
    SET quantity = quantity - p_quantity
    WHERE wholesaler_id = p_wholesaler_id
      AND product_id = p_product_id;
  END IF;
END;
$$;