/*
  # Add Tender System

  1. New Tables
    - `tenders` - Stores tender requests from pharmacists
    - `tender_items` - Stores medications requested in tenders
    - `tender_responses` - Stores wholesaler responses to tenders
    - `tender_response_items` - Stores detailed responses for each medication
    - `tender_messages` - Stores messages between pharmacists and wholesalers

  2. Functions
    - `generate_public_link` - Generates random public links for tenders
    - `filter_phone_numbers` - Filters phone numbers from messages
    - `notify_tender_activity` - Sends notifications for tender activities
    - `update_tender_updated_at` - Updates timestamp on tender changes

  3. Security
    - Enable RLS on all tables
    - Add policies for proper access control
*/

-- Create tenders table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tenders') THEN
    CREATE TABLE tenders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pharmacist_id uuid NOT NULL REFERENCES users(id),
      title text NOT NULL,
      deadline timestamptz NOT NULL,
      status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'canceled')),
      wilaya text NOT NULL,
      public_link text NOT NULL,
      is_public boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      admin_facebook_link text,
      admin_facebook_profile text,
      CHECK (deadline > created_at)
    );
  END IF;
END $$;

-- Create tender_items table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tender_items') THEN
    CREATE TABLE tender_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tender_id uuid NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
      medication_id uuid NOT NULL REFERENCES medications(id),
      quantity integer NOT NULL CHECK (quantity > 0),
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Create tender_responses table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tender_responses') THEN
    CREATE TABLE tender_responses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tender_id uuid NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
      wholesaler_id uuid NOT NULL REFERENCES users(id),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE(tender_id, wholesaler_id)
    );
  END IF;
END $$;

-- Create tender_response_items table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tender_response_items') THEN
    CREATE TABLE tender_response_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tender_response_id uuid NOT NULL REFERENCES tender_responses(id) ON DELETE CASCADE,
      tender_item_id uuid NOT NULL REFERENCES tender_items(id),
      price numeric(10,2) NOT NULL CHECK (price >= 0),
      free_units_percentage numeric(5,2) CHECK (free_units_percentage IS NULL OR (free_units_percentage > 0 AND free_units_percentage <= 100)),
      delivery_date timestamptz NOT NULL,
      expiry_date date CHECK (expiry_date IS NULL OR expiry_date > CURRENT_DATE),
      created_at timestamptz DEFAULT now(),
      UNIQUE(tender_response_id, tender_item_id)
    );
  END IF;
END $$;

-- Create tender_messages table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tender_messages') THEN
    CREATE TABLE tender_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tender_id uuid NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id),
      message text NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Create function to generate public link if it doesn't exist
CREATE OR REPLACE FUNCTION generate_public_link()
RETURNS TRIGGER AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer := 0;
  rand_int integer;
BEGIN
  -- Generate a random 10-character string
  FOR i IN 1..10 LOOP
    rand_int := floor(random() * length(chars) + 1);
    result := result || substr(chars, rand_int, 1);
  END LOOP;
  
  NEW.public_link := result;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to filter phone numbers if it doesn't exist
CREATE OR REPLACE FUNCTION filter_phone_numbers()
RETURNS TRIGGER AS $$
BEGIN
  -- Filter out phone numbers using regex
  -- This is a simple pattern that matches common Algerian phone formats
  NEW.message := regexp_replace(NEW.message, '0[567][0-9]{8}', '[numéro masqué]', 'g');
  NEW.message := regexp_replace(NEW.message, '\+213[567][0-9]{8}', '[numéro masqué]', 'g');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update tender updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_tender_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to notify about tender activity if it doesn't exist
CREATE OR REPLACE FUNCTION notify_tender_activity()
RETURNS TRIGGER AS $$
DECLARE
  tender_record record;
  pharmacist_record record;
  wholesaler_record record;
  notification_title text;
  notification_message text;
  notification_data jsonb;
