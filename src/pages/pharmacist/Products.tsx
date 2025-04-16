import React, { useEffect, useState } from 'react';
import { Search, Filter, Loader2, ShoppingCart, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Select from 'react-select';
import { customStyles, selectComponents } from '../../components/VirtualizedSelect';
import type { Medication, WholesalerInventory } from '../../types/supabase';
import { algerianWilayas } from '../../lib/wilayas';
import { sendOrderNotification } from '../../lib/notifications';
import { ProductTypeNav } from '../../components/ProductTypeNav';
import { UserLink } from '../../components/UserLink';

type MedicationWithInventory = Medication & {
  wholesaler_inventory: (WholesalerInventory & {
    users: {
      company_name: string;
      wilaya: string;
      email: string;
    };
  })[];
};

type OrderModalProps = {
  medication: MedicationWithInventory;
  inventory: WholesalerInventory & {
    users: {
      company_name: string;
      wilaya: string;
      email: string;
    };
  };
  price: number;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
};

function OrderModal({ medication, inventory, price, onClose, onConfirm }: OrderModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('La quantité doit être supérieure à 0');
      return;
    }
    if (quantity > inventory.quantity) {
      setError('La quantité ne peut pas dépasser le stock disponible');
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
            {medication.commercial_name} - {medication.form} {medication.dosage}
          </p>
          <p className="text-sm font-medium text-gray-900 mt-1">
            De : <UserLink user={inventory.users} />
          </p>
          <p className="text-sm text-gray-600">
            Stock disponible : {inventory.quantity} unités
          </p>
          <p className="text-sm font-medium text-gray-900 mt-2">
            Prix unitaire : {inventory.price.toFixed(2)} DZD
          </p>
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
              max={inventory.quantity}
              value={quantity}
              onChange={(e) => {
                setError('');
                setQuantity(parseInt(e.target.value) || 0);
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-gray-600">Montant total :</p>
            <p className="text-lg font-bold text-gray-900">
              {(inventory.price * quantity).toFixed(2)} DZD
            </p>
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
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Commander
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Products() {
  const { user } = useAuth();
  const [medications, setMedications] = useState<MedicationWithInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWilaya, setSelectedWilaya] = useState<string>('');
  const [promotionsMap, setPromotionsMap] = useState<Record<string, { free_units_percentage: number }>>({});
  const [orderModal, setOrderModal] = useState<{
    show: boolean;
    medication: MedicationWithInventory | null;
    inventory: (WholesalerInventory & { users: { company_name: string; wilaya: string; email: string } }) | null;
    price: number;
  }>({
    show: false,
    medication: null,
    inventory: null,
    price: 0
  });

  useEffect(() => {
    if (user?.id) {
      fetchMedications();
    }
  }, [user?.id]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (user?.id) {
        fetchMedications();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, selectedWilaya]);

  async function fetchMedications() {
    try {
      let query = supabase
        .from('medications')
        .select(`
          *,
          wholesaler_inventory!inner (
            *,
            users (
              company_name,
              wilaya,
              email
            )
          )
        `);

      if (searchQuery) {
        query = query.or(`commercial_name.ilike.%${searchQuery}%,scientific_name.ilike.%${searchQuery}%`);
      }

      const { data: medsData, error: medsError } = await query;

      if (medsError) throw medsError;

      let filteredMeds = medsData || [];

      if (selectedWilaya) {
        filteredMeds = filteredMeds.filter(med => 
          med.wholesaler_inventory.some(inv => 
            inv.delivery_wilayas.includes(selectedWilaya)
          )
        );
      }

      const { data: promoData, error: promoError } = await supabase
        .from('active_promotions_view')
        .select('*');

      if (promoError) throw promoError;

      const newPromotionsMap: Record<string, { free_units_percentage: number }> = {};
      
      promoData?.forEach(promo => {
        const key = `${promo.wholesaler_id}-${promo.medication_id}`;
        newPromotionsMap[key] = {
          free_units_percentage: promo.free_units_percentage
        };
      });

      setPromotionsMap(newPromotionsMap);
      setMedications(filteredMeds);
    } catch (error) {
      console.error('Error fetching medications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createOrder(medication: MedicationWithInventory, inventory: WholesalerInventory & { users: { company_name: string; wilaya: string; email: string } }, quantity: number) {
    if (!user?.id) {
      alert('Veuillez vous connecter pour passer des commandes.');
      return;
    }

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          pharmacist_id: user.id,
          wholesaler_id: inventory.wholesaler_id,
          total_amount: inventory.price * quantity,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: orderData.id,
          medication_id: medication.id,
          quantity: quantity,
          unit_price: inventory.price
        });

      if (itemError) throw itemError;

      try {
        await sendOrderNotification(
          'order_placed',
          inventory.users.email,
          {
            wholesaler_name: inventory.users.company_name,
            pharmacist_name: user.company_name,
            order_id: orderData.id,
            total_amount: `${(inventory.price * quantity).toFixed(2)} DZD`
          }
        );
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      alert('Commande créée avec succès !');
      setOrderModal({ show: false, medication: null, inventory: null, price: 0 });
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Échec de la création de la commande. Veuillez réessayer.');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProductTypeNav />
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

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {medications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Aucun médicament ne correspond à vos critères.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {medications.map((medication) => (
              <li key={medication.id} className="p-6">
                <div className="flex flex-col space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {medication.commercial_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {medication.scientific_name}
                    </p>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Forme :</span>
                        <p className="text-sm text-gray-900">{medication.form}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Dosage :</span>
                        <p className="text-sm text-gray-900">{medication.dosage}</p>
                      </div>
                      {medication.COND && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Conditionnement :</span>
                          <p className="text-sm text-gray-900">{medication.COND}</p>
                        </div>
                      )}
                      {medication.laboratory && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Laboratoire :</span>
                          <p className="text-sm text-gray-900">{medication.laboratory}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Disponible chez {medication.wholesaler_inventory.length} grossiste{medication.wholesaler_inventory.length > 1 ? 's' : ''}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {medication.wholesaler_inventory.map((inventory) => {
                        const promoKey = `${inventory.wholesaler_id}-${medication.id}`;
                        const activePromotion = promotionsMap[promoKey];
                        
                        return (
                          <div
                            key={inventory.id}
                            className="flex flex-col p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    <UserLink user={inventory.users} />
                                  </p>
                                  <p className="text-sm text-gray-600">{inventory.users.wilaya}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Livre dans : {inventory.delivery_wilayas.map(w => algerianWilayas.find(aw => aw.value === w)?.label).join(', ')}
                                  </p>
                                </div>
                              </div>
                              {activePromotion && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {activePromotion.free_units_percentage}% UG
                                </span>
                              )}
                            </div>
                            
                            <div className="mt-4 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {inventory.price.toFixed(2)} DZD
                                </p>
                                <p className="text-sm text-gray-600">
                                  Stock : {inventory.quantity} unités
                                </p>
                              </div>
                              <button
                                onClick={() => setOrderModal({
                                  show: true,
                                  medication,
                                  inventory,
                                  price: inventory.price
                                })}
                                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                                disabled={inventory.quantity === 0}
                              >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Commander
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {orderModal.show && orderModal.medication && orderModal.inventory && (
        <OrderModal
          medication={orderModal.medication}
          inventory={orderModal.inventory}
          price={orderModal.price}
          onClose={() => setOrderModal({ show: false, medication: null, inventory: null, price: 0 })}
          onConfirm={(quantity) => createOrder(orderModal.medication!, orderModal.inventory!, quantity)}
        />
      )}
    </div>
  );
}