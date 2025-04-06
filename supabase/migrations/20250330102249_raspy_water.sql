/*
  # Add Admin System and Subscription Management

  1. New Tables
    - `app_config` - Global application configuration
      - `id` (uuid, primary key)
      - `free_period_start` (timestamptz)
      - `free_period_end` (timestamptz)
      - `default_trial_duration` (integer)
      - `updated_at` (timestamptz)
      - `updated_by` (uuid)

    - `user_subscriptions` - User subscription details
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `status` (text)
      - `trial_end_date` (timestamptz)
      - `subscription_start` (timestamptz)
      - `subscription_end` (timestamptz)
      - `payment_status` (text)
      - `payment_reference` (text)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `user_activity_logs` - Track user activity
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `action` (text)
      - `page` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

    - `admin_notes` - Notes on user accounts
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `note` (text)
      - `created_by` (uuid)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for admin access
    - Add function to check admin status

  3. Functions
    - Check subscription status
    - Update subscription status
    - Log user activity
*/

-- Create enum types
CREATE TYPE subscription_status AS ENUM (
  'trial',
  'active',
  'expired',
  'pending_payment'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'validated',
  'rejected'
);

-- Create app_config table
CREATE TABLE app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  free_period_start timestamptz,
  free_period_end timestamptz,
  default_trial_duration integer NOT NULL DEFAULT 30,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  CHECK (free_period_end > free_period_start)
);

-- Create user_subscriptions table
CREATE TABLE user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  status subscription_status NOT NULL DEFAULT 'trial',
  trial_end_date timestamptz NOT NULL,
  subscription_start timestamptz,
  subscription_end timestamptz,
  payment_status payment_status,
  payment_reference text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (subscription_end > subscription_start)
);

-- Create user_activity_logs table
CREATE TABLE user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  action text NOT NULL,
  page text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create admin_notes table
CREATE TABLE admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  note text NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add is_admin column to users table
ALTER TABLE users
ADD COLUMN is_admin boolean DEFAULT false;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND is_admin = true
  );
$$;

-- Create function to check subscription status
CREATE OR REPLACE FUNCTION check_subscription_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update subscription status based on dates
  UPDATE user_subscriptions
  SET status = CASE
    WHEN CURRENT_TIMESTAMP <= trial_end_date THEN 'trial'
    WHEN subscription_end IS NULL OR CURRENT_TIMESTAMP > subscription_end THEN 'expired'
    ELSE 'active'
  END,
  updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Create trigger for subscription status updates
CREATE TRIGGER update_subscription_status
  AFTER INSERT OR UPDATE OF trial_end_date, subscription_end
  ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION check_subscription_status();

-- Create function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_action text,
  p_page text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_activity_logs (user_id, action, page, metadata)
  VALUES (auth.uid(), p_action, p_page, p_metadata);
END;
$$;

-- Enable RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for app_config
CREATE POLICY "Allow read access to all authenticated users"
  ON app_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all access to admins"
  ON app_config
  FOR ALL
  TO authenticated
  USING (is_admin());

-- Create policies for user_subscriptions
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all subscriptions"
  ON user_subscriptions
  FOR ALL
  TO authenticated
  USING (is_admin());

-- Create policies for user_activity_logs
CREATE POLICY "Users can view their own activity logs"
  ON user_activity_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all activity logs"
  ON user_activity_logs
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "System can create activity logs"
  ON user_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policies for admin_notes
CREATE POLICY "Admins can manage notes"
  ON admin_notes
  FOR ALL
  TO authenticated
  USING (is_admin());

-- Insert default app configuration
INSERT INTO app_config (
  free_period_start,
  free_period_end,
  default_trial_duration
) VALUES (
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '6 months',
  30
);

-- Create email templates for subscription notifications
INSERT INTO email_templates (type, subject, content) VALUES
  ('trial_ending_soon', 'Votre période d''essai se termine bientôt', 'Bonjour {{user_name}},

Votre période d''essai de PharmConnect se termine dans {{days_remaining}} jours.

Pour continuer à utiliser tous les services de la plateforme, veuillez procéder au paiement de votre abonnement.

Détails de l''abonnement :
- Date de fin d''essai : {{trial_end_date}}
- Montant à payer : {{subscription_amount}} DZD

Pour plus d''informations sur le paiement, veuillez consulter votre tableau de bord.

Cordialement,
L''équipe PharmConnect'),

  ('subscription_expired', 'Votre abonnement a expiré', 'Bonjour {{user_name}},

Votre abonnement PharmConnect a expiré.

Pour réactiver votre compte et continuer à utiliser nos services, veuillez procéder au renouvellement de votre abonnement.

Pour plus d''informations sur le paiement, veuillez consulter votre tableau de bord.

Cordialement,
L''équipe PharmConnect'),

  ('payment_validated', 'Paiement validé - Abonnement actif', 'Bonjour {{user_name}},

Nous confirmons la validation de votre paiement pour votre abonnement PharmConnect.

Détails de l''abonnement :
- Date de début : {{subscription_start}}
- Date de fin : {{subscription_end}}
- Référence de paiement : {{payment_reference}}

Votre compte est maintenant actif et vous pouvez profiter de tous nos services.

Cordialement,
L''équipe PharmConnect');

-- Create function to send subscription reminder emails
CREATE OR REPLACE FUNCTION send_trial_ending_reminder()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  subscription RECORD;
  user_record RECORD;
BEGIN
  FOR subscription IN
    SELECT s.*, u.email, u.company_name
    FROM user_subscriptions s
    JOIN users u ON u.id = s.user_id
    WHERE s.status = 'trial'
    AND s.trial_end_date - INTERVAL '5 days' <= CURRENT_TIMESTAMP
    AND s.trial_end_date > CURRENT_TIMESTAMP
  LOOP
    -- Send email using existing notification system
    PERFORM send_email(
      subscription.email,
      'trial_ending_soon',
      json_build_object(
        'user_name', subscription.company_name,
        'days_remaining', EXTRACT(DAY FROM subscription.trial_end_date - CURRENT_TIMESTAMP),
        'trial_end_date', subscription.trial_end_date
      )
    );
  END LOOP;
END;
$$;