BEGIN
  -- Get tender information
  SELECT * INTO tender_record FROM tenders WHERE id = COALESCE(NEW.tender_id, NEW.id);
  
  -- Get pharmacist information
  SELECT * INTO pharmacist_record FROM users WHERE id = tender_record.pharmacist_id;
  
  -- Handle different trigger events
  IF TG_TABLE_NAME = 'tenders' AND TG_OP = 'INSERT' THEN
    -- New tender created
    notification_title := 'Nouvel appel d''offres';
    notification_message := 'Un nouvel appel d''offres a été créé pour ' || tender_record.wilaya;
    notification_data := jsonb_build_object(
      'tender_id', tender_record.id,
      'title', tender_record.title,
      'deadline', tender_record.deadline
    );
    
    -- Notify all wholesalers
    FOR wholesaler_record IN 
      SELECT * FROM users 
      WHERE role = 'wholesaler' 
      AND delivery_wilayas @> ARRAY[tender_record.wilaya]
    LOOP
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        wholesaler_record.id,
        'new_tender',
        notification_title,
        notification_message,
        notification_data
      );
    END LOOP;
    
  ELSIF TG_TABLE_NAME = 'tender_responses' AND TG_OP = 'INSERT' THEN
    -- New tender response
    SELECT * INTO wholesaler_record FROM users WHERE id = NEW.wholesaler_id;
    
    notification_title := 'Nouvelle réponse à votre appel d''offres';
    notification_message := wholesaler_record.company_name || ' a répondu à votre appel d''offres';
    notification_data := jsonb_build_object(
      'tender_id', tender_record.id,
      'tender_response_id', NEW.id,
      'wholesaler_id', NEW.wholesaler_id,
      'wholesaler_name', wholesaler_record.company_name
    );
    
    -- Notify pharmacist
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      tender_record.pharmacist_id,
      'tender_response',
      notification_title,
      notification_message,
      notification_data
    );
    
  ELSIF TG_TABLE_NAME = 'tender_messages' AND TG_OP = 'INSERT' THEN
    -- New message
    SELECT * INTO wholesaler_record FROM users WHERE id = NEW.user_id;
    
    -- If message is from pharmacist, notify all wholesalers who responded
    IF NEW.user_id = tender_record.pharmacist_id THEN
      notification_title := 'Nouveau message dans l''appel d''offres';
      notification_message := 'Le pharmacien a envoyé un nouveau message';
      notification_data := jsonb_build_object(
        'tender_id', tender_record.id,
        'message', NEW.message
      );
      
      FOR wholesaler_record IN 
        SELECT u.* FROM users u
        JOIN tender_responses tr ON tr.wholesaler_id = u.id
        WHERE tr.tender_id = tender_record.id
      LOOP
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          data
        ) VALUES (
          wholesaler_record.id,
          'tender_message',
          notification_title,
          notification_message,
          notification_data
        );
      END LOOP;
    ELSE
      -- Message is from wholesaler, notify pharmacist
      notification_title := 'Nouveau message dans l''appel d''offres';
      notification_message := wholesaler_record.company_name || ' a envoyé un nouveau message';
      notification_data := jsonb_build_object(
        'tender_id', tender_record.id,
        'wholesaler_id', NEW.user_id,
        'wholesaler_name', wholesaler_record.company_name,
        'message', NEW.message
      );
      
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        tender_record.pharmacist_id,
        'tender_message',
        notification_title,
        notification_message,
        notification_data
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'generate_tender_public_link') THEN
    CREATE TRIGGER generate_tender_public_link
      BEFORE INSERT ON tenders
      FOR EACH ROW
      EXECUTE FUNCTION generate_public_link();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'filter_phone_numbers_in_messages') THEN
    CREATE TRIGGER filter_phone_numbers_in_messages
      BEFORE INSERT ON tender_messages
      FOR EACH ROW
      EXECUTE FUNCTION filter_phone_numbers();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'notify_new_tender') THEN
    CREATE TRIGGER notify_new_tender
      AFTER INSERT ON tenders
      FOR EACH ROW
      EXECUTE FUNCTION notify_tender_activity();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'notify_new_tender_response') THEN
    CREATE TRIGGER notify_new_tender_response
      AFTER INSERT ON tender_responses
      FOR EACH ROW
      EXECUTE FUNCTION notify_tender_activity();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'notify_new_tender_message') THEN
    CREATE TRIGGER notify_new_tender_message
      AFTER INSERT ON tender_messages
      FOR EACH ROW
      EXECUTE FUNCTION notify_tender_activity();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tender_updated_at') THEN
    CREATE TRIGGER update_tender_updated_at
      BEFORE UPDATE ON tenders
      FOR EACH ROW
      EXECUTE FUNCTION update_tender_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tender_response_updated_at') THEN
    CREATE TRIGGER update_tender_response_updated_at
      BEFORE UPDATE ON tender_responses
      FOR EACH ROW
      EXECUTE FUNCTION update_tender_updated_at();
  END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_response_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Pharmacists can manage their own tenders" ON tenders;
DROP POLICY IF EXISTS "Public can view public tenders" ON tenders;
DROP POLICY IF EXISTS "Wholesalers can view relevant tenders" ON tenders;
DROP POLICY IF EXISTS "Pharmacists can manage their tender items" ON tender_items;
DROP POLICY IF EXISTS "Anyone can view tender items" ON tender_items;
-- on supprime vraiment toute ancienne policy portant ce nom
DROP POLICY IF EXISTS "Wholesalers can create and manage their responses" ON tender_responses;
DROP POLICY IF EXISTS "WholesalerManageResponses"                     ON tender_responses;

