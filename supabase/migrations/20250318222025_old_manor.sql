/*
  # Add Notifications System

  1. New Tables
    - `notifications` - Stores user notifications
      - `id` (uuid, primary key) - Notification unique identifier
      - `user_id` (uuid) - Reference to user receiving the notification
      - `type` (text) - Type of notification (order_placed, order_status_updated, etc.)
      - `title` (text) - Notification title
      - `message` (text) - Notification message
      - `data` (jsonb) - Additional notification data (order_id, etc.)
      - `read` (boolean) - Whether notification has been read
      - `created_at` (timestamp) - When notification was created

  2. Security
    - Enable RLS on notifications table
    - Add policies for user access
*/

-- Create notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own notifications
CREATE POLICY "Users can read their own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Create policy for users to update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create function to create order notifications
CREATE OR REPLACE FUNCTION create_order_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When a new order is created
  IF TG_OP = 'INSERT' THEN
    -- Create notification for wholesaler
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.wholesaler_id,
      'order_placed',
      'New Order Received',
      'A new order has been placed by a pharmacist.',
      jsonb_build_object('order_id', NEW.id)
    );

  -- When an order status is updated
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- If order is accepted/rejected by wholesaler
    IF NEW.status = 'pending_delivery_confirmation' THEN
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        NEW.pharmacist_id,
        'order_accepted',
        'Order Accepted - Delivery Date Proposed',
        'Your order has been accepted. Please confirm the proposed delivery date.',
        jsonb_build_object('order_id', NEW.id, 'delivery_date', NEW.delivery_date)
      );
    ELSIF NEW.status = 'canceled' THEN
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        NEW.pharmacist_id,
        'order_canceled',
        'Order Canceled',
        'Your order has been canceled.',
        jsonb_build_object('order_id', NEW.id)
      );
    ELSIF NEW.status = 'accepted' THEN
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        NEW.wholesaler_id,
        'order_confirmed',
        'Order Confirmed',
        'The pharmacist has confirmed the delivery date.',
        jsonb_build_object('order_id', NEW.id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for order notifications
CREATE TRIGGER order_notification_trigger
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_order_notification();