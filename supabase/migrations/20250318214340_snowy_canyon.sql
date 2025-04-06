/*
  # Fix order items RLS policies

  1. Changes
    - Update RLS policies for order_items table to allow proper access
    - Allow pharmacists to create order items for their own orders
    - Allow wholesalers to view order items for orders they received

  2. Security
    - Maintain data isolation between users
    - Ensure users can only access their own data
*/

-- Drop existing policies on order_items
DROP POLICY IF EXISTS "Order items are visible to order participants" ON order_items;

-- Create new policies for order_items
CREATE POLICY "Pharmacists can manage their order items" ON order_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.pharmacist_id = auth.uid()
    )
  );

CREATE POLICY "Wholesalers can view order items for their orders" ON order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.wholesaler_id = auth.uid()
    )
  );