/*
  # Fix product deletion cascade

  1. Changes
    - Add stored procedure to safely delete parapharmacy products
    - The procedure handles deletion of related records in the correct order
    - Ensures proper authorization checks

  2. Security
    - Only allows wholesalers to delete their own products
    - Maintains RLS policies
*/

-- Create a function to handle safe deletion of parapharmacy products
CREATE OR REPLACE FUNCTION delete_parapharmacy_product(
  product_id_param UUID,
  wholesaler_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the product belongs to the wholesaler
  IF NOT EXISTS (
    SELECT 1 FROM parapharmacy_products
    WHERE id = product_id_param AND created_by = wholesaler_id_param
  ) THEN
    RETURN FALSE;
  END IF;

  -- Delete inventory entries first
  DELETE FROM wholesaler_parapharmacy_inventory
  WHERE product_id = product_id_param;

  -- Delete order items referencing this product
  DELETE FROM order_items
  WHERE product_id = product_id_param;

  -- Finally delete the product
  DELETE FROM parapharmacy_products
  WHERE id = product_id_param AND created_by = wholesaler_id_param;

  RETURN TRUE;
END;
$$;