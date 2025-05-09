/*
  # Add Parapharmacy Support

  1. New Tables
    - `parapharmacy_products` - Stores parapharmacy products
      - `id` (uuid, primary key)
      - `name` (text)
      - `category` (text)
      - `description` (text)
      - `packaging` (text)
      - `reference` (text)
      - `image_url` (text)
      - `created_by` (uuid)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `wholesaler_parapharmacy_inventory` - Tracks wholesaler parapharmacy stock
      - `id` (uuid, primary key)
      - `wholesaler_id` (uuid)
      - `product_id` (uuid)
      - `quantity` (integer)
      - `price` (decimal)
      - `delivery_wilayas` (text[])
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access
*/

-- Create parapharmacy categories enum
CREATE TYPE parapharmacy_category AS ENUM (
  'hygiene_and_care',
  'dermocosmetics',
  'dietary_supplements',
  'mother_and_baby',
  'orthopedics',
  'hair_care',
  'veterinary',
  'sun_care',
  'medical_devices',
  'accessories'
);

-- Create parapharmacy_products table
CREATE TABLE parapharmacy_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category parapharmacy_category NOT NULL,
  description text,
  packaging text,
  reference text,
  image_url text,
  created_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create wholesaler_parapharmacy_inventory table
CREATE TABLE wholesaler_parapharmacy_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wholesaler_id uuid NOT NULL REFERENCES users(id),
  product_id uuid NOT NULL REFERENCES parapharmacy_products(id),
  quantity integer NOT NULL DEFAULT 0,
  price decimal(10,2) NOT NULL,
  delivery_wilayas text[] NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(wholesaler_id, product_id)
);

-- Enable RLS
ALTER TABLE parapharmacy_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesaler_parapharmacy_inventory ENABLE ROW LEVEL SECURITY;

-- Create policies for parapharmacy_products
CREATE POLICY "Wholesalers can create parapharmacy products"
  ON parapharmacy_products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'wholesaler'
    )
  );

CREATE POLICY "Wholesalers can update their own products"
  ON parapharmacy_products
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Everyone can read parapharmacy products"
  ON parapharmacy_products
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for wholesaler_parapharmacy_inventory
CREATE POLICY "Wholesalers can manage their parapharmacy inventory"
  ON wholesaler_parapharmacy_inventory
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'wholesaler'
      AND id = wholesaler_parapharmacy_inventory.wholesaler_id
    )
  );

CREATE POLICY "Pharmacists can view parapharmacy inventory"
  ON wholesaler_parapharmacy_inventory
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'pharmacist'
    )
  );

-- Add search capabilities
ALTER TABLE parapharmacy_products 
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('french', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX parapharmacy_products_search_idx 
  ON parapharmacy_products USING gin(search_vector);

-- Add indexes for better performance
CREATE INDEX idx_parapharmacy_products_category 
  ON parapharmacy_products(category);

CREATE INDEX idx_parapharmacy_products_created_by 
  ON parapharmacy_products(created_by);

CREATE INDEX idx_wholesaler_parapharmacy_inventory_wholesaler 
  ON wholesaler_parapharmacy_inventory(wholesaler_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_parapharmacy_products_updated_at
    BEFORE UPDATE ON parapharmacy_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wholesaler_parapharmacy_inventory_updated_at
    BEFORE UPDATE ON wholesaler_parapharmacy_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();