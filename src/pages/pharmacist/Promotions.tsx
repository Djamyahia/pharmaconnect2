import React, { useEffect, useState } from 'react';
import { Calendar, Search, Filter, Loader2, ShoppingCart, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Select from 'react-select';
import { customStyles, selectComponents } from '../../components/VirtualizedSelect';
import type { Medication, Promotion, RegionWithDeliveryDays } from '../../types/supabase';
import { algerianWilayas } from '../../lib/wilayas';
import { sendOrderNotification } from '../../lib/notifications';
import { UserLink } from '../../components/UserLink';
import { RegionSelector } from '../../components/RegionSelector';
import { DeliveryDaysDisplay } from '../../components/DeliveryDaysDisplay';
import { ExpiryDateDisplay } from '../../components/ExpiryDateDisplay';
import { getDeliveryDays } from '../../lib/regions';

export type ExtendedPromotion = Promotion & {
  medications: Medication;
  wholesaler: {
    company_name: string;
    wilaya: string;
    email: string;
    delivery_wilayas: string[];
  };
};

type OrderModalProps = {
  promotion: ExtendedPromotion;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  loading: boolean;
  deliveryDays: string[] | null;
};

function OrderModal({ promotion, onClose, onConfirm, loading, deliveryDays }: OrderModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('La quantité doit être supérieure à 0');
      return;
    }
    onConfirm(quantity);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Passer une commande</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {promotion.medications.commercial_name}
          </p>
          <p className="text-sm font-medium text-gray-900 mt-1">
            De : <UserLink user={promotion.wholesaler} />
          </p>
          <div className="mt-2">
            <p className="text-sm text-gray-500">Promotion :</p>
            <p className="text-sm font-medium text-green-600">
              {promotion.free_units_percentage}% UG
            </p>
            <ExpiryDateDisplay expiryDate={promotion.expiry_date} />
          </div>
          <div className="mt-2">
            <DeliveryDaysDisplay deliveryDays={deliveryDays} />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
              Quantité
            </label>
            <input
              type="number"
              id="quantity"
              min="1"
              value={quantity}
              onChange={(e) => {
                setError('');
                setQuantity(parseInt(e.target.value) || 0);
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Commande en cours...' : 'Commander'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Promotions() {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<ExtendedPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWilaya, setSelectedWilaya] = useState<string>('');
  const [orderLoading, setOrderLoading] = useState<string | null>(null);
  const [selectedPromotion, setSelectedPromotion] = useState<ExtendedPromotion | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionWithDeliveryDays | null>(null);
  const [deliveryDaysMap, setDeliveryDaysMap] = useState<Record<string, string[] | null>>({});
  const [loadingDeliveryDays, setLoadingDeliveryDays] = useState(false);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (user?.id) {
        fetchPromotions();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [user?.id, searchQuery, selectedWilaya]);

  useEffect(() => {
    if (selectedRegion) {
      fetchDeliveryDaysForRegion();
    } else {
      setDeliveryDaysMap({});
    }
  }, [selectedRegion]);

  async function fetchDeliveryDaysForRegion() {
    if (!selectedRegion) return;
    
    setLoadingDeliveryDays(true);
    const newDeliveryDaysMap: Record<string, string[] | null> = {};
    
    try {
      // Get all wholesalers
      const { data: wholesalers, error: wholesalersError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'wholesaler');
        
      if (wholesalersError) throw wholesalersError;
      
      // For each wholesaler, get their delivery days for the selected region
      for (const wholesaler of wholesalers || []) {
        const deliveryDays = await getDeliveryDays(wholesaler.id, selectedRegion.id);
        newDeliveryDaysMap[wholesaler.id] = deliveryDays;
      }
      
      setDeliveryDaysMap(newDeliveryDaysMap);
    } catch (error) {
      console.error('Error fetching delivery days:', error);
    } finally {
      setLoadingDeliveryDays(false);
    }
  }

  async function fetchPromotions() {
    try {
      let query = supabase
        .from('active_promotions_view')
        .select(`
          *,
          medications!inner (
            *,
            search_vector
          ),
          wholesaler:users!promotions_wholesaler_id_fkey (
            company_name,
            wilaya,
            email,
            delivery_wilayas
          )
        `);

      if (searchQuery) {
        // full-text search avec préfixe : match "searchQuery:*"
        query = query.textSearch(
          'medications.search_vector',
          `${searchQuery}:*`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des promotions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleOrder(promotion: ExtendedPromotion, quantity: number) {
    if (!user?.id) return;

    try {
      setOrderLoading(promotion.id);

      // 1) récupérer le prix unitaire depuis l'inventaire
      const { data: inv, error: invErr } = await supabase
        .from('wholesaler_inventory')
        .select('price')
        .eq('wholesaler_id', promotion.wholesaler_id)
        .eq('medication_id', promotion.medication_id)
        .single();
      if (invErr || !inv) throw invErr || new Error('Impossible de récupérer le prix');

      const unitPrice      = inv.price;
      const paidQty        = quantity;
      const freeQty        = Math.floor(quantity * promotion.free_units_percentage / 100);
      const totalAmountNum = paidQty * unitPrice;
      const totalAmount    = `${totalAmountNum.toFixed(2)} DZD`;

      // 2) créer la commande avec le montant correct
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          pharmacist_id: user.id,
          wholesaler_id: promotion.wholesaler_id,
          total_amount: totalAmountNum,
          status: 'pending'
        })
        .select()
        .single();
      if (orderErr || !orderData) throw orderErr;

      // 3) créer les lignes payantes puis gratuites
      const items = [{
        order_id:     orderData.id,
        medication_id: promotion.medication_id,
        quantity:      paidQty,
        unit_price:    unitPrice
      }];
      if (freeQty > 0) {
        items.push({
          order_id:     orderData.id,
          medication_id: promotion.medication_id,
          quantity:      freeQty,
          unit_price:    0
        });
      }
      const { error: itemsErr } = await supabase
        .from('order_items')
        .insert(items);
      if (itemsErr) throw itemsErr;

      // 4) notifier par email en passant unit_price et free_units_count
      try {
        await sendOrderNotification(
          'order_placed',
          promotion.wholesaler.email,
          {
            wholesaler_name:         promotion.wholesaler.company_name,
            pharmacist_name:         user.company_name,
            order_id:                orderData.id,
            product_name:            promotion.medications.commercial_name,
            product_form:            promotion.medications.form,
            product_dosage:          promotion.medications.dosage,
            quantity:                paidQty.toString(),
            unit_price:              unitPrice.toFixed(2),
            free_units_percentage:   promotion.free_units_percentage.toString(),
            free_units_count:        freeQty.toString(),
            total_amount:            totalAmount
          }
        );
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      alert('Commande créée avec succès !');
      setSelectedPromotion(null);
    } catch (error) {
      console.error('Erreur lors de la création de la commande:', error);
      alert('Échec de la création de la commande. Veuillez réessayer.');
    } finally {
      setOrderLoading(null);
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isPromotionActive = (promotion: ExtendedPromotion) => {
    const now = new Date();
    const startDate = new Date(promotion.start_date);
    const endDate = new Date(promotion.end_date);
    return now >= startDate && now <= endDate;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Ventes Flash UG</h2>
      </div>

      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Rechercher des médicaments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <RegionSelector 
            onRegionChange={setSelectedRegion}
            selectedRegion={selectedRegion}
          />
        </div>
      </div>

      {promotions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune promotion</h3>
          <p className="mt-1 text-sm text-gray-500">Revenez plus tard pour de nouvelles promotions.</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 ">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Médicament
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Promotion
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Période
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiration
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Livraison
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {promotions.map((promotion) => {
                  const isActive = isPromotionActive(promotion);
                  
                  return (
                    <tr key={promotion.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900 break-words">
                          {promotion.medications.commercial_name}
                        </div>
                        <div className="text-sm text-gray-500 break-words">
                          {promotion.medications.form} - {promotion.medications.dosage}
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          <UserLink user={promotion.wholesaler} />
                        </div>
                        
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {promotion.free_units_percentage}% UG
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>Du {formatDate(promotion.start_date)}</div>
                        <div>au {formatDate(promotion.end_date)}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          isActive 
                            ? 'bg-green-100 text-green-800'
                            : new Date() < new Date(promotion.start_date)
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {isActive 
                            ? 'Active'
                            : new Date() < new Date(promotion.start_date)
                              ? 'À venir'
                              : 'Terminée'
                          }
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <ExpiryDateDisplay expiryDate={promotion.expiry_date} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <DeliveryDaysDisplay 
                          deliveryDays={deliveryDaysMap[promotion.wholesaler_id]}
                          isLoading={loadingDeliveryDays}
                        />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => setSelectedPromotion(promotion)}
                          disabled={orderLoading === promotion.id || !promotion.wholesaler}
                          className="inline-flex items-center px-3 py-1.5 text-sm border border-transparent rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          <ShoppingCart className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Commander</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedPromotion && (
        <OrderModal
          promotion={selectedPromotion}
          onClose={() => setSelectedPromotion(null)}
          onConfirm={(quantity) => handleOrder(selectedPromotion, quantity)}
          loading={orderLoading === selectedPromotion.id}
          deliveryDays={deliveryDaysMap[selectedPromotion.wholesaler_id]}
        />
      )}
    </div>
  );
}
export { OrderModal };