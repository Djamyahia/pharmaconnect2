/*
  # Update order status options

  1. Changes
    - Update the status check constraint on orders table to use 'canceled' instead of 'rejected'
    - Update any existing 'rejected' orders to 'canceled'
    - Handle the transition safely to avoid constraint violations

  2. Implementation
    - Use a transaction to ensure atomicity
    - Temporarily disable the constraint
    - Update the data
    - Add the new constraint
*/

BEGIN;

-- First, drop the existing constraint
ALTER TABLE orders 
  DROP CONSTRAINT IF EXISTS orders_status_check;

-- Update any existing rejected orders to canceled
UPDATE orders SET status = 'canceled' WHERE status = 'rejected';

-- Add the new constraint
ALTER TABLE orders
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'accepted', 'canceled'));

COMMIT;