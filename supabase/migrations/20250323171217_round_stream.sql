/*
  # Add delivery_wilayas column to users table

  1. Changes
    - Add delivery_wilayas array column to users table for storing delivery regions
    - This column will be used by wholesalers to specify their delivery areas
    - The column is nullable since it's only relevant for wholesaler accounts

  2. Security
    - Maintain existing RLS policies
*/

-- Add delivery_wilayas column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS delivery_wilayas text[] DEFAULT '{}';

-- Update the type definition in TypeScript
COMMENT ON COLUMN users.delivery_wilayas IS 'Array of wilaya codes where the wholesaler delivers';