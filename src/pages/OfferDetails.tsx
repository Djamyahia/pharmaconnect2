import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Package, Tag, ShoppingCart, Calendar, Info, AlertCircle, CheckCircle, X, Loader2, Share2, FileText, Download } from 'lucide-react';
import type { ActiveOffer, OfferDocument } from '../types/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { sendOrderNotification } from '../lib/notifications';

type OrderModalProps = {
  offer: ActiveOffer & { documents?: OfferDocument[] };
  onClose: () => void;
  onConfirm: (selectedPriorityProductIds: string[] | null, freeTextProducts: string) => Promise<void>;
  loading: boolean;
};

function OrderModal({ offer, onClose, onConfirm, loading }: OrderModalProps) {
  const [selectedPriorityProductIds, setSelectedPriorityProductIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const [pharmacistInput, setPharmacistInput] = useState('');

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
    
    await onConfirm(selectedPriorityProductIds.length > 0 ? selectedPriorityProductIds : null, pharmacistInput);
  };

  const calculateTotalPrice = () => {
    // 1) si custom défini, on l'utilise
    if (offer.custom_total_price != null) {
      return offer.custom_total_price;
    }

    // 2) on convertit le min en nombre
    const minPurchase = Number(offer.min_purchase_amount) || 0;

    // 3) total des produits "standard"
    const productsTotal = offer.products
      .filter(p => !p.is_priority)
      .reduce((sum, p) => sum + p.price * p.quantity, 0);

    // 4) si c'est du threshold, on prend au moins le min
    let total = offer.type === 'threshold'
      ? Math.max(productsTotal, minPurchase)
      : productsTotal;

    // 5) on ajoute les prioritaires cochés
    selectedPriorityProductIds.forEach(id => {
      const p = offer.products.find(x => x.is_priority && x.medication_id === id);
      if (p) total += p.price * p.quantity;
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
          {offer.free_text_products && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                Liste de produits du vendeur :
              </h4>
              <p className="text-sm text-blue-700 whitespace-pre-line">
                {offer.free_text_products}
              </p>
            </div>
          )}


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
                value={pharmacistInput}
                onChange={(e) => setPharmacistInput(e.target.value)}
              ></textarea>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Produits inclus dans l'offre :</h4>
            <ul className="space-y-2">
              {offer.products
                .filter(product => !product.is_priority)
                .map((product) => (
                  <li key={product.id} className="flex justify-between items-center text-sm">
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
                onClick={() => onConfirm(null, pharmacistInput)}
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

export function OfferDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [offer, setOffer] = useState<(ActiveOffer & { documents?: OfferDocument[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // juste après le fetch, au début du composant
  const minPurchase = Number(offer?.min_purchase_amount) || 0;

  const productsTotal = (offer?.products ?? [])
    .filter(p => !p.is_priority)
    .reduce((sum, p) => sum + p.price * p.quantity, 0);

  const tableTotal = offer?.custom_total_price != null
    ? Number(offer.custom_total_price)
    : offer?.type === 'threshold'
      ? Math.max(productsTotal, minPurchase)
      : productsTotal;

  useEffect(() => {
    if (id) {
      fetchOffer(id);
    }
  }, [id]);

  async function fetchOffer(offerId: string) {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('active_offers_view')
        .select('*')
        .eq('id', offerId)
        .single();

      if (error) throw error;

      // Fetch documents if any
      const { data: documentsData, error: documentsError } = await supabase
        .from('offer_documents')
        .select('*')
        .eq('offer_id', offerId);
      
      if (documentsError) throw documentsError;
      
      setOffer({
        ...data,
        documents: documentsData || []
      });
    } catch (error) {
      console.error('Error fetching offer:', error);
      setError('Erreur lors de la récupération de l\'offre');
    } finally {
      setLoading(false);
    }
  }

  async function handleOrderOffer(selectedPriorityProductIds: string[] | null, freeTextProducts: string) {
    if (!offer || !user) {
      if (!user) {
        // Store the current URL for redirect after login
        localStorage.setItem('redirectAfterLogin', `/offers/${id}`);
        navigate('/login');
      }
      return;
    }

    try {
      setOrderLoading(true);
      
      // Get wholesaler info
      const { data: wholesalerData, error: wholesalerError } = await supabase
        .from('users')
        .select('id, company_name, email')
        .eq('id', offer.wholesaler_id)
        .single();

      if (wholesalerError) throw wholesalerError;
      
      // Calculate total amount
      let totalAmount = 0;
      
      // If there's a custom total price, use that
      if (offer.type === 'pack' && offer.custom_total_price !== null && offer.custom_total_price !== undefined) {
        totalAmount = offer.custom_total_price;
      } else {
        // For threshold offers, add the minimum purchase amount
        if (offer.type === 'threshold' && offer.min_purchase_amount) {
          totalAmount += offer.min_purchase_amount;
        }
        
        // Add regular products
        offer.products
          .filter(p => !p.is_priority)
          .forEach(p => {
            totalAmount += p.price * p.quantity;
          });
      }
      
      // Add selected priority products if any
      if (selectedPriorityProductIds && selectedPriorityProductIds.length > 0) {
        selectedPriorityProductIds.forEach(productId => {
          const priorityProduct = offer.products.find(p => p.is_priority && p.medication_id === productId);
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
            offer_id: offer.id,
            offer_name: offer.name,
            offer_type: offer.type,
            min_purchase_amount: offer.type === 'threshold' ? offer.min_purchase_amount : null,
            free_text_products: freeTextProducts || null
          }
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Create order items for regular products
      const regularProducts = offer.products.filter(p => !p.is_priority);
      
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
              offer_id: offer.id
            }
          });
        
        if (itemError) throw itemError;
      }
      
      // Create order items for priority products if selected
      if (selectedPriorityProductIds && selectedPriorityProductIds.length > 0) {
        for (const productId of selectedPriorityProductIds) {
          const priorityProduct = offer.products.find(p => p.is_priority && p.medication_id === productId);
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
                  offer_id: offer.id,
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
          const product = offer.products.find(p => p.is_priority && p.medication_id === productId);
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
            offer_name: offer.name,
            offer_type: offer.type === 'pack' ? 'Pack groupé' : 'Offre sur achats libres',
            min_purchase_amount: offer.min_purchase_amount?.toFixed(2),
            products_list: productsList + priorityProductInfo,
            free_text_products: freeTextProducts || ''
          }
        );
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }
      
      setSuccess('Commande créée avec succès !');
      setShowOrderModal(false);
      
      // Redirect to orders page after a short delay
      setTimeout(() => {
        if (user.role === 'pharmacist') {
          navigate('/pharmacist/orders');
        } else {
          navigate('/');
        }
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

  const handleOrderClick = () => {
    if (!user) {
      // Store the current URL for redirect after login
      localStorage.setItem('redirectAfterLogin', `/offers/${id}`);
      navigate('/login');
    } else {
      setShowOrderModal(true);
    }
  };

  const handleShareOffer = () => {
    const url = window.location.href;

    if (navigator.share) {
      navigator.share({
        title: offer?.name || 'Offre spéciale PharmaConnect',
        text: 'Découvrez cette offre spéciale sur PharmaConnect',
        url: url
      }).catch(err => {
        console.error('Error sharing:', err);
        // Fallback to copy to clipboard
        copyToClipboard(url);
      });
    } else {
      // Fallback for browsers that don't support navigator.share
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  };

  const handleDownloadDocument = async (doc: OfferDocument, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const { data, error } = await supabase.storage
        .from('offer-documents')
        .download(doc.file_path);
      
      if (error) {
        console.error('Error downloading file:', error);
        return;
      }
      
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Cette offre n'existe pas ou n'est plus disponible.
              </p>
            </div>
          </div>
        </div>
        <div className="text-center">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Voir toutes les offres
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          ← Retour aux offres
        </button>
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

      {!user && (
        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-6 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-indigo-700">
                Vous consultez cette offre en tant que visiteur. Pour commander, veuillez{' '}
                <a href="/login" className="font-medium underline">vous connecter</a>{' '}
                ou{' '}
                <a href="/register" className="font-medium underline">créer un compte</a>.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{offer.name}</h1>
              <div className="flex items-center mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                  {getOfferTypeLabel(offer.type)}
                </span>
                <span className="text-sm text-gray-500">
                  Valable du {formatDate(offer.start_date)} au {formatDate(offer.end_date)}
                </span>
              </div>
            </div>
            <button
              onClick={handleShareOffer}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                  Lien copié
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-1" />
                  Partager
                </>
              )}
            </button>
          </div>

          {offer.type === 'threshold' && offer.free_text_products && (
            <div className="mb-6 bg-blue-50 p-4 rounded-lg">
              <h2 className="text-lg font-medium text-blue-800 mb-2">Liste de produits proposés</h2>
              <p className="text-sm text-blue-700">{offer.free_text_products}</p>
            </div>
          )}

          {offer.type === 'threshold' &&  (
            <div className="mb-6 bg-amber-50 p-4 rounded-lg">
              <h2 className="text-lg font-medium text-amber-800 mb-2">Offre sur achats libres</h2>
              <p className="text-sm text-amber-700">
                Cette offre vous permet d'accéder à des produits à disponibilité prioritaire lorsque vous effectuez un achat d'un montant minimum de {offer.min_purchase_amount?.toFixed(2)} DZD.
              </p>
              {offer.comment && (
                <p className="text-sm text-amber-700 mt-2">
                  Note : {offer.comment}
                </p>
              )}
            </div>
          )}

          <div className="mb-6">
  <h2 className="text-lg font-medium text-gray-900 mb-4">Produits dans l’offre</h2>
  <div className="bg-white border rounded-lg overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200 table-fixed w-full">
      <thead className="bg-gray-50">
        <tr>
          <th className="w-2/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Produit
          </th>
          <th className="w-1/4 px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
            Quantité
          </th>
          <th className="w-1/4 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            P.U
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {offer.products.map(product => (
          <tr key={product.id}>
            <td className="px-6 py-4 whitespace-normal break-words">
              <div className="text-sm font-medium text-gray-900">
                {product.medication.commercial_name}
              </div>
              <div className="text-xs text-gray-500">
                {product.medication.form} – {product.medication.dosage}
              </div>
              {product.free_units_percentage && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                  +{product.free_units_percentage}% UG
                </span>
              )}
            </td>
            <td className="px-6 py-4 text-center text-sm text-gray-500">
              {product.quantity}
            </td>
            <td className="px-6 py-4 text-right text-sm text-gray-900">
              {product.price.toFixed(2)} DZD
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot className="bg-gray-50">
        <tr>
          <td colSpan={2} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
            Total calculé :
          </td>
          <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
            {offer.products
              .reduce((sum, p) => sum + p.price * p.quantity, 0)
              .toFixed(2)} DZD
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</div>

          <div className="mt-10 flex justify-end">
  <div className="bg-indigo-100 p-4 rounded-lg shadow-md w-full max-w-sm">
    <div className="flex justify-between items-center">
      <span className="text-base font-semibold text-gray-900">
  Total de l’offre{offer.custom_total_price != null && ' (Prix remisé)'} :
</span>

      <span className="text-xl font-bold text-indigo-900">
        {(
          (offer.custom_total_price ?? 0) ||
          offer.products.reduce((sum, p) => sum + p.price * p.quantity, 0)
        ).toFixed(2)} DZD
      </span>
    </div>
  </div>
</div>


          <div className="flex justify-center mt-8">
            <button
              onClick={handleOrderClick}
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              {user ? "Commander cette offre" : "Se connecter pour commander"}
            </button>
          </div>
        </div>
      </div>

      {showOrderModal && offer && (
        <OrderModal
          offer={offer}
          onClose={() => setShowOrderModal(false)}
          onConfirm={handleOrderOffer}
          loading={orderLoading}
        />
      )}
    </div>
  );
}