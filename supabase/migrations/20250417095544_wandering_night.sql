-- Update the order_canceled template to remove reason field
UPDATE email_templates 
SET content = 'Bonjour {{recipient_name}},

La commande {{order_id}} a été annulée.

Détails de la commande :
- Produit : {{product_name}}{{#if product_form}} ({{product_form}} {{product_dosage}}){{/if}}
{{#if product_brand}}- Marque : {{product_brand}}{{/if}}
{{#if product_category}}- Catégorie : {{product_category}}{{/if}}
- Quantité : {{quantity}} unités
- Prix unitaire : {{unit_price}} DZD
- Sous-total : {{subtotal}} DZD
- Montant total : {{total_amount}} DZD
- Statut : Annulée

Pour plus d''informations, veuillez vous connecter à votre tableau de bord.

Cordialement,
L''équipe PharmaConnect'
WHERE type = 'order_canceled';

-- Drop cancel_reason column from orders table if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'cancel_reason'
  ) THEN
    ALTER TABLE orders DROP COLUMN cancel_reason;
  END IF;
END $$;

-- Update the notify_order_status function to remove cancel_reason
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
        'total_amount', NEW.total_amount
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