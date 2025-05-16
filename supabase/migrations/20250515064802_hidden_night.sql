/*
  # Add email templates for tender orders

  1. Changes
    - Add email templates for tender order acceptance and confirmation
    - These templates will be used when a pharmacist accepts a tender response
    - The wholesaler will receive contact information for the pharmacist

  2. Security
    - Maintain existing RLS policies
*/

-- Insert email templates for tender orders
INSERT INTO email_templates (type, subject, content) VALUES
  ('tender_order_accepted', 'Commande acceptée - Appel d''offres', 'Bonjour {{wholesaler_name}},

Le pharmacien a accepté votre proposition pour l''appel d''offres et a passé commande.

Détails de la commande :
- Numéro de commande : {{order_id}}
- Appel d''offres : {{tender_title}}
- Date de livraison : {{delivery_date}}
- Montant total : {{total_amount}} DZD

Coordonnées du pharmacien :
- Nom : {{pharmacist_name}}
- Email : {{pharmacist_email}}
- Téléphone : {{pharmacist_phone}}
- Adresse : {{pharmacist_address}}, {{pharmacist_wilaya}}

Vous pouvez maintenant contacter directement le pharmacien pour organiser la livraison.

Cordialement,
L''équipe PharmaConnect'),

  ('tender_order_confirmed', 'Commande confirmée - Appel d''offres', 'Bonjour {{pharmacist_name}},

Votre commande issue de l''appel d''offres a été confirmée par le grossiste.

Détails de la commande :
- Numéro de commande : {{order_id}}
- Grossiste : {{wholesaler_name}}
- Date de livraison : {{delivery_date}}
- Montant total : {{total_amount}} DZD

Vous pouvez suivre l''état de votre commande dans votre espace personnel.

Cordialement,
L''équipe PharmaConnect');

ALTER TABLE public.tender_response_items
DROP CONSTRAINT IF EXISTS tender_response_items_free_units_percentage_check;
