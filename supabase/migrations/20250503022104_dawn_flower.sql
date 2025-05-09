-- Create promotional_offers table if it doesn't exist
CREATE TABLE IF NOT EXISTS promotional_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wholesaler_id uuid REFERENCES users(id) NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('pack', 'threshold')),
  min_purchase_amount numeric(10,2),
  is_public boolean DEFAULT false,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  custom_total_price numeric(10,2),
  CHECK (end_date > start_date),
  CHECK (
    (type = 'threshold' AND min_purchase_amount IS NOT NULL AND min_purchase_amount > 0) OR
    (type = 'pack' AND min_purchase_amount IS NULL)
  )
);

-- Create offer_products table if it doesn't exist
CREATE TABLE IF NOT EXISTS offer_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid REFERENCES promotional_offers(id) ON DELETE CASCADE NOT NULL,
  medication_id uuid REFERENCES medications(id) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  is_priority boolean DEFAULT false,
  priority_message text,
  UNIQUE(offer_id, medication_id)
);

-- Enable RLS if not already enabled
ALTER TABLE promotional_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access to public offers" ON promotional_offers;
DROP POLICY IF EXISTS "Allow authenticated read access to all offers" ON promotional_offers;
DROP POLICY IF EXISTS "Wholesalers can manage their offers" ON promotional_offers;
DROP POLICY IF EXISTS "Allow public read access to products of public offers" ON offer_products;
DROP POLICY IF EXISTS "Allow authenticated read access to all offer products" ON offer_products;
DROP POLICY IF EXISTS "Wholesalers can manage their offer products" ON offer_products;

-- Create policy for public access to promotional_offers
CREATE POLICY "Allow public read access to public offers"
  ON promotional_offers
  FOR SELECT
  TO public
  USING (
    is_public = true AND 
    CURRENT_TIMESTAMP BETWEEN start_date AND end_date
  );

-- Create policy for authenticated access to promotional_offers
CREATE POLICY "Allow authenticated read access to all offers"
  ON promotional_offers
  FOR SELECT
  TO authenticated
  USING (
    CURRENT_TIMESTAMP BETWEEN start_date AND end_date
  );

-- Create policy for wholesalers to manage their offers
CREATE POLICY "Wholesalers can manage their offers"
  ON promotional_offers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'wholesaler'
      AND id = promotional_offers.wholesaler_id
    )
  );

-- Create policies for offer_products
CREATE POLICY "Allow public read access to products of public offers"
  ON offer_products
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM promotional_offers
      WHERE id = offer_products.offer_id
      AND is_public = true
      AND CURRENT_TIMESTAMP BETWEEN start_date AND end_date
    )
  );

CREATE POLICY "Allow authenticated read access to all offer products"
  ON offer_products
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM promotional_offers
      WHERE id = offer_products.offer_id
      AND CURRENT_TIMESTAMP BETWEEN start_date AND end_date
    )
  );

CREATE POLICY "Wholesalers can manage their offer products"
  ON offer_products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM promotional_offers o
      JOIN users u ON u.id = o.wholesaler_id
      WHERE o.id = offer_products.offer_id
      AND u.id = auth.uid()
      AND u.role = 'wholesaler'
    )
  );

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_promotional_offers_dates 
  ON promotional_offers(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_promotional_offers_wholesaler 
  ON promotional_offers(wholesaler_id);

CREATE INDEX IF NOT EXISTS idx_offer_products_offer 
  ON offer_products(offer_id);

CREATE INDEX IF NOT EXISTS idx_offer_products_medication 
  ON offer_products(medication_id);

-- Drop existing view if it exists
DROP VIEW IF EXISTS active_offers_view;

-- Create view for active offers with products
CREATE VIEW active_offers_view AS
SELECT 
  o.*,
  json_agg(
    json_build_object(
      'id', p.id,
      'medication_id', p.medication_id,
      'quantity', p.quantity,
      'price', p.price,
      'is_priority', p.is_priority,
      'priority_message', p.priority_message,
      'medication', m.*
    )
  ) as products
FROM promotional_offers o
JOIN offer_products p ON p.offer_id = o.id
JOIN medications m ON m.id = p.medication_id
WHERE CURRENT_TIMESTAMP BETWEEN o.start_date AND o.end_date
GROUP BY o.id;

-- Grant appropriate permissions
GRANT SELECT ON active_offers_view TO public;