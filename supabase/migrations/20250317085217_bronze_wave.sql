/*
  # Initial Schema for Pharmacy Platform

  1. New Tables
    - `users` - Stores pharmacist and wholesaler accounts
      - `id` (uuid, primary key) - User's unique identifier
      - `email` (text) - User's email address
      - `role` (text) - Either 'pharmacist' or 'wholesaler'
      - `company_name` (text) - Name of pharmacy or wholesale company
      - `registration_number` (text) - Professional registration number
      - `address` (text) - Physical address
      - `wilaya` (text) - Wilaya/region
      - `phone` (text) - Contact phone number
      - `is_verified` (boolean) - Account verification status
      - `created_at` (timestamp) - Account creation date

    - `medications` - Central medication database
      - `id` (uuid, primary key) - Medication's unique identifier
      - `commercial_name` (text) - Brand name
      - `scientific_name` (text) - Generic/scientific name
      - `dosage` (text) - Medication dosage
      - `form` (text) - Pharmaceutical form
      - `category` (text) - Medication category
      - `atc_code` (text) - ATC classification code
      - `excipients` (text) - List of excipients
      - `recommended_price` (decimal) - Recommended retail price
      - `amm_number` (text) - Marketing authorization number
      - `storage_conditions` (text) - Storage requirements
      - `status` (text) - Product type (medication, parapharmacy, etc.)
      - `created_at` (timestamp) - Record creation date

    - `wholesaler_inventory` - Tracks wholesaler stock and pricing
      - `id` (uuid, primary key) - Inventory entry unique identifier
      - `wholesaler_id` (uuid) - Reference to wholesaler user
      - `medication_id` (uuid) - Reference to medication
      - `quantity` (integer) - Available stock quantity
      - `price` (decimal) - Wholesaler's price
      - `delivery_wilayas` (text[]) - Array of delivery regions
      - `created_at` (timestamp) - Record creation date
      - `updated_at` (timestamp) - Last update timestamp

    - `promotions` - Wholesaler promotional offers
      - `id` (uuid, primary key) - Promotion unique identifier
      - `wholesaler_id` (uuid) - Reference to wholesaler user
      - `medication_id` (uuid) - Reference to medication
      - `discount_percentage` (decimal) - Discount amount
      - `start_date` (timestamp) - Promotion start date
      - `end_date` (timestamp) - Promotion end date
      - `created_at` (timestamp) - Record creation date

    - `orders` - Pharmacist orders
      - `id` (uuid, primary key) - Order unique identifier
      - `pharmacist_id` (uuid) - Reference to pharmacist user
      - `wholesaler_id` (uuid) - Reference to wholesaler user
      - `status` (text) - Order status (pending, accepted, rejected)
      - `total_amount` (decimal) - Total order amount
      - `created_at` (timestamp) - Order creation date
      - `updated_at` (timestamp) - Last status update

    - `order_items` - Individual items in orders
      - `id` (uuid, primary key) - Order item unique identifier
      - `order_id` (uuid) - Reference to order
      - `medication_id` (uuid) - Reference to medication
      - `quantity` (integer) - Ordered quantity
      - `unit_price` (decimal) - Price at time of order
      - `created_at` (timestamp) - Record creation date

  2. Security
    - Enable RLS on all tables
    - Set up policies for role-based access
    - Ensure data isolation between pharmacists and wholesalers

  3. Relationships
    - Foreign key constraints between related tables
    - Cascading updates and deletes where appropriate
*/

-- Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('pharmacist', 'wholesaler')),
  company_name text NOT NULL,
  registration_number text NOT NULL,
  address text NOT NULL,
  wilaya text NOT NULL,
  phone text NOT NULL,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create medications table
CREATE TABLE medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_name text NOT NULL,
  scientific_name text NOT NULL,
  dosage text NOT NULL,
  form text NOT NULL,
  category text NOT NULL,
  atc_code text,
  excipients text,
  recommended_price decimal(10,2),
  amm_number text,
  storage_conditions text,
  status text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create wholesaler_inventory table
CREATE TABLE wholesaler_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wholesaler_id uuid NOT NULL REFERENCES users(id),
  medication_id uuid NOT NULL REFERENCES medications(id),
  quantity integer NOT NULL DEFAULT 0,
  price decimal(10,2) NOT NULL,
  delivery_wilayas text[] NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(wholesaler_id, medication_id)
);

-- Create promotions table
CREATE TABLE promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wholesaler_id uuid NOT NULL REFERENCES users(id),
  medication_id uuid NOT NULL REFERENCES medications(id),
  discount_percentage decimal(5,2) NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  CHECK (end_date > start_date)
);

-- Create orders table
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacist_id uuid NOT NULL REFERENCES users(id),
  wholesaler_id uuid NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  total_amount decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  medication_id uuid NOT NULL REFERENCES medications(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesaler_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for users
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Create policies for medications
CREATE POLICY "Medications are readable by authenticated users" ON medications
  FOR SELECT TO authenticated
  USING (true);

-- Create policies for wholesaler_inventory
CREATE POLICY "Wholesalers can manage their inventory" ON wholesaler_inventory
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'wholesaler'
      AND id = wholesaler_inventory.wholesaler_id
    )
  );

CREATE POLICY "Pharmacists can view inventory" ON wholesaler_inventory
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'pharmacist'
    )
  );

-- Create policies for promotions
CREATE POLICY "Wholesalers can manage their promotions" ON promotions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'wholesaler'
      AND id = promotions.wholesaler_id
    )
  );

CREATE POLICY "Pharmacists can view promotions" ON promotions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'pharmacist'
    )
  );

-- Create policies for orders
CREATE POLICY "Pharmacists can manage their orders" ON orders
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'pharmacist'
      AND id = orders.pharmacist_id
    )
  );

CREATE POLICY "Wholesalers can view and update their received orders" ON orders
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'wholesaler'
      AND id = orders.wholesaler_id
    )
  );

-- Create policies for order_items
CREATE POLICY "Order items are visible to order participants" ON order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        orders.pharmacist_id = auth.uid()
        OR orders.wholesaler_id = auth.uid()
      )
    )
  );