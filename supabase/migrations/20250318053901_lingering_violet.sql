/*
  # Add category column to medications table

  1. Changes
    - Add category column to medications table
    - Make it non-nullable with a default value
*/

-- Add category column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medications' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE medications 
    ADD COLUMN category text NOT NULL DEFAULT 'Other';
  END IF;
END $$;