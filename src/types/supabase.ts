export type User = {
  id: string;
  email: string;
  role: 'pharmacist' | 'wholesaler';
  company_name: string;
  registration_number: string | null;
  address: string;
  wilaya: string;
  phone: string;
  is_verified: boolean;
  is_admin: boolean;
  created_at: string;
  delivery_wilayas: string[];
  subscription?: UserSubscription;
};

export type ParapharmacyProduct = {
  id: string;
  name: string;
  brand: string | null;
  category: ParapharmacyCategory;
  description: string | null;
  packaging: string | null;
  reference: string | null;
  image_data: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ParapharmacyCategory =
  | 'hygiene_and_care'
  | 'dermocosmetics'
  | 'dietary_supplements'
  | 'mother_and_baby'
  | 'orthopedics'
  | 'hair_care'
  | 'veterinary'
  | 'sun_care'
  | 'medical_devices'
  | 'accessories';

export type WholesalerParapharmacyInventory = {
  id: string;
  wholesaler_id: string;
  product_id: string;
  quantity: number;
  price: number;
  delivery_wilayas: string[];
  created_at: string;
  updated_at: string;
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
  laboratory?: string;
  COND?: string;
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
  expiry_date?: string | null;
};

export type Promotion = {
  id: string;
  wholesaler_id: string;
  medication_id: string;
  free_units_percentage: number;
  start_date: string;
  end_date: string;
  created_at: string;
  expiry_date?: string | null;
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
  medication_id: string | null;
  product_id: string | null;
  is_parapharmacy: boolean;
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

export type PromotionalOffer = {
  id: string;
  wholesaler_id: string;
  name: string;
  type: 'pack' | 'threshold';
  min_purchase_amount: number | null;
  is_public: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
  custom_total_price: number | null;
  comment?: string | null;
  max_quota_selections?: number | null;
  free_units_enabled?: boolean;
  free_text_products?: string | null;
};

export type OfferProduct = {
  id: string;
  offer_id: string;
  medication_id: string;
  quantity: number;
  price: number;
  is_priority: boolean;
  priority_message: string | null;
  free_units_percentage?: number | null;
  is_quota?: boolean;
  medications?: Medication;
  expiry_date?: string | null;
};

export type OfferDocument = {
  id: string;
  offer_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  created_at: string;
};

export type ActiveOffer = PromotionalOffer & {
  products: (OfferProduct & {
    medication: Medication;
  })[];
  documents?: OfferDocument[];
};

export type Region = {
  id: string;
  name: string;
  wilayas: string[];
};

export type WholesalerDeliveryDays = {
  id: string;
  wholesaler_id: string;
  region_id: string;
  delivery_days: string[];
};

export type RegionWithDeliveryDays = Region & {
  delivery_days?: string[];
};

// Tender System Types
export type Tender = {
  id: string;
  pharmacist_id: string;
  title: string;
  deadline: string;
  status: 'open' | 'closed' | 'canceled';
  wilaya: string;
  public_link: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  admin_facebook_link?: string | null;
  admin_facebook_profile?: string | null;
};

export type TenderItem = {
  id: string;
  tender_id: string;
  medication_id: string;
  quantity: number;
  created_at: string;
};

export type TenderResponse = {
  id: string;
  tender_id: string;
  wholesaler_id: string;
  created_at: string;
  updated_at: string;
};

export type TenderResponseItem = {
  id: string;
  tender_response_id: string;
  tender_item_id: string;
  price: number;
  free_units_percentage?: number | null;
  delivery_date: string;
  expiry_date?: string | null;
  created_at: string;
};

export type TenderMessage = {
  id: string;
  tender_id: string;
  user_id: string;
  message: string;
  created_at: string;
};