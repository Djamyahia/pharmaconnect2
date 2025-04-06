/*
  # Fix Notifications RLS Policy

  1. Changes
    - Add INSERT policy for notifications table to allow the system to create notifications
    - This fixes the RLS violation error when creating order notifications

  2. Security
    - Maintain existing RLS policies
    - Add system-level access for notification creation
*/

-- Drop existing policies if they conflict
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Add policy to allow notification creation
CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);