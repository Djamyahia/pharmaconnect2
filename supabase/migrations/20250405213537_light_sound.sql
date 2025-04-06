/*
  # Fix user subscriptions RLS policies

  1. Changes
    - Update RLS policies for user_subscriptions table to allow system-level operations
    - Add policy to allow inserting new subscriptions during registration
    
  2. Security
    - Maintain existing user-level access controls
    - Add specific policy for system operations
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can manage their subscriptions" ON user_subscriptions;

-- Create new policies with proper access control
CREATE POLICY "Users can manage their subscriptions"
ON user_subscriptions
FOR ALL
TO authenticated
USING (
  (auth.uid() = user_id) OR 
  (auth.uid() IS NULL)  -- Allow system-level operations
)
WITH CHECK (
  (auth.uid() = user_id) OR 
  (auth.uid() IS NULL)  -- Allow system-level operations
);

-- Add specific policy for new subscription creation
CREATE POLICY "Allow subscription creation during registration"
ON user_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id OR  -- User can create their own subscription
  auth.uid() IS NULL       -- System can create subscriptions
);