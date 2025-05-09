/*
  # Add metadata column to order_items table

  1. Changes
    - Add metadata column to order_items table to store additional information
    - This column will be used to store information about special offers and other order-related data
    - The column is of type jsonb to allow flexible structured data storage

  2. Security
    - Maintain existing RLS policies
*/

-- Add metadata column to order_items table
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Grant appropriate permissions
GRANT ALL ON order_items TO authenticated;