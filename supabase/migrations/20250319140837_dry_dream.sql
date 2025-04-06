/*
  # Add email notifications system

  1. New Tables
    - `email_templates`
      - `id` (uuid, primary key)
      - `type` (text) - Type of email template
      - `subject` (text) - Email subject
      - `content` (text) - Email content with placeholders
      - `created_at` (timestamptz)

  2. Security
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

-- Create email_templates table if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'email_templates'
  ) THEN
    CREATE TABLE email_templates (
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
L''équipe PharmConnect'),

      ('order_accepted', 'Commande acceptée', 'Bonjour {{pharmacist_name}},

Votre commande a été acceptée par {{wholesaler_name}}.

Détails de la commande :
- Numéro de commande : {{order_id}}
- Date de livraison proposée : {{delivery_date}}
- Montant total : {{total_amount}} DZD

Veuillez vous connecter à votre tableau de bord pour confirmer la date de livraison.

Cordialement,
L''équipe PharmConnect'),

      ('order_canceled', 'Commande annulée', 'Bonjour {{recipient_name}},

La commande {{order_id}} a été annulée.

Détails de la commande :
- Montant total : {{total_amount}} DZD
- Raison : {{reason}}

Pour plus d''informations, veuillez vous connecter à votre tableau de bord.

Cordialement,
L''équipe PharmConnect'),

      ('delivery_confirmed', 'Date de livraison confirmée', 'Bonjour {{wholesaler_name}},

{{pharmacist_name}} a confirmé la date de livraison pour la commande {{order_id}}.

Détails de la livraison :
- Date de livraison : {{delivery_date}}
- Adresse : {{delivery_address}}

Veuillez vous assurer que la commande sera livrée à la date convenue.

Cordialement,
L''équipe PharmConnect'),

      ('delivery_rejected', 'Date de livraison rejetée', 'Bonjour {{wholesaler_name}},

{{pharmacist_name}} a rejeté la date de livraison proposée pour la commande {{order_id}}.

Veuillez vous connecter à votre tableau de bord pour proposer une nouvelle date de livraison.

Cordialement,
L''équipe PharmConnect');
  END IF;
END $$;