DROP POLICY IF EXISTS "Wholesalers can manage their responses" ON tender_responses;
DROP POLICY IF EXISTS "Wholesalers can manage their response items" ON tender_response_items;
DROP POLICY IF EXISTS "Users can create messages for tenders they're involved in" ON tender_messages;
DROP POLICY IF EXISTS "Users can view messages for tenders they're involved in" ON tender_messages;

-- Create policies for tenders
CREATE POLICY "Pharmacists can manage their own tenders"
  ON tenders
  FOR ALL
  TO public
  USING (pharmacist_id = auth.uid())
  WITH CHECK (pharmacist_id = auth.uid());

CREATE POLICY "Public can view public tenders"
  ON tenders
  FOR SELECT
  TO public
  USING (
    is_public = true AND 
    status = 'open' AND 
    deadline > CURRENT_TIMESTAMP
  );

CREATE POLICY "Wholesalers can view relevant tenders"
  ON tenders
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'wholesaler'
    ) AND
    status = 'open' AND
    deadline > CURRENT_TIMESTAMP
  );

-- Create policies for tender_items
CREATE POLICY "Pharmacists can manage their tender items"
  ON tender_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_items.tender_id
      AND (
        tenders.pharmacist_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid()
          AND is_admin = true
        )
      )
    )
  );

CREATE POLICY "Anyone can view tender items"
  ON tender_items
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_items.tender_id
      AND (
        tenders.is_public = true OR
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid()
          AND (
            id = tenders.pharmacist_id OR
            role = 'wholesaler' OR
            is_admin = true
          )
        )
      )
    )
  );

-- Create policies for tender_responses
CREATE POLICY "Wholesalers can create and manage their responses"
  ON tender_responses
  FOR ALL
  TO public
  USING (
    wholesaler_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_responses.tender_id
      AND tenders.pharmacist_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    wholesaler_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_responses.tender_id
      AND tenders.pharmacist_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Create policies for tender_response_items
CREATE POLICY "Wholesalers can manage their response items"
  ON tender_response_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tender_responses
      WHERE tender_responses.id = tender_response_items.tender_response_id
      AND (
        tender_responses.wholesaler_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM tenders
          WHERE tenders.id = tender_responses.tender_id
          AND (
            tenders.pharmacist_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM users
              WHERE id = auth.uid()
              AND is_admin = true
            )
          )
        )
      )
    )
  );

-- Create policies for tender_messages
CREATE POLICY "Users can create messages for tenders they're involved in"
  ON tender_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_messages.tender_id
      AND (
        tenders.pharmacist_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM tender_responses
          WHERE tender_responses.tender_id = tenders.id
          AND tender_responses.wholesaler_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid()
          AND is_admin = true
        )
      )
    )
  );

CREATE POLICY "Users can view messages for tenders they're involved in"
  ON tender_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_messages.tender_id
      AND (
        tenders.pharmacist_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM tender_responses
          WHERE tender_responses.tender_id = tenders.id
          AND tender_responses.wholesaler_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid()
          AND is_admin = true
        )
      )
    )
  );

-- Create indexes for better performance if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tenders_pharmacist_id') THEN
    CREATE INDEX idx_tenders_pharmacist_id ON tenders(pharmacist_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tenders_status') THEN
    CREATE INDEX idx_tenders_status ON tenders(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tenders_deadline') THEN
    CREATE INDEX idx_tenders_deadline ON tenders(deadline);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tenders_public_link') THEN
    CREATE INDEX idx_tenders_public_link ON tenders(public_link);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tenders_public_status_deadline') THEN
    CREATE INDEX idx_tenders_public_status_deadline ON tenders(is_public, status, deadline) WHERE is_public = true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tenders_pharmacist_status') THEN
    CREATE INDEX idx_tenders_pharmacist_status ON tenders(pharmacist_id, status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tender_items_tender_id') THEN
    CREATE INDEX idx_tender_items_tender_id ON tender_items(tender_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tender_items_medication_id') THEN
    CREATE INDEX idx_tender_items_medication_id ON tender_items(medication_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tender_responses_tender_id') THEN
    CREATE INDEX idx_tender_responses_tender_id ON tender_responses(tender_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tender_responses_wholesaler_id') THEN
    CREATE INDEX idx_tender_responses_wholesaler_id ON tender_responses(wholesaler_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tender_response_items_tender_response_id') THEN
    CREATE INDEX idx_tender_response_items_tender_response_id ON tender_response_items(tender_response_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tender_response_items_tender_item_id') THEN
    CREATE INDEX idx_tender_response_items_tender_item_id ON tender_response_items(tender_item_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tender_messages_tender_id') THEN
    CREATE INDEX idx_tender_messages_tender_id ON tender_messages(tender_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tender_messages_user_id') THEN
    CREATE INDEX idx_tender_messages_user_id ON tender_messages(user_id);
  END IF;
END $$;