/*
  # Add delivery date to orders

  1. Changes
    - Add delivery_date column to orders table
    - Add delivery_status column to orders table
    - Update order status to include 'pending_delivery_confirmation'
*/

BEGIN;

-- Add delivery_date column
ALTER TABLE orders
ADD COLUMN delivery_date timestamptz;

-- Add delivery_status column
ALTER TABLE orders
ADD COLUMN delivery_status text DEFAULT 'pending'
CHECK (delivery_status IN ('pending', 'accepted', 'rejected'));

-- Drop the existing constraint
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add the new constraint with the new status
ALTER TABLE orders
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'pending_delivery_confirmation', 'accepted', 'canceled'));

COMMIT;