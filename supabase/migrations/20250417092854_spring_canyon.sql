/*
  # Update order notifications system

  1. Changes
    - Update notify_order_status function to handle order cancellations
    - Add logic to determine who canceled the order
    - Send appropriate notifications to both parties

  2. Security
    - Maintain existing RLS policies
*/

-- Update the notify_order_status function
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
  canceling_user_id uuid;
  canceling_user_role text;
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
      -- Get the user who canceled the order
      SELECT session.user_id, users.role 
      INTO canceling_user_id, canceling_user_role
      FROM auth.sessions session
      JOIN users ON users.id = session.user_id
      WHERE session.id = (SELECT current_setting('request.jwt.claim.session_id', true));

      -- Order canceled
      SELECT * INTO template FROM email_templates WHERE type = 'order_canceled';
      
      -- Create notifications for both parties
      notification_data := jsonb_build_object(
        'order_id', NEW.id,
        'total_amount', NEW.total_amount,
        'canceled_by', CASE 
          WHEN canceling_user_role = 'pharmacist' THEN 'le pharmacien'
          WHEN canceling_user_role = 'wholesaler' THEN 'le grossiste'
          ELSE 'le système'
        END
      );

      -- For pharmacist
      IF canceling_user_id != NEW.pharmacist_id THEN
        -- Only notify pharmacist if they didn't cancel it themselves
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
          'Votre commande a été annulée par ' || 
            CASE 
              WHEN canceling_user_role = 'wholesaler' THEN wholesaler_name
              ELSE 'le système'
            END,
          notification_data
        );

        -- Send email to pharmacist
        PERFORM send_email(
          pharmacist_email,
          'order_canceled',
          jsonb_build_object(
            'recipient_name', pharmacist_name,
            'order_id', NEW.id,
            'total_amount', NEW.total_amount::text,
            'reason', 'Annulée par ' || 
              CASE 
                WHEN canceling_user_role = 'wholesaler' THEN 'le grossiste'
                ELSE 'le système'
              END
          )
        );
      END IF;
      
      -- For wholesaler
      IF canceling_user_id != NEW.wholesaler_id THEN
        -- Only notify wholesaler if they didn't cancel it themselves
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
          'Une commande a été annulée par ' || 
            CASE 
              WHEN canceling_user_role = 'pharmacist' THEN pharmacist_name
              ELSE 'le système'
            END,
          notification_data
        );

        -- Send email to wholesaler
        PERFORM send_email(
          wholesaler_email,
          'order_canceled',
          jsonb_build_object(
            'recipient_name', wholesaler_name,
            'order_id', NEW.id,
            'total_amount', NEW.total_amount::text,
            'reason', 'Annulée par ' || 
              CASE 
                WHEN canceling_user_role = 'pharmacist' THEN 'le pharmacien'
                ELSE 'le système'
              END
          )
        );
      END IF;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;