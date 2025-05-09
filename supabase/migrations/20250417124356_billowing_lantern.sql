/*
  # Update notify_order_status function to use promotion price

  1. Changes
    - Update notify_order_status function to use promotion price when available
    - Update total amount calculation to use the correct price
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
  order_item record;
  unit_price numeric;
  total_amount numeric;
  product_name text;
  product_form text;
  product_dosage text;
  product_brand text;
  product_category text;
  active_promotion record;
BEGIN
  -- Get emails and names
  SELECT email, company_name INTO pharmacist_email, pharmacist_name
  FROM users WHERE id = NEW.pharmacist_id;
  
  SELECT email, company_name INTO wholesaler_email, wholesaler_name
  FROM users WHERE id = NEW.wholesaler_id;

  -- Get delivery address
  SELECT address || ', ' || wilaya INTO delivery_address
  FROM users WHERE id = NEW.pharmacist_id;

  -- Get order item details
  SELECT * INTO order_item FROM order_items 
  WHERE order_id = NEW.id 
  LIMIT 1;

  -- Get product details and price based on type
  IF order_item.is_parapharmacy THEN
    -- Parapharmacy product
    SELECT 
      p.name,
      p.brand,
      p.category::text,
      i.price
    INTO 
      product_name,
      product_brand,
      product_category,
      unit_price
    FROM parapharmacy_products p
    JOIN wholesaler_parapharmacy_inventory i ON i.product_id = p.id
    WHERE p.id = order_item.product_id;
  ELSE
    -- Medication - check for active promotion
    SELECT 
      m.commercial_name,
      m.form,
      m.dosage,
      COALESCE(p.price, i.price) as price
    INTO 
      product_name,
      product_form,
      product_dosage,
      unit_price
    FROM medications m
    JOIN wholesaler_inventory i ON i.medication_id = m.id
    LEFT JOIN promotions p ON 
      p.medication_id = m.id AND 
      p.wholesaler_id = i.wholesaler_id AND
      CURRENT_TIMESTAMP BETWEEN p.start_date AND p.end_date
    WHERE m.id = order_item.medication_id;
  END IF;

  -- Calculate total amount based on actual price
  total_amount := order_item.quantity * unit_price;

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
        'product_name', product_name,
        'product_form', CASE WHEN NOT order_item.is_parapharmacy THEN product_form ELSE NULL END,
        'product_dosage', CASE WHEN NOT order_item.is_parapharmacy THEN product_dosage ELSE NULL END,
        'product_brand', CASE WHEN order_item.is_parapharmacy THEN product_brand ELSE NULL END,
        'product_category', CASE WHEN order_item.is_parapharmacy THEN product_category ELSE NULL END,
        'quantity', order_item.quantity,
        'unit_price', unit_price,
        'total_amount', total_amount
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
        'product_name', product_name,
        'product_form', CASE WHEN NOT order_item.is_parapharmacy THEN product_form ELSE NULL END,
        'product_dosage', CASE WHEN NOT order_item.is_parapharmacy THEN product_dosage ELSE NULL END,
        'product_brand', CASE WHEN order_item.is_parapharmacy THEN product_brand ELSE NULL END,
        'product_category', CASE WHEN order_item.is_parapharmacy THEN product_category ELSE NULL END,
        'quantity', order_item.quantity,
        'unit_price', unit_price,
        'total_amount', total_amount,
        'delivery_date', NEW.delivery_date
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
        'delivery_address', delivery_address,
        'product_name', product_name,
        'product_form', CASE WHEN NOT order_item.is_parapharmacy THEN product_form ELSE NULL END,
        'product_dosage', CASE WHEN NOT order_item.is_parapharmacy THEN product_dosage ELSE NULL END,
        'product_brand', CASE WHEN order_item.is_parapharmacy THEN product_brand ELSE NULL END,
        'product_category', CASE WHEN order_item.is_parapharmacy THEN product_category ELSE NULL END,
        'quantity', order_item.quantity,
        'unit_price', unit_price,
        'total_amount', total_amount
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
        'product_name', product_name,
        'product_form', CASE WHEN NOT order_item.is_parapharmacy THEN product_form ELSE NULL END,
        'product_dosage', CASE WHEN NOT order_item.is_parapharmacy THEN product_dosage ELSE NULL END,
        'product_brand', CASE WHEN order_item.is_parapharmacy THEN product_brand ELSE NULL END,
        'product_category', CASE WHEN order_item.is_parapharmacy THEN product_category ELSE NULL END,
        'quantity', order_item.quantity,
        'unit_price', unit_price,
        'total_amount', total_amount
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