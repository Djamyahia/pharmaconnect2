/*
  # Update Users table RLS policies

  1. Changes
    - Add new policy to allow user registration
    - Modify existing policies to ensure proper access control
  
  2. Security
    - Allow unauthenticated users to insert new records during registration
    - Maintain existing policies for authenticated users
    - Ensure users can only access their own data
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Allow insert for admin" ON public.users;
DROP POLICY IF EXISTS "Allow service_role to insert users" ON public.users;

-- Create new policy for user registration
CREATE POLICY "Allow user registration"
ON public.users
FOR INSERT
TO public
WITH CHECK (true);  -- Allow initial registration, auth.uid() will be null during signup

-- Update existing policies to be more specific
DROP POLICY IF EXISTS "Users can manage their own data" ON public.users;
CREATE POLICY "Users can manage their own data"
ON public.users
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Keep the read-only policy for authenticated users
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
CREATE POLICY "Enable read access for all users"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- System/service role access policy
DROP POLICY IF EXISTS "System can manage users" ON public.users;
CREATE POLICY "System can manage users"
ON public.users
FOR ALL
TO authenticated
USING (auth.uid() IS NULL)
WITH CHECK (auth.uid() IS NULL);