/*
  # Add delivery days by region and expiration dates

  1. New Tables
    - `regions` - Stores region definitions
      - `id` (uuid, primary key)
      - `name` (text) - Region name (Centre, Est, Ouest, etc.)
      - `wilayas` (text[]) - Array of wilayas in this region

    - `wholesaler_delivery_days` - Stores delivery days configuration
      - `id` (uuid, primary key)
      - `wholesaler_id` (uuid) - Reference to wholesaler user
      - `region_id` (uuid) - Reference to region
      - `delivery_days` (text[]) - Array of delivery days (samedi, dimanche, etc.)

  2. Changes
    - Add expiry_date column to wholesaler_inventory
    - Add expiry_date column to promotions
    - Add expiry_date column to offer_products

  3. Security
    - Enable RLS on all tables
    - Add policies for proper access control
*/

-- Create regions table
CREATE TABLE regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  wilayas text[] NOT NULL
);

-- Create wholesaler_delivery_days table
CREATE TABLE wholesaler_delivery_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wholesaler_id uuid REFERENCES users(id) NOT NULL,
  region_id uuid REFERENCES regions(id) NOT NULL,
  delivery_days text[] NOT NULL,
  UNIQUE(wholesaler_id, region_id)
);

-- Add expiry_date column to wholesaler_inventory
ALTER TABLE wholesaler_inventory
ADD COLUMN IF NOT EXISTS expiry_date date;

-- Add expiry_date column to promotions
ALTER TABLE promotions
ADD COLUMN IF NOT EXISTS expiry_date date;

-- Add expiry_date column to offer_products
ALTER TABLE offer_products
ADD COLUMN IF NOT EXISTS expiry_date date;

-- Enable RLS
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesaler_delivery_days ENABLE ROW LEVEL SECURITY;

-- Create policies for regions
CREATE POLICY "Everyone can read regions"
  ON regions
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for wholesaler_delivery_days
CREATE POLICY "Wholesalers can manage their delivery days"
  ON wholesaler_delivery_days
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'wholesaler'
      AND id = wholesaler_delivery_days.wholesaler_id
    )
  );

CREATE POLICY "Everyone can read delivery days"
  ON wholesaler_delivery_days
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_wholesaler_delivery_days_wholesaler
  ON wholesaler_delivery_days(wholesaler_id);

CREATE INDEX idx_wholesaler_delivery_days_region
  ON wholesaler_delivery_days(region_id);

CREATE INDEX idx_wholesaler_inventory_expiry_date
  ON wholesaler_inventory(expiry_date)
  WHERE expiry_date IS NOT NULL;

-- Create function to validate expiry date
CREATE OR REPLACE FUNCTION validate_expiry_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if expiry_date is in the future
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date <= CURRENT_DATE THEN
    RAISE EXCEPTION 'Expiry date must be in the future';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to validate expiry dates
CREATE TRIGGER validate_inventory_expiry_date
  BEFORE INSERT OR UPDATE ON wholesaler_inventory
  FOR EACH ROW
  EXECUTE FUNCTION validate_expiry_date();

CREATE TRIGGER validate_promotion_expiry_date
  BEFORE INSERT OR UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION validate_expiry_date();

-- Insert predefined regions
INSERT INTO regions (name, wilayas) VALUES
  ('Centre', ARRAY['Alger', 'Blida', 'Boumerdès', 'Tipaza', 'Bouira', 'Médéa', 'Tizi Ouzou', 'Djelfa']),
  ('Est', ARRAY['Annaba', 'Constantine', 'Sétif', 'Jijel', 'Skikda', 'Mila', 'Batna', 'Béjaïa', 'Bordj Bou Arréridj', 'Guelma', 'Khenchela', 'Oum El Bouaghi', 'Souk Ahras', 'Tébessa', 'El Tarf']),
  ('Ouest', ARRAY['Oran', 'Tlemcen', 'Sidi Bel Abbès', 'Mostaganem', 'Mascara', 'Relizane', 'Aïn Témouchent', 'Chlef', 'Tiaret', 'Tissemsilt', 'Saïda']),
  ('Sud-Est', ARRAY['Biskra', 'El Oued', 'Ouargla', 'Ghardaïa', 'Laghouat']),
  ('Sud-Ouest', ARRAY['Béchar', 'Naâma', 'El Bayadh', 'Adrar']),
  ('Grand Sud', ARRAY['Tamanrasset', 'Illizi', 'Tindouf']);

-- Add constraints to check expiry dates
ALTER TABLE wholesaler_inventory
ADD CONSTRAINT wholesaler_inventory_expiry_date_check
CHECK (expiry_date > CURRENT_DATE);

ALTER TABLE promotions
ADD CONSTRAINT promotions_expiry_date_check
CHECK (expiry_date > CURRENT_DATE);