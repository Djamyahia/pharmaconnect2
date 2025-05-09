import React, { useEffect, useState } from 'react';
import { Search, Filter, Loader2, ShoppingCart, X, Download, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Select from 'react-select';
import { customStyles, selectComponents } from '../../components/VirtualizedSelect';
import type { ParapharmacyProduct, WholesalerParapharmacyInventory } from '../../types/supabase';
import { algerianWilayas } from '../../lib/wilayas';
import { ProductTypeNav } from '../../components/ProductTypeNav';
import { UserLink } from '../../components/UserLink';
import { sendOrderNotification } from '../../lib/notifications';
import * as unorm from 'unorm';
import * as XLSX from 'xlsx';

type ExtendedInventoryItem = WholesalerParapharmacyInventory & {
  product: ParapharmacyProduct;
  wholesaler: {
    company_name: string;
    wilaya: string;
    email: string;
    phone: string;
    delivery_wilayas: string[];
  };
};

type OrderModalProps = {
  item: ExtendedInventoryItem;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  loading: boolean;
};

function OrderModal({ item, onClose, onConfirm, loading }: OrderModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [showAllWilayas, setShowAllWilayas] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('La quantité doit être supérieure à 0');
      return;
    }
    if (quantity > item.quantity) {
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
          <div className="flex flex-wrap gap-1">
            {wilayaNames.slice(0, 5).map((name, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              >
                {name}
              </span>
            ))}
          </div>
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

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="mb-4">
          <div className="text-sm text-gray-600 mb-2">
            {item.product.name}
            {item.product.brand && (
              <span className="text-gray-500"> - {item.product.brand}</span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 mt-1">
            De : <UserLink user={item.wholesaler} />
          </p>
          <div className="mt-2">
            <p className="text-sm text-gray-500">Stock disponible : {item.quantity} unités</p>
            <p className="text-sm font-medium text-gray-900">Prix unitaire : {item.price.toFixed(2)} DZD</p>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-500 mb-1">Wilayas de livraison :</p>
            {formatWilayasList(item.wholesaler.delivery_wilayas)}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
              Quantité
            </label>
            <input
              type="number"
              id="quantity"
              min="1"
              max={item.quantity}
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
              {(item.price * quantity).toFixed(2)} DZD
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

export function Parapharmacy() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<ExtendedInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [error, setError] = useState('');
  const [orderModal, setOrderModal] = useState<{
    show: boolean;
    item: ExtendedInventoryItem | null;
  }>({
    show: false,
    item: null
  });
  const [orderLoading, setOrderLoading] = useState(false);
  const [filteredInventory, setFilteredInventory] = useState<ExtendedInventoryItem[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchInventory();
    }
  }, [user?.id]);

  useEffect(() => {
    // Apply search and category filters
    let filtered = [...inventory];
    
    if (searchQuery) {
      const normalizedQuery = unorm.nfd(searchQuery.toLowerCase()).replace(/[\u0300-\u036f]/g, '');
      filtered = filtered.filter(item => {
        const normalizedName = unorm.nfd(item.product.name.toLowerCase()).replace(/[\u0300-\u036f]/g, '');
        const normalizedBrand = unorm.nfd((item.product.brand || '').toLowerCase()).replace(/[\u0300-\u036f]/g, '');
        const normalizedDesc = unorm.nfd((item.product.description || '').toLowerCase()).replace(/[\u0300-\u036f]/g, '');
        
        return normalizedName.includes(normalizedQuery) ||
               normalizedBrand.includes(normalizedQuery) ||
               normalizedDesc.includes(normalizedQuery);
      });
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(item => item.product.category === selectedCategory);
    }
    
    setFilteredInventory(filtered);
  }, [inventory, searchQuery, selectedCategory]);

  async function fetchInventory() {
    try {
      const { data, error } = await supabase
        .from('wholesaler_parapharmacy_inventory')
        .select(`
          *,
          product:parapharmacy_products!inner (
            *,
            search_vector
          ),
          wholesaler:users!wholesaler_parapharmacy_inventory_wholesaler_id_fkey (
            company_name,
            wilaya,
            email,
            phone,
            delivery_wilayas
          )
        `);

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Erreur lors de la récupération des produits');
    } finally {
      setLoading(false);
    }
  }

  async function handleOrder(item: ExtendedInventoryItem, quantity: number) {
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
          wholesaler_id: item.wholesaler_id,
          total_amount: item.price * quantity,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: orderData.id,
          product_id: item.product_id,
          quantity: quantity,
          unit_price: item.price,
          is_parapharmacy: true
        });

      if (itemError) throw itemError;

      try {
        await sendOrderNotification(
          'order_placed',
          item.wholesaler.email,
          {
            wholesaler_name: item.wholesaler.company_name,
            pharmacist_name: user.company_name,
            order_id: orderData.id,
            total_amount: `${(item.price * quantity).toFixed(2)} DZD`
          }
        );
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      alert('Commande créée avec succès !');
      setOrderModal({ show: false, item: null });
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Échec de la création de la commande. Veuillez réessayer.');
    } finally {
      setOrderLoading(false);
    }
  }

  const categoryOptions = [
    { value: '', label: 'Toutes les catégories' },
    { value: 'hygiene_and_care', label: 'Hygiène & soins' },
    { value: 'dermocosmetics', label: 'Dermocosmétique' },
    { value: 'dietary_supplements', label: 'Compléments alimentaires' },
    { value: 'mother_and_baby', label: 'Maman & bébé' },
    { value: 'orthopedics', label: 'Orthopédie' },
    { value: 'hair_care', label: 'Soins capillaires' },
    { value: 'veterinary', label: 'Produits vétérinaires' },
    { value: 'sun_care', label: 'Produits solaires' },
    { value: 'medical_devices', label: 'Dispositifs médicaux' },
    { value: 'accessories', label: 'Accessoires' }
  ];

  const downloadInventoryData = () => {
    try {
      const data = inventory.map(item => ({
        'Nom du produit': item.product.name,
        'Marque': item.product.brand || '',
        'Catégorie': categoryOptions.find(opt => opt.value === item.product.category)?.label,
        'Description': item.product.description || '',
        'Grossiste': item.wholesaler.company_name,
        'Email': item.wholesaler.email,
        'Téléphone': item.wholesaler.phone,
        'Wilaya': item.wholesaler.wilaya,
        'Prix': item.price,
        'Stock': item.quantity,
        'Wilayas de livraison': item.wholesaler.delivery_wilayas.map(w => 
          algerianWilayas.find(aw => aw.value === w)?.label
        ).join(', ')
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventaire');
      XLSX.writeFile(wb, 'inventaire_parapharmacie.xlsx');
    } catch (error) {
      console.error('Error downloading data:', error);
      setError('Erreur lors du téléchargement des données');
    }
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
      <ProductTypeNav />

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Produits parapharmaceutiques</h2>
        <button
          onClick={downloadInventoryData}
          className="flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <Download className="h-5 w-5 mr-2" />
          Télécharger l'inventaire
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Rechercher des produits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <Select
            value={categoryOptions.find(opt => opt.value === selectedCategory)}
            onChange={(selected) => setSelectedCategory(selected?.value || '')}
            options={categoryOptions}
            className="w-full"
            styles={customStyles}
            components={selectComponents}
            isClearable
            placeholder="Filtrer par catégorie..."
          />
        </div>
      </div>

      {filteredInventory.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun produit</h3>
          <p className="mt-1 text-sm text-gray-500">Aucun produit ne correspond à vos critères.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInventory.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {item.product.image_data && (
                <div className="aspect-w-16 aspect-h-9">
                  <img
                    src={item.product.image_data}
                    alt={item.product.name}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
              <div className="p-6 flex flex-col gap-y-3">
                <h3 className="text-lg font-medium text-gray-900">
                  {item.product.name}
                  {item.product.brand && (
                    <span className="text-gray-500 text-sm ml-2">
                      - {item.product.brand}
                    </span>
                  )}
                </h3>

                <p className="text-sm text-gray-500">
                  Vendu par <UserLink user={item.wholesaler} />
                </p>

                {item.product.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {item.product.description}
                  </p>
                )}

                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 w-fit">
                  {categoryOptions.find(opt => opt.value === item.product.category)?.label}
                </span>

                <div>
                  <p className="text-lg font-bold text-gray-900">{item.price.toFixed(2)} DZD</p>
                  <p className="text-sm text-gray-600">Stock: {item.quantity}</p>
                </div>

                <button
                  onClick={() => setOrderModal({ show: true, item })}
                  disabled={item.quantity === 0}
                  className="mt-2 inline-flex items-center justify-center px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  <span>Commander</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {orderModal.show && orderModal.item && (
        <OrderModal
          item={orderModal.item}
          onClose={() => setOrderModal({ show: false, item: null })}
          onConfirm={(quantity) => handleOrder(orderModal.item!, quantity)}
          loading={orderLoading}
        />
      )}
    </div>
  );
}

