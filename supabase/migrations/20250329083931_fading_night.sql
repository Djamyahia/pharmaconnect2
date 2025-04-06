/*
  # Add generate_uuid function

  1. Changes
    - Add a PostgreSQL function to generate UUIDs
    - This function will be used to generate temporary IDs for inventory items

  2. Security
    - Function is marked as SECURITY DEFINER to ensure it can always generate UUIDs
    - Return type is explicitly set to avoid type confusion
*/

CREATE OR REPLACE FUNCTION generate_uuid()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN json_build_object('id', gen_random_uuid());
END;
$$;