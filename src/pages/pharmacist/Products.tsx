import React, { useEffect, useState } from 'react';
import { Search, Filter, Loader2, ShoppingCart, X, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Select from 'react-select';
import { customStyles, selectComponents } from '../../components/VirtualizedSelect';
import type { Medication, WholesalerInventory, ActiveOffer } from '../../types/supabase';
import { algerianWilayas } from '../../lib/wilayas';
import { sendOrderNotification } from '../../lib/notifications';
import { ProductTypeNav } from '../../components/ProductTypeNav';
import { UserLink } from '../../components/UserLink';
import { Link } from 'react-router-dom';

type MedicationWithInventory = Medication & {
  wholesaler_inventory: (WholesalerInventory & {
    users: {
      company_name: string;
      wilaya: string;
      email: string;
    };
  })[];
  offers?: {
    id: string;
    name: string;
    type: 'pack' | 'threshold';
  }[];
  isPriorityInOffers?: {
    id: string;
    name: string;
    type: 'pack' | 'threshold';
  }[];
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
  loading: boolean;
};

function OrderModal({ medication, inventory, price, onClose, onConfirm, loading }: OrderModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [showAllWilayas, setShowAllWilayas] = useState(false);

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

  const formatWilayasList = (wilayas: string[]) => {
    const wilayaNames = wilayas.map(w => 
      algerianWilayas.find(aw => aw.value === w)?.label?.split(' - ')[1] || w
    );
    
    if (!showAllWilayas && wilayaNames.length > 5) {
      return (
        <div className="space-y-1">
          <div>{wilayaNames.slice(0, 5).join(', ')}</div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setShowAllWilayas(true);
            }}
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            Voir {wilayaNames.length - 5} autres wilayas...
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex flex-wrap gap-1">
          {wilayaNames.map((name, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
            >
              {name}
            </span>
          ))}
        </div>
        {showAllWilayas && wilayaNames.length > 5 && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setShowAllWilayas(false);
            }}
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            Voir moins
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Passer une commande</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-500"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <div className="text-sm text-gray-600 mb-2">
            {medication.commercial_name} - {medication.form} {medication.dosage}
          </div>
          <p className="text-sm font-medium text-gray-900 mt-1">
            De : <UserLink user={inventory.users} />
          </p>
          <div className="mt-2">
            <p className="text-sm text-gray-500">Stock disponible : {inventory.quantity} unités</p>
            <p className="text-sm font-medium text-gray-900">Prix unitaire : {inventory.price.toFixed(2)} DZD</p>
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
              max={inventory.quantity}
              value={quantity}
              onChange={(e) => {
                setError('');
                setQuantity(parseInt(e.target.value) || 0);
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
              disabled={loading}
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
              className="px-4 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Commande en cours...
                </>
              ) : (
                'Commander'
              )}
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
  const [orderLoading, setOrderLoading] = useState(false);
  const [offers, setOffers] = useState<ActiveOffer[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchMedications();
      fetchOffers();
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

  async function fetchOffers() {
    try {
      const { data, error } = await supabase
        .from('active_offers_view')
        .select('*');
      
      if (error) throw error;
      
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  }

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

      // Enhance medications with offer information
      const enhancedMeds = filteredMeds.map(med => {
        // Check if medication is in any offer
        const inOffers = offers.filter(offer => 
          offer.products.some(p => !p.is_priority && p.medication_id === med.id)
        ).map(offer => ({
          id: offer.id,
          name: offer.name,
          type: offer.type
        }));
        
        // Check if medication is a priority product in any offer
        const isPriorityIn = offers.filter(offer => 
          offer.products.some(p => p.is_priority && p.medication_id === med.id)
        ).map(offer => ({
          id: offer.id,
          name: offer.name,
          type: offer.type
        }));
        
        return {
          ...med,
          offers: inOffers.length > 0 ? inOffers : undefined,
          isPriorityInOffers: isPriorityIn.length > 0 ? isPriorityIn : undefined
        };
      });

      setPromotionsMap(newPromotionsMap);
      setMedications(enhancedMeds);
    } catch (error) {
      console.error('Error fetching medications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createOrder(
  medication: MedicationWithInventory,
  inventory: WholesalerInventory & { users: { company_name: string; wilaya: string; email: string } },
  quantity: number
) {
  if (!user?.id) {
    alert('Veuillez vous connecter pour passer des commandes.');
    return;
  }

  try {
    setOrderLoading(true);

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
          product_name: medication.commercial_name,
          product_form: medication.form,
          product_dosage: medication.dosage,
          quantity: `${quantity}`,
          unit_price: `${inventory.price}`,
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
  } finally {
    setOrderLoading(false);
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
                    <div className="flex justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {medication.commercial_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {medication.scientific_name}
                        </p>
                      </div>
                      <div className="flex flex-col space-y-2">
                        
                        
                      </div>
                    </div>
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
                        const promoKey        = `${inventory.wholesaler_id}-${medication.id}`;
       const activePromotion = promotionsMap[promoKey];
       // on récupère aussi les packs valides pour CE grossiste
       const packOffers = offers.filter(offer =>
         offer.wholesaler_id === inventory.wholesaler_id        
         && offer.products.some(p => p.medication_id === medication.id)
       );
                        
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
          
          {/* — Packs sous le nom, alignés à gauche — */}
          {packOffers.length > 0 && (
            <div className="mt-2 text-left">
              <span className="text-sm font-medium text-gray-500">Disponible dans un Pack :</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {packOffers.map(pack => (
                  <Link
    key={pack.id}
    to={`/pharmacist/offers/${pack.id}`}
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      ${
        pack.type === 'pack'
          ? 'bg-red-100 text-orange-800 hover:bg-orange-200'    // pack fixe → vert
          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'       // achat libre/seuil → bleu
      }
    `}
  >
    {pack.name}
  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Badge promo à droite */}
      {activePromotion && (
        <Link
          to="/pharmacist/promotions"
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200"
        >
          Existe en vente flash {activePromotion.free_units_percentage}% UG
        </Link>
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
                                disabled={inventory.quantity === 0 || orderLoading}
                                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          loading={orderLoading}
        />
      )}
    </div>
  );
}
