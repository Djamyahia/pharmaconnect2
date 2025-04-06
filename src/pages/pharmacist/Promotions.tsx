import React, { useEffect, useState } from 'react';
import { Calendar, Search, Filter, Loader2, ShoppingCart, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Select from 'react-select';
import { customStyles, selectComponents } from '../../components/VirtualizedSelect';
import type { Medication, Promotion } from '../../types/supabase';
import { algerianWilayas } from '../../lib/wilayas';
import { sendOrderNotification } from '../../lib/notifications';

type ExtendedPromotion = Promotion & {
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
};

function OrderModal({ promotion, onClose, onConfirm, loading }: OrderModalProps) {
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
            {promotion.medications.commercial_name} - {promotion.medications.form} {promotion.medications.dosage}
          </p>
          <p className="text-sm font-medium text-gray-900 mt-1">
            De : {promotion.wholesaler?.company_name || 'Grossiste inconnu'}
          </p>
          <div className="mt-2">
            <p className="text-sm text-gray-500">Promotion :</p>
            <p className="text-sm font-medium text-green-600">
              {promotion.free_units_percentage}% UG
            </p>
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

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (user?.id) {
        fetchPromotions();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [user?.id, searchQuery, selectedWilaya]);

  async function fetchPromotions() {
    if (!user?.id) return;

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
        query = query.textSearch('medications.search_vector', searchQuery);
      }

      if (selectedWilaya) {
        query = query.contains('wholesaler.delivery_wilayas', [selectedWilaya]);
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
    if (!user?.id || !promotion.wholesaler) return;

    try {
      setOrderLoading(promotion.id);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          pharmacist_id: user.id,
          wholesaler_id: promotion.wholesaler_id,
          total_amount: quantity,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: orderData.id,
          medication_id: promotion.medication_id,
          quantity: quantity,
          unit_price: 0
        });

      if (itemError) throw itemError;

      try {
        await sendOrderNotification(
          'order_placed',
          promotion.wholesaler.email,
          {
            wholesaler_name: promotion.wholesaler.company_name,
            pharmacist_name: user.company_name,
            order_id: orderData.id,
            total_amount: `${quantity} unités`
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
        <h2 className="text-2xl font-semibold text-gray-900">Promotions actives</h2>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
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

          <div className="relative">
            <Select
              value={algerianWilayas.find(w => w.value === selectedWilaya)}
              onChange={(selected) => setSelectedWilaya(selected?.value || '')}
              options={algerianWilayas}
              className="w-full"
              placeholder="Filtrer par wilaya de livraison..."
              isClearable
              styles={customStyles}
              components={selectComponents}
            />
          </div>
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Médicament
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grossiste
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Promotion
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Période
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {promotions.map((promotion) => (
                <tr key={promotion.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {promotion.medications.commercial_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {promotion.medications.form} - {promotion.medications.dosage}
                      {promotion.medications.COND && ` (${promotion.medications.COND})`}
                    </div>
                    {promotion.medications.laboratory && (
                      <div className="text-xs text-gray-500">
                        {promotion.medications.laboratory}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {promotion.wholesaler?.company_name || 'Grossiste inconnu'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {promotion.wholesaler?.wilaya || 'Wilaya non spécifiée'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {promotion.free_units_percentage}% UG
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      Du {formatDate(promotion.start_date)}
                    </div>
                    <div className="text-sm text-gray-900">
                      au {formatDate(promotion.end_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedPromotion(promotion)}
                      disabled={orderLoading === promotion.id || !promotion.wholesaler}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Commander
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPromotion && (
        <OrderModal
          promotion={selectedPromotion}
          onClose={() => setSelectedPromotion(null)}
          onConfirm={(quantity) => handleOrder(selectedPromotion, quantity)}
          loading={orderLoading === selectedPromotion.id}
        />
      )}
    </div>
  );
}