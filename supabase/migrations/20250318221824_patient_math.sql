/*
  # Add delivery date and status to orders

  1. Changes
    - Add delivery_date column if it doesn't exist
    - Add delivery_status column if it doesn't exist
    - Update order status to include 'pending_delivery_confirmation'
*/

BEGIN;

-- Add delivery_date column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'delivery_date'
  ) THEN
    ALTER TABLE orders
    ADD COLUMN delivery_date timestamptz;
  END IF;
END $$;

-- Add delivery_status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'delivery_status'
  ) THEN
    ALTER TABLE orders
    ADD COLUMN delivery_status text DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'accepted', 'rejected'));
  END IF;
END $$;

-- Drop the existing constraint
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add the new constraint with the new status
ALTER TABLE orders
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'pending_delivery_confirmation', 'accepted', 'canceled'));

COMMIT;