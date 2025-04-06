/*
  # Remove inactive column from promotions table

  1. Changes
    - Remove the `inactive` column from the `promotions` table as it's no longer needed
    - The active status is now determined by checking if the current timestamp is between start_date and end_date
*/

-- Remove the inactive column from promotions table
ALTER TABLE promotions 
DROP COLUMN IF EXISTS inactive;