-- Create regions table
CREATE TABLE IF NOT EXISTS regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  wilayas text[] NOT NULL
);

-- Create wholesaler_delivery_days table
CREATE TABLE IF NOT EXISTS wholesaler_delivery_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wholesaler_id uuid REFERENCES users(id) NOT NULL,
  region_id uuid REFERENCES regions(id) NOT NULL,
  delivery_days text[] NOT NULL,
  UNIQUE(wholesaler_id, region_id)
);

-- Add expiry_date column to wholesaler_inventory
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wholesaler_inventory' 
    AND column_name = 'expiry_date'
  ) THEN
    ALTER TABLE wholesaler_inventory
    ADD COLUMN expiry_date date;
  END IF;
END $$;

-- Add expiry_date column to promotions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'promotions' 
    AND column_name = 'expiry_date'
  ) THEN
    ALTER TABLE promotions
    ADD COLUMN expiry_date date;
  END IF;
END $$;

-- Add expiry_date column to offer_products
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offer_products' 
    AND column_name = 'expiry_date'
  ) THEN
    ALTER TABLE offer_products
    ADD COLUMN expiry_date date;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesaler_delivery_days ENABLE ROW LEVEL SECURITY;

-- Create policies for regions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'regions' 
    AND policyname = 'Everyone can read regions'
  ) THEN
    CREATE POLICY "Everyone can read regions"
      ON regions
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Create policies for wholesaler_delivery_days
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'wholesaler_delivery_days' 
    AND policyname = 'Wholesalers can manage their delivery days'
  ) THEN
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
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'wholesaler_delivery_days' 
    AND policyname = 'Everyone can read delivery days'
  ) THEN
    CREATE POLICY "Everyone can read delivery days"
      ON wholesaler_delivery_days
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Create indexes for better performance
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_wholesaler_delivery_days_wholesaler'
  ) THEN
    CREATE INDEX idx_wholesaler_delivery_days_wholesaler
      ON wholesaler_delivery_days(wholesaler_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_wholesaler_delivery_days_region'
  ) THEN
    CREATE INDEX idx_wholesaler_delivery_days_region
      ON wholesaler_delivery_days(region_id);
  END IF;
END $$;

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
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'validate_inventory_expiry_date'
  ) THEN
    CREATE TRIGGER validate_inventory_expiry_date
      BEFORE INSERT OR UPDATE ON wholesaler_inventory
      FOR EACH ROW
      EXECUTE FUNCTION validate_expiry_date();
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'validate_promotion_expiry_date'
  ) THEN
    CREATE TRIGGER validate_promotion_expiry_date
      BEFORE INSERT OR UPDATE ON promotions
      FOR EACH ROW
      EXECUTE FUNCTION validate_expiry_date();
  END IF;
END $$;

-- Insert predefined regions if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM regions WHERE name = 'Centre') THEN
    INSERT INTO regions (name, wilayas) VALUES
      ('Centre', ARRAY['Alger', 'Blida', 'Boumerdès', 'Tipaza', 'Bouira', 'Médéa', 'Tizi Ouzou', 'Djelfa']),
      ('Est', ARRAY['Annaba', 'Constantine', 'Sétif', 'Jijel', 'Skikda', 'Mila', 'Batna', 'Béjaïa', 'Bordj Bou Arréridj', 'Guelma', 'Khenchela', 'Oum El Bouaghi', 'Souk Ahras', 'Tébessa', 'El Tarf']),
      ('Ouest', ARRAY['Oran', 'Tlemcen', 'Sidi Bel Abbès', 'Mostaganem', 'Mascara', 'Relizane', 'Aïn Témouchent', 'Chlef', 'Tiaret', 'Tissemsilt', 'Saïda']),
      ('Sud-Est', ARRAY['Biskra', 'El Oued', 'Ouargla', 'Ghardaïa', 'Laghouat']),
      ('Sud-Ouest', ARRAY['Béchar', 'Naâma', 'El Bayadh', 'Adrar']),
      ('Grand Sud', ARRAY['Tamanrasset', 'Illizi', 'Tindouf']);
  END IF;
END $$;

-- Add constraints to check expiry dates if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'wholesaler_inventory_expiry_date_check'
  ) THEN
    ALTER TABLE wholesaler_inventory
    ADD CONSTRAINT wholesaler_inventory_expiry_date_check
    CHECK (expiry_date IS NULL OR expiry_date > CURRENT_DATE);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'promotions_expiry_date_check'
  ) THEN
    ALTER TABLE promotions
    ADD CONSTRAINT promotions_expiry_date_check
    CHECK (expiry_date IS NULL OR expiry_date > CURRENT_DATE);
  END IF;
END $$;