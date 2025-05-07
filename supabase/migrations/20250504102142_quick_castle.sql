/*
  # Add support for pack documents

  1. New Tables
    - `offer_documents` - Stores document references for promotional offers
      - `id` (uuid, primary key)
      - `offer_id` (uuid)
      - `file_name` (text)
      - `file_type` (text)
      - `file_size` (integer)
      - `file_path` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on the new table
    - Add policies for proper access control
*/

-- Create offer_documents table
CREATE TABLE offer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid REFERENCES promotional_offers(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  file_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE offer_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for offer_documents
CREATE POLICY "Allow public read access to documents of public offers"
  ON offer_documents
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM promotional_offers
      WHERE id = offer_documents.offer_id
      AND is_public = true
      AND CURRENT_TIMESTAMP BETWEEN start_date AND end_date
    )
  );

CREATE POLICY "Allow authenticated read access to all offer documents"
  ON offer_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM promotional_offers
      WHERE id = offer_documents.offer_id
      AND CURRENT_TIMESTAMP BETWEEN start_date AND end_date
    )
  );

CREATE POLICY "Wholesalers can manage their offer documents"
  ON offer_documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM promotional_offers o
      JOIN users u ON u.id = o.wholesaler_id
      WHERE o.id = offer_documents.offer_id
      AND u.id = auth.uid()
      AND u.role = 'wholesaler'
    )
  );

-- Add comment field to promotional_offers
ALTER TABLE promotional_offers
ADD COLUMN IF NOT EXISTS comment text;

-- Create indexes for better performance
CREATE INDEX idx_offer_documents_offer_id
  ON offer_documents(offer_id);