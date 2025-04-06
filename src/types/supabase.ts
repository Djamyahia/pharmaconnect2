export type User = {
  id: string;
  email: string;
  role: 'pharmacist' | 'wholesaler';
  company_name: string;
  registration_number: string;
  address: string;
  wilaya: string;
  phone: string;
  is_verified: boolean;
  is_admin: boolean;
  created_at: string;
  delivery_wilayas: string[];
};

export type Medication = {
  id: string;
  commercial_name: string;
  scientific_name: string;
  dosage: string;
  form: string;
  category: string;
  atc_code: string | null;
  excipients: string | null;
  recommended_price: number | null;
  amm_number: string | null;
  storage_conditions: string | null;
  status: string;
  created_at: string;
};

export type WholesalerInventory = {
  id: string;
  wholesaler_id: string;
  medication_id: string;
  quantity: number;
  price: number;
  delivery_wilayas: string[];
  created_at: string;
  updated_at: string;
};

export type Promotion = {
  id: string;
  wholesaler_id: string;
  medication_id: string;
  free_units_percentage: number;
  start_date: string;
  end_date: string;
  created_at: string;
  unit_price?: number;
  units_for_bonus?: number;
  bonus_units?: number;
};

export type Order = {
  id: string;
  pharmacist_id: string;
  wholesaler_id: string;
  status: 'pending' | 'pending_delivery_confirmation' | 'accepted' | 'canceled';
  delivery_date: string | null;
  delivery_status: 'pending' | 'accepted' | 'rejected';
  total_amount: number;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  medication_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
};

export type AppConfig = {
  id: string;
  free_period_start: string;
  free_period_end: string;
  default_trial_duration: number;
  updated_at: string;
  updated_by: string;
};

export type UserSubscription = {
  id: string;
  user_id: string;
  status: 'trial' | 'active' | 'expired' | 'pending_payment';
  trial_end_date: string;
  subscription_start: string | null;
  subscription_end: string | null;
  payment_status: 'pending' | 'validated' | 'rejected' | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type UserActivityLog = {
  id: string;
  user_id: string;
  action: string;
  page: string | null;
  metadata: Record<string, any>;
  created_at: string;
};

export type AdminNote = {
  id: string;
  user_id: string;
  note: string;
  created_by: string;
  created_at: string;
};