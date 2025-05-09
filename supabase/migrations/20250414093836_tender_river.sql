/*
  # Fix parapharmacy deletion policies

  1. Changes
    - Add CASCADE DELETE to foreign key constraints
    - Update RLS policies to allow proper deletion
*/

-- First, drop the existing foreign key constraint
ALTER TABLE wholesaler_parapharmacy_inventory
DROP CONSTRAINT IF EXISTS wholesaler_parapharmacy_inventory_product_id_fkey;

-- Re-add the constraint with CASCADE DELETE
ALTER TABLE wholesaler_parapharmacy_inventory
ADD CONSTRAINT wholesaler_parapharmacy_inventory_product_id_fkey
FOREIGN KEY (product_id) REFERENCES parapharmacy_products(id)
ON DELETE CASCADE;

-- Drop existing policies
DROP POLICY IF EXISTS "Wholesalers can create parapharmacy products" ON parapharmacy_products;
DROP POLICY IF EXISTS "Wholesalers can update their own products" ON parapharmacy_products;
DROP POLICY IF EXISTS "Everyone can read parapharmacy products" ON parapharmacy_products;

-- Create new policies with proper DELETE permissions
CREATE POLICY "Wholesalers can manage their own products"
  ON parapharmacy_products
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Everyone can read parapharmacy products"
  ON parapharmacy_products
  FOR SELECT
  TO authenticated
  USING (true);