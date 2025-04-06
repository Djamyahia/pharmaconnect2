/*
  # Add Promotion Flag to Inventory

  1. Changes
    - Add has_active_promotion flag to wholesaler_inventory table
    - Add trigger to update flag when promotions change

  2. Security
    - Maintain existing RLS policies
*/

-- Add has_active_promotion column to wholesaler_inventory
ALTER TABLE wholesaler_inventory
ADD COLUMN IF NOT EXISTS has_active_promotion boolean DEFAULT false;

-- Create function to update has_active_promotion flag
CREATE OR REPLACE FUNCTION update_promotion_flag()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the flag when a promotion is added or removed
  UPDATE wholesaler_inventory
  SET has_active_promotion = EXISTS (
    SELECT 1
    FROM promotions
    WHERE 
      promotions.medication_id = wholesaler_inventory.medication_id
      AND promotions.wholesaler_id = wholesaler_inventory.wholesaler_id
      AND CURRENT_TIMESTAMP BETWEEN promotions.start_date AND promotions.end_date
  )
  WHERE 
    medication_id = COALESCE(NEW.medication_id, OLD.medication_id)
    AND wholesaler_id = COALESCE(NEW.wholesaler_id, OLD.wholesaler_id);
    
  RETURN NEW;
END;
$$;

-- Create triggers for promotion changes
CREATE TRIGGER update_promotion_flag_insert
  AFTER INSERT ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_promotion_flag();

CREATE TRIGGER update_promotion_flag_update
  AFTER UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_promotion_flag();

CREATE TRIGGER update_promotion_flag_delete
  AFTER DELETE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_promotion_flag();