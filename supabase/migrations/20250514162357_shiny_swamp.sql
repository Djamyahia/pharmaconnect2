/*
  # Fix public access to tender items

  1. Changes
    - Update RLS policy for tender_items to allow public access to items for public tenders
    - Ensure non-authenticated users can view tender items for public tenders
    - Fix the USING clause to properly handle both authenticated and unauthenticated users

  2. Security
    - Maintain security for private tenders
    - Only allow public access to items for public tenders
*/

-- Drop the existing policy that's causing the issue
DROP POLICY IF EXISTS "Anyone can view tender items" ON tender_items;

-- Create a new policy that properly handles public access
CREATE POLICY "Anyone can view tender items"
  ON tender_items
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_items.tender_id
      AND (
        -- Allow public access to items for public tenders
        tenders.is_public = true 
        -- Allow authenticated users to access items for tenders they're involved with
        OR (auth.uid() IS NOT NULL AND (
          tenders.pharmacist_id = auth.uid() 
          OR EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND (
              role = 'wholesaler' 
              OR is_admin = true
            )
          )
        ))
      )
    )
  );

CREATE OR REPLACE FUNCTION notify_tender_activity()
RETURNS TRIGGER AS $$
DECLARE
  rec_tender_id uuid;
  tender_record record;
  pharmacist_record record;
  wholesaler_record record;
  notification_title text;
  notification_message text;
  notification_data jsonb;
BEGIN
  -- 1) déterminer l'ID du tender concerné
  IF TG_TABLE_NAME = 'tenders' THEN
    -- trigger sur la table tenders => le nouvel id est NEW.id
    rec_tender_id := NEW.id;
  ELSE
    -- trigger sur responses ou messages => l'id de l'appel est dans NEW.tender_id
    rec_tender_id := NEW.tender_id;
  END IF;

  -- 2) charger l'enregistrement du tender
  SELECT * 
    INTO tender_record 
    FROM tenders 
   WHERE id = rec_tender_id;

  -- 3) charger le pharmacien
  SELECT * 
    INTO pharmacist_record 
    FROM users 
   WHERE id = tender_record.pharmacist_id;

  -- 4) gérer les différents cas
  IF TG_TABLE_NAME = 'tenders' AND TG_OP = 'INSERT' THEN
    notification_title   := 'Nouvel appel d''offres';
    notification_message := 'Un nouvel appel d''offres a été créé pour ' || tender_record.wilaya;
    notification_data    := jsonb_build_object(
                             'tender_id', tender_record.id,
                             'title',     tender_record.title,
                             'deadline',  tender_record.deadline
                           );

    FOR wholesaler_record IN 
      SELECT * 
        FROM users 
       WHERE role = 'wholesaler' 
         AND delivery_wilayas @> ARRAY[tender_record.wilaya]
    LOOP
      INSERT INTO notifications (
        user_id, type, title, message, data
      ) VALUES (
        wholesaler_record.id,
        'new_tender',
        notification_title,
        notification_message,
        notification_data
      );
    END LOOP;

  ELSIF TG_TABLE_NAME = 'tender_responses' AND TG_OP = 'INSERT' THEN
    -- réponse d'un grossiste
    SELECT * 
      INTO wholesaler_record 
      FROM users 
     WHERE id = NEW.wholesaler_id;

    notification_title   := 'Nouvelle réponse à votre appel d''offres';
    notification_message := wholesaler_record.company_name || ' a répondu à votre appel d''offres';
    notification_data    := jsonb_build_object(
                             'tender_id',          tender_record.id,
                             'tender_response_id', NEW.id,
                             'wholesaler_id',      NEW.wholesaler_id,
                             'wholesaler_name',    wholesaler_record.company_name
                           );

    INSERT INTO notifications (
      user_id, type, title, message, data
    ) VALUES (
      tender_record.pharmacist_id,
      'tender_response',
      notification_title,
      notification_message,
      notification_data
    );

  ELSIF TG_TABLE_NAME = 'tender_messages' AND TG_OP = 'INSERT' THEN
    -- message de chat
    SELECT * 
      INTO wholesaler_record 
      FROM users 
     WHERE id = NEW.user_id;

    IF NEW.user_id = tender_record.pharmacist_id THEN
      -- message du pharmacien => notifier tous les grossistes ayant déjà répondu
      notification_title   := 'Nouveau message dans l''appel d''offres';
      notification_message := 'Le pharmacien a envoyé un nouveau message';
      notification_data    := jsonb_build_object(
                               'tender_id', tender_record.id,
                               'message',   NEW.message
                             );

      FOR wholesaler_record IN 
        SELECT u.* 
          FROM users u
          JOIN tender_responses tr 
            ON tr.wholesaler_id = u.id
         WHERE tr.tender_id = tender_record.id
      LOOP
        INSERT INTO notifications (
          user_id, type, title, message, data
        ) VALUES (
          wholesaler_record.id,
          'tender_message',
          notification_title,
          notification_message,
          notification_data
        );
      END LOOP;
    ELSE
      -- message d'un grossiste => notifier le pharmacien
      notification_title   := 'Nouveau message dans l''appel d''offres';
      notification_message := wholesaler_record.company_name || ' a envoyé un nouveau message';
      notification_data    := jsonb_build_object(
                               'tender_id',      tender_record.id,
                               'wholesaler_id',  NEW.user_id,
                               'wholesaler_name',wholesaler_record.company_name,
                               'message',        NEW.message
                             );

      INSERT INTO notifications (
        user_id, type, title, message, data
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


-- Assurez-vous que RLS est activé
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- Autoriser tout le monde (y compris non-connecté) à lire les lignes
CREATE POLICY "Public can read medications"
  ON medications
  FOR SELECT
  TO public
  USING (true);
