import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Package, Tag, ShoppingCart, Calendar, Info, AlertCircle, CheckCircle, X, Loader2, FileText, Download } from 'lucide-react';
import type { ActiveOffer, OfferDocument, RegionWithDeliveryDays } from '../../types/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { sendOrderNotification } from '../../lib/notifications';
import { RegionSelector } from '../../components/RegionSelector';
import { DeliveryDaysDisplay } from '../../components/DeliveryDaysDisplay';
import { getDeliveryDays } from '../../lib/regions';

type OrderModalProps = {
  offer: ActiveOffer & { documents?: OfferDocument[] };
  onClose: () => void;
  onConfirm: (selectedPriorityProductIds: string[] | null, freeTextProducts: string) => Promise<void>;
  loading: boolean;
  deliveryDays: string[] | null;
};

function OrderModal({ offer, onClose, onConfirm, loading, deliveryDays }: OrderModalProps) {
  const [selectedPriorityProductIds, setSelectedPriorityProductIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [freeTextProducts, setFreeTextProducts] = useState('');

  const priorityProducts = offer.products.filter(p => p.is_priority);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (priorityProducts.length > 0 && selectedPriorityProductIds.length === 0) {
      setError('Veuillez sélectionner au moins un produit prioritaire ou cliquez sur "Commander sans produit prioritaire"');
      return;
    }
    
    // Vérifier si le nombre de produits sélectionnés dépasse le maximum autorisé
    if (offer.max_quota_selections && selectedPriorityProductIds.length > offer.max_quota_selections) {
      setError(`Vous ne pouvez sélectionner que ${offer.max_quota_selections} produit(s) prioritaire(s) maximum`);
      return;
    }
    
    await onConfirm(selectedPriorityProductIds.length > 0 ? selectedPriorityProductIds : null, freeTextProducts);
  };

  const calculateTotalPrice = () => {
    // Calculate base price from regular products
    let total = offer.products
      .filter(p => !p.is_priority)
      .reduce((sum, p) => sum + (p.price * p.quantity), 0);
    
    // For threshold offers, ensure the minimum purchase amount
    if (offer.type === 'threshold' && offer.min_purchase_amount) {
      total = Math.max(total, offer.min_purchase_amount);
    }
    
    // Add selected priority products
    selectedPriorityProductIds.forEach(productId => {
      const priorityProduct = offer.products.find(p => p.is_priority && p.medication_id === productId);
      if (priorityProduct) {
        total += priorityProduct.price * priorityProduct.quantity;
      }
    });
    
    return total;
  };

  const togglePriorityProduct = (medicationId: string) => {
    if (selectedPriorityProductIds.includes(medicationId)) {
      // Remove if already selected
      setSelectedPriorityProductIds(prev => prev.filter(id => id !== medicationId));
    } else {
      // Add if not selected and check max selections
      if (offer.max_quota_selections && selectedPriorityProductIds.length >= offer.max_quota_selections) {
        // If max reached, replace the first one (or show error)
        setError(`Vous ne pouvez sélectionner que ${offer.max_quota_selections} produit(s) prioritaire(s) maximum`);
        return;
      }
      setSelectedPriorityProductIds(prev => [...prev, medicationId]);
    }
    setError(''); // Clear any error when selection changes
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Commander cette offre</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">{offer.name}</h4>
            <p className="text-sm text-gray-500">
              {offer.type === 'pack' ? 'Pack groupé' : 'Offre sur achats libres'}
              {offer.type === 'threshold' && ` - Montant minimum: ${offer.min_purchase_amount?.toFixed(2)} DZD`}
            </p>
            {offer.comment && (
              <p className="text-sm text-amber-600 mt-1">
                Note : {offer.comment}
              </p>
            )}
          </div>

          {/* Delivery days information */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              Informations de livraison
            </h4>
            <DeliveryDaysDisplay deliveryDays={deliveryDays} />
          </div>

          {offer.type === 'threshold' && (
            <div className="bg-amber-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-amber-800 mb-2">Achats libres</h4>
              <p className="text-sm text-amber-700">
                Veuillez lister les produits dont vous avez besoin. Le montant total de votre commande doit être d'au moins {offer.min_purchase_amount?.toFixed(2)} DZD pour bénéficier des produits à disponibilité prioritaire.
              </p>
              <textarea
                className="mt-3 block w-full rounded-md border-amber-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                rows={4}
                placeholder="Listez ici les produits dont vous avez besoin..."
                value={freeTextProducts}
                onChange={(e) => setFreeTextProducts(e.target.value)}
              ></textarea>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Produits inclus dans l'offre :</h4>
            <ul className="space-y-2">
              {offer.products
                .filter(product => !product.is_priority)
                .map((product) => (
                  <li
                    key={product.id}
                    className="flex justify-between items-center text-sm cursor-pointer hover:bg-gray-100 rounded"
                    onClick={() => navigate(`/medications/${product.medication_id}`)}
                  >
                    <div>
                      <span className="text-gray-800">
                        {product.medication.commercial_name} - {product.medication.form} {product.medication.dosage}
                      </span>
                      <span className="text-gray-500 ml-2">x{product.quantity}</span>
                      {product.free_units_percentage && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          +{product.free_units_percentage}% UG
                        </span>
                      )}
                    </div>
                    <span className="text-gray-900 font-medium">{product.price.toFixed(2)} DZD</span>
                  </li>
                ))}
            </ul>

          </div>

          {priorityProducts.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-green-800 mb-2">
                {offer.max_quota_selections 
                  ? `Produits à disponibilité prioritaire (choisissez jusqu'à ${offer.max_quota_selections}) :`
                  : 'Produits à disponibilité prioritaire (choisissez-en un) :'}
              </h4>
              <div className="space-y-3">
                {priorityProducts.map((product) => (
                  <label key={product.id} className="flex items-start space-x-3">
                    <input
                      type={offer.max_quota_selections && offer.max_quota_selections > 1 ? "checkbox" : "radio"}
                      name="priorityProduct"
                      value={product.medication_id}
                      checked={selectedPriorityProductIds.includes(product.medication_id)}
                      onChange={() => togglePriorityProduct(product.medication_id)}
                      className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {product.medication.commercial_name} - {product.medication.form} {product.medication.dosage}
                      </div>
                      <div className="text-sm text-gray-600">
                        Quantité: {product.quantity} - Prix: {product.price.toFixed(2)} DZD
                        {product.free_units_percentage && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            +{product.free_units_percentage}% UG
                          </span>
                        )}
                      </div>
                      {product.priority_message && (
                        <p className="text-xs text-green-600 mt-1">{product.priority_message}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              {offer.max_quota_selections && offer.max_quota_selections > 1 && (
                <div className="mt-3 text-sm text-green-700">
                  Vous avez sélectionné {selectedPriorityProductIds.length} produit(s) sur {offer.max_quota_selections} maximum.
                </div>
              )}
            </div>
          )}

          <div className="bg-indigo-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">Total :</span>
              <span className="text-lg font-bold text-gray-900">{calculateTotalPrice().toFixed(2)} DZD</span>
            </div>
            {offer.type === 'threshold' && offer.min_purchase_amount && (
              <p className="text-sm text-indigo-600 mt-2">
                Ce montant inclut le minimum d'achat requis de {offer.min_purchase_amount.toFixed(2)} DZD.
                Les produits que vous avez listés seront ajoutés à votre commande.
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Annuler
            </button>
            {priorityProducts.length > 0 && (
              <button
                type="button"
                onClick={() => onConfirm(null, freeTextProducts)}
                className="px-4 py-2 border border-indigo-300 text-indigo-700 rounded-md hover:bg-indigo-50"
                disabled={loading}
              >
                Commander sans produit prioritaire
              </button>
            )}
            <button
              type="submit"
              disabled={loading || (priorityProducts.length > 0 && selectedPriorityProductIds.length === 0)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            >
              {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
              Commander
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SpecialOffers() {
  const { user } = useAuth();
  const { id: offerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [allOffers, setAllOffers] = useState<(ActiveOffer & { documents?: OfferDocument[] })[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<(ActiveOffer & { documents?: OfferDocument[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [offerType, setOfferType] = useState<'all' | 'pack' | 'threshold'>('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<(ActiveOffer & { documents?: OfferDocument[] }) | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<RegionWithDeliveryDays | null>(null);
  const [deliveryDaysMap, setDeliveryDaysMap] = useState<Record<string, string[] | null>>({});
  const [loadingDeliveryDays, setLoadingDeliveryDays] = useState(false);

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    // Filter offers client-side when search query or offer type changes
    filterOffers();
  }, [searchQuery, offerType, allOffers]);

  useEffect(() => {
    if (offerId) {
      fetchSingleOffer(offerId);
    }
  }, [offerId]);

  useEffect(() => {
    if (selectedRegion) {
      fetchDeliveryDaysForRegion();
    } else {
      setDeliveryDaysMap({});
    }
  }, [selectedRegion, allOffers]);

  async function fetchDeliveryDaysForRegion() {
    if (!selectedRegion) return;
    
    setLoadingDeliveryDays(true);
    const newDeliveryDaysMap: Record<string, string[] | null> = {};
    
    try {
      // For each offer, get the wholesaler's delivery days for the selected region
      for (const offer of allOffers) {
        const deliveryDays = await getDeliveryDays(offer.wholesaler_id, selectedRegion.id);
        newDeliveryDaysMap[offer.wholesaler_id] = deliveryDays;
      }
      
      setDeliveryDaysMap(newDeliveryDaysMap);
    } catch (error) {
      console.error('Error fetching delivery days:', error);
    } finally {
      setLoadingDeliveryDays(false);
    }
  }

  async function fetchSingleOffer(id: string) {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('active_offers_view')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        // Fetch documents if any
        const { data: documentsData, error: documentsError } = await supabase
          .from('offer_documents')
          .select('*')
          .eq('offer_id', id);
        
        if (documentsError) throw documentsError;
        
        setSelectedOffer({
          ...data,
          documents: documentsData || []
        });
      }
    } catch (error) {
      console.error('Error fetching offer:', error);
      setError('Erreur lors de la récupération de l\'offre');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOffers() {
    try {
      setLoading(true);
      
      // Get all public offers
      const { data: offersData, error: offersError } = await supabase
        .from('promotional_offers')
        .select('*')
        .gte('end_date', new Date().toISOString());
      
      if (offersError) throw offersError;
      
      if (!offersData || offersData.length === 0) {
        setAllOffers([]);
        setFilteredOffers([]);
        setLoading(false);
        return;
      }
      
      // Now get products for each offer
      const offerDetails: (ActiveOffer & { documents?: OfferDocument[] })[] = [];
      
      for (const offer of offersData) {
        const { data: productsData, error: productsError } = await supabase
          .from('offer_products')
          .select(`
            *,
            medications (*)
          `)
          .eq('offer_id', offer.id);
        
        if (productsError) throw productsError;
        
        // Get documents for the offer
        const { data: documentsData, error: documentsError } = await supabase
          .from('offer_documents')
          .select('*')
          .eq('offer_id', offer.id);
        
        if (documentsError) throw documentsError;
        
        if (productsData && productsData.length > 0) {
          offerDetails.push({
            ...offer,
            products: productsData.map(product => ({
              ...product,
              medication: product.medications
            })),
            documents: documentsData || []
          });
        }
      }
      
      setAllOffers(offerDetails);
      setFilteredOffers(offerDetails);
    } catch (error) {
      console.error('Error fetching offers:', error);
      setError('Erreur lors de la récupération des offres');
    } finally {
      setLoading(false);
    }
  }

  function filterOffers() {
    if (!allOffers.length) return;
    
    let filtered = [...allOffers];
    
    // Filter by type
    if (offerType !== 'all') {
      filtered = filtered.filter(offer => offer.type === offerType);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(offer => {
        // Check if offer name matches
        if (offer.name.toLowerCase().includes(query)) return true;
        
        // Check if any product name matches
        return offer.products.some(product => 
          product.medication?.commercial_name?.toLowerCase().includes(query)
        );
      });
    }
    
    setFilteredOffers(filtered);
  }

  async function handleOrderOffer(selectedPriorityProductIds: string[] | null, freeTextProducts: string) {
    if (!selectedOffer || !user) return;

    try {
      setOrderLoading(true);
      
      // Get wholesaler info
      const { data: wholesalerData, error: wholesalerError } = await supabase
        .from('users')
        .select('id, company_name, email')
        .eq('id', selectedOffer.wholesaler_id)
        .single();
      
      if (wholesalerError) throw wholesalerError;
      
      // Calculate total amount
      let totalAmount = 0;
      
      // If there's a custom total price, use that
      if (selectedOffer.type === 'pack' && selectedOffer.custom_total_price !== null && selectedOffer.custom_total_price !== undefined) {
        totalAmount = selectedOffer.custom_total_price;
      } else {
        // For threshold offers, ensure the minimum purchase amount
        if (selectedOffer.type === 'threshold' && selectedOffer.min_purchase_amount) {
          totalAmount = selectedOffer.min_purchase_amount;
        }
        
        // Add regular products
        selectedOffer.products
          .filter(p => !p.is_priority)
          .forEach(p => {
            totalAmount += p.price * p.quantity;
          });
      }
      
      // Add selected priority products if any
      if (selectedPriorityProductIds && selectedPriorityProductIds.length > 0) {
        selectedPriorityProductIds.forEach(productId => {
          const priorityProduct = selectedOffer.products.find(p => p.is_priority && p.medication_id === productId);
          if (priorityProduct) {
            totalAmount += priorityProduct.price * priorityProduct.quantity;
          }
        });
      }
      
      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          pharmacist_id: user.id,
          wholesaler_id: wholesalerData.id,
          total_amount: totalAmount,
          status: 'pending',
          metadata: {
            offer_id: selectedOffer.id,
            offer_name: selectedOffer.name,
            offer_type: selectedOffer.type,
            min_purchase_amount: selectedOffer.type === 'threshold' ? selectedOffer.min_purchase_amount : null,
            free_text_products: freeTextProducts || null
          }
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Create order items for regular products
      const regularProducts = selectedOffer.products.filter(p => !p.is_priority);
      
      for (const product of regularProducts) {
        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: orderData.id,
            medication_id: product.medication_id,
            quantity: product.quantity,
            unit_price: product.price,
            metadata: {
              from_offer: true,
              offer_id: selectedOffer.id
            }
          });
        
        if (itemError) throw itemError;
      }
      
      // Create order items for priority products if selected
      if (selectedPriorityProductIds && selectedPriorityProductIds.length > 0) {
        for (const productId of selectedPriorityProductIds) {
          const priorityProduct = selectedOffer.products.find(p => p.is_priority && p.medication_id === productId);
          if (priorityProduct) {
            const { error: priorityItemError } = await supabase
              .from('order_items')
              .insert({
                order_id: orderData.id,
                medication_id: priorityProduct.medication_id,
                quantity: priorityProduct.quantity,
                unit_price: priorityProduct.price,
                metadata: {
                  from_offer: true,
                  offer_id: selectedOffer.id,
                  is_priority: true
                }
              });
            
            if (priorityItemError) throw priorityItemError;
          }
        }
      }
      
      // Prepare product list for email
      const productsList = regularProducts.map(p => 
        `- ${p.medication.commercial_name} (${p.quantity} unités à ${p.price.toFixed(2)} DZD = ${(p.quantity * p.price).toFixed(2)} DZD)`
      ).join('\n');
      
      // Add priority products if selected
      let priorityProductInfo = '';
      if (selectedPriorityProductIds && selectedPriorityProductIds.length > 0) {
        const priorityProductsList = selectedPriorityProductIds.map(productId => {
          const product = selectedOffer.products.find(p => p.is_priority && p.medication_id === productId);
          if (product) {
            return `- ${product.medication.commercial_name} (${product.quantity} unités à ${product.price.toFixed(2)} DZD = ${(product.quantity * product.price).toFixed(2)} DZD)`;
          }
          return '';
        }).filter(Boolean).join('\n');
        
        if (priorityProductsList) {
          priorityProductInfo = `\nProduits prioritaires:\n${priorityProductsList}`;
        }
      }
      
      // Send email notification to wholesaler
      try {
        await sendOrderNotification(
          'order_placed',
          wholesalerData.email,
          {
            wholesaler_name: wholesalerData.company_name,
            pharmacist_name: user.company_name,
            order_id: orderData.id,
            total_amount: `${totalAmount.toFixed(2)} DZD`,
            offer_name: selectedOffer.name,
            offer_type: selectedOffer.type === 'pack' ? 'Pack groupé' : 'Offre sur achats libres',
            min_purchase_amount: selectedOffer.min_purchase_amount?.toFixed(2),
            products_list: productsList + priorityProductInfo,
            free_text_products: freeTextProducts || ''
          }
        );
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }
      
      setSuccess('Commande créée avec succès !');
      setSelectedOffer(null);
      
      // Redirect to orders page after a short delay
      setTimeout(() => {
        navigate('/pharmacist/orders');
      }, 2000);
      
    } catch (error) {
      console.error('Error creating order:', error);
      setError('Erreur lors de la création de la commande');
    } finally {
      setOrderLoading(false);
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };

  const getOfferTypeLabel = (type: 'pack' | 'threshold') => {
    return type === 'pack' ? 'Pack groupé' : 'Offre sur achats libres';
  };

  const handleOrderClick = (offer: ActiveOffer & { documents?: OfferDocument[] }) => {
    if (!user) {
      // Store the current URL for redirect after login
      localStorage.setItem('redirectAfterLogin', `/offers/${offer.id}`);
      navigate('/login');
    } else {
      setSelectedOffer(offer);
    }
  };

  const handleDownloadDocument = async (doc: OfferDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { data, error } = await supabase.storage
        .from('offer-documents')
        .download(doc.file_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      setError('Erreur lors du téléchargement du document');
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Packs disponibles</h2>
      </div>

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Rechercher des offres ou médicaments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setOfferType('all')}
              className={`px-4 py-2 rounded-md ${
                offerType === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Toutes les offres
            </button>
            <button
              onClick={() => setOfferType('pack')}
              className={`px-4 py-2 rounded-md ${
                offerType === 'pack'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Packs groupés
            </button>
            <button
              onClick={() => setOfferType('threshold')}
              className={`px-4 py-2 rounded-md ${
                offerType === 'threshold'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Achats libres
            </button>
          </div>

          <RegionSelector 
            onRegionChange={setSelectedRegion}
            selectedRegion={selectedRegion}
          />
        </div>
      </div>

      {filteredOffers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune offre disponible</h3>
          <p className="mt-1 text-sm text-gray-500">
            Aucune offre ne correspond à vos critères de recherche.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffers.map((offer) => (
            <div
              key={offer.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
              onClick={() => navigate(`/offers/${offer.id}`)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{offer.name}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {getOfferTypeLabel(offer.type)}
                  </span>
                </div>

                {offer.type === 'threshold' && offer.min_purchase_amount && (
                  <div className="mb-4 bg-amber-50 p-3 rounded-md">
                    <p className="text-sm text-amber-800">
                      Montant minimum d'achat : {offer.min_purchase_amount.toFixed(2)} DZD
                    </p>
                    {offer.comment && (
                      <p className="text-sm text-amber-700 mt-1">
                        Note : {offer.comment}
                      </p>
                    )}
                  </div>
                )}

                <div className="mb-4">
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>
                      Du {formatDate(offer.start_date)} au {formatDate(offer.end_date)}
                    </span>
                  </div>
                  
                  {/* Display delivery days */}
                  <DeliveryDaysDisplay 
                    deliveryDays={deliveryDaysMap[offer.wholesaler_id]} 
                    isLoading={loadingDeliveryDays}
                  />
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Produits inclus :</h4>
                  <ul className="space-y-2">
                    {offer.products
                      .filter(product => !product.is_priority && product.medication)
                      .slice(0, 3)
                      .map((product) => (
                        <li key={product.id} className="flex justify-between items-center text-sm">
                          <span className="text-gray-800 truncate max-w-[200px]">
                            {product.medication?.commercial_name}
                            {product.free_units_percentage && (
                              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                +{product.free_units_percentage}% UG
                              </span>
                            )}
                          </span>
                          <span className="text-gray-600">x{product.quantity}</span>
                        </li>
                      ))}
                    {offer.products.filter(product => !product.is_priority && product.medication).length > 3 && (
                      <li className="text-sm text-indigo-600">
                        + {offer.products.filter(product => !product.is_priority && product.medication).length - 3} autres produits
                      </li>
                    )}
                  </ul>
                </div>

                {offer.products.some(product => product.is_priority && product.medication) && (
                  <div className="mb-4 bg-green-50 p-3 rounded-md">
                    <h4 className="text-sm font-medium text-green-800 mb-2">
                      Produits à disponibilité prioritaire :
                    </h4>
                    <ul className="space-y-2">
                      {offer.products
                        .filter(product => product.is_priority && product.medication)
                        .slice(0, 2)
                        .map((product) => (
                          <li key={product.id} className="text-sm text-green-700 truncate max-w-full">
                            {product.medication?.commercial_name}
                            {product.free_units_percentage && (
                              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                +{product.free_units_percentage}% UG
                              </span>
                            )}
                          </li>
                        ))}
                      {offer.products.filter(product => product.is_priority && product.medication).length > 2 && (
                        <li className="text-sm text-green-700">
                          + {offer.products.filter(product => product.is_priority && product.medication).length - 2} autres produits
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {offer.type === 'pack' && (
                  <div className="mb-4 bg-indigo-50 p-3 rounded-md">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-medium text-indigo-800">Prix total :</h4>
                      <span className="text-lg font-bold text-indigo-900">
                        {offer.custom_total_price !== null 
                          ? offer.custom_total_price.toFixed(2) 
                          : offer.products
                              .filter(p => !p.is_priority)
                              .reduce((sum, p) => sum + (p.price * p.quantity), 0)
                              .toFixed(2)} DZD
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOrderClick(offer);
                  }}
                  className="w-full mt-4 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Commander cette offre
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedOffer && (
        <OrderModal
          offer={selectedOffer}
          onClose={() => setSelectedOffer(null)}
          onConfirm={(selectedPriorityProductIds, freeTextProducts) => handleOrderOffer(selectedPriorityProductIds, freeTextProducts)}
          loading={orderLoading}
          deliveryDays={deliveryDaysMap[selectedOffer.wholesaler_id]}
        />
      )}
    </div>
  );
}