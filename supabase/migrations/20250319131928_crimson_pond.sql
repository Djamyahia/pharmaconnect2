/*
  # Add email notifications system

  1. New Tables
    - `email_templates`
      - `id` (uuid, primary key)
      - `type` (text) - Type of email template
      - `subject` (text) - Email subject
      - `content` (text) - Email content with placeholders
      - `created_at` (timestamptz)

  2. Functions
    - `notify_order_status()` - Function to create notifications for order status changes

  3. Security
    - Enable RLS on `email_templates` table
    - Add policy for authenticated users to read templates

  Note: This migration adds support for sending automated notifications for order status changes.
*/

-- Add cancel_reason column to orders table if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'cancel_reason'
  ) THEN
    ALTER TABLE orders ADD COLUMN cancel_reason text;
  END IF;
END $$;

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Add RLS policy
CREATE POLICY "Allow read access to email templates"
  ON email_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert default email templates
INSERT INTO email_templates (type, subject, content) VALUES
  ('order_placed', 'Nouvelle commande reçue', 'Bonjour {{wholesaler_name}},

Une nouvelle commande a été passée par {{pharmacist_name}}.

Détails de la commande :
- Numéro de commande : {{order_id}}
- Montant total : {{total_amount}} DZD

Veuillez vous connecter à votre tableau de bord pour examiner et traiter cette commande.

Cordialement,
L''équipe PharmaConnect'),

  ('order_accepted', 'Commande acceptée', 'Bonjour {{pharmacist_name}},

Votre commande a été acceptée par {{wholesaler_name}}.

Détails de la commande :
- Numéro de commande : {{order_id}}
- Date de livraison proposée : {{delivery_date}}
- Montant total : {{total_amount}} DZD

Veuillez vous connecter à votre tableau de bord pour confirmer la date de livraison.

Cordialement,
L''équipe PharmaConnect'),

  ('order_canceled', 'Commande annulée', 'Bonjour {{recipient_name}},

La commande {{order_id}} a été annulée.

Détails de la commande :
- Montant total : {{total_amount}} DZD
- Raison : {{reason}}

Pour plus d''informations, veuillez vous connecter à votre tableau de bord.

Cordialement,
L''équipe PharmaConnect'),

  ('delivery_confirmed', 'Date de livraison confirmée', 'Bonjour {{wholesaler_name}},

{{pharmacist_name}} a confirmé la date de livraison pour la commande {{order_id}}.

Détails de la livraison :
- Date de livraison : {{delivery_date}}
- Adresse : {{delivery_address}}

Veuillez vous assurer que la commande sera livrée à la date convenue.

Cordialement,
L''équipe PharmaConnect'),

  ('delivery_rejected', 'Date de livraison rejetée', 'Bonjour {{wholesaler_name}},

{{pharmacist_name}} a rejeté la date de livraison proposée pour la commande {{order_id}}.

Veuillez vous connecter à votre tableau de bord pour proposer une nouvelle date de livraison.

Cordialement,
L''équipe PharmaConnect');

-- Function to create notifications for order status changes
CREATE OR REPLACE FUNCTION notify_order_status()
RETURNS TRIGGER AS $$
DECLARE
  template email_templates;
  pharmacist_email text;
  wholesaler_email text;
  pharmacist_name text;
  wholesaler_name text;
  delivery_address text;
  notification_title text;
  notification_message text;
  notification_data jsonb;
BEGIN
  -- Get emails and names
  SELECT email, company_name INTO pharmacist_email, pharmacist_name
  FROM users WHERE id = NEW.pharmacist_id;
  
  SELECT email, company_name INTO wholesaler_email, wholesaler_name
  FROM users WHERE id = NEW.wholesaler_id;

  -- Get delivery address
  SELECT address || ', ' || wilaya INTO delivery_address
  FROM users WHERE id = NEW.pharmacist_id;

  -- Handle different order status changes
  CASE
    WHEN TG_OP = 'INSERT' THEN
      -- New order placed
      SELECT * INTO template FROM email_templates WHERE type = 'order_placed';
      
      -- Create notification for wholesaler
      notification_title := 'Nouvelle commande reçue';
      notification_message := 'Une nouvelle commande a été passée par ' || pharmacist_name;
      notification_data := jsonb_build_object(
        'order_id', NEW.id,
        'total_amount', NEW.total_amount
      );

      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        NEW.wholesaler_id,
        'order_placed',
        notification_title,
        notification_message,
        notification_data
      );

    WHEN NEW.status = 'pending_delivery_confirmation' AND OLD.status = 'pending' THEN
      -- Order accepted by wholesaler
      SELECT * INTO template FROM email_templates WHERE type = 'order_accepted';
      
      -- Create notification for pharmacist
      notification_title := 'Commande acceptée';
      notification_message := 'Votre commande a été acceptée par ' || wholesaler_name;
      notification_data := jsonb_build_object(
        'order_id', NEW.id,
        'delivery_date', NEW.delivery_date,
        'total_amount', NEW.total_amount
      );

      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        NEW.pharmacist_id,
        'order_accepted',
        notification_title,
        notification_message,
        notification_data
      );

    WHEN NEW.status = 'accepted' AND OLD.status = 'pending_delivery_confirmation' THEN
      -- Delivery date confirmed by pharmacist
      SELECT * INTO template FROM email_templates WHERE type = 'delivery_confirmed';
      
      -- Create notification for wholesaler
      notification_title := 'Date de livraison confirmée';
      notification_message := pharmacist_name || ' a confirmé la date de livraison';
      notification_data := jsonb_build_object(
        'order_id', NEW.id,
        'delivery_date', NEW.delivery_date,
        'delivery_address', delivery_address
      );

      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        NEW.wholesaler_id,
        'delivery_confirmed',
        notification_title,
        notification_message,
        notification_data
      );

    WHEN NEW.status = 'canceled' THEN
      -- Order canceled
      SELECT * INTO template FROM email_templates WHERE type = 'order_canceled';
      
      -- Create notifications for both parties
      notification_data := jsonb_build_object(
        'order_id', NEW.id,
        'total_amount', NEW.total_amount,
        'reason', COALESCE(NEW.cancel_reason, 'Non spécifiée')
      );

      -- For pharmacist
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        NEW.pharmacist_id,
        'order_canceled',
        'Commande annulée',
        'Votre commande a été annulée',
        notification_data
      );
      
      -- For wholesaler
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        NEW.wholesaler_id,
        'order_canceled',
        'Commande annulée',
        'Une commande a été annulée',
        notification_data
      );
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order notifications
DROP TRIGGER IF EXISTS order_notification_trigger ON orders;
CREATE TRIGGER order_notification_trigger
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status();