import React, { useEffect, useState } from 'react';
import { Plus, Search, Loader2, Edit2, Trash2, Copy, Calendar, Tag, Package as PackageIcon, AlertCircle, Eye, EyeOff, Share2, CheckCircle, X, FileText, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PackCreationWizard } from './PackCreationWizard';
import { RegionSelector } from '../../components/RegionSelector';
import { DeliveryDaysDisplay } from '../../components/DeliveryDaysDisplay';
import { ExpiryDateDisplay } from '../../components/ExpiryDateDisplay';
import { getDeliveryDays } from '../../lib/regions';
import type { RegionWithDeliveryDays } from '../../types/supabase';

type OfferDocument = {
  id: string;
  offer_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  created_at: string;
};

type OfferWithDocuments = {
  id: string;
  name: string;
  type: 'pack' | 'threshold';
  min_purchase_amount: number | null;
  is_public: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
  custom_total_price: number | null;
  comment: string | null;
  products: any[];
  documents?: OfferDocument[];
};

function ShareOfferModal({ offerId, onClose }: { offerId: string, onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const offerUrl = `${window.location.origin}/offers/${offerId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(offerUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Partager cette offre</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Partagez cette offre avec vos clients ou collègues :
          </p>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={offerUrl}
              readOnly
              className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50"
            />
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Copié
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-1" />
                  Copier
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export function PackManagement() {
  const { user } = useAuth();
  const [allOffers, setAllOffers] = useState<OfferWithDocuments[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<OfferWithDocuments[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferWithDocuments | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState<string | null>(null);
  const [offerTypeFilter, setOfferTypeFilter] = useState<'all' | 'pack' | 'threshold'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'expired'>('all');
  const [selectedRegion, setSelectedRegion] = useState<RegionWithDeliveryDays | null>(null);
  const [deliveryDaysMap, setDeliveryDaysMap] = useState<Record<string, string[] | null>>({});
  const [loadingDeliveryDays, setLoadingDeliveryDays] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchOffers();
    }
  }, [user?.id]);

  useEffect(() => {
    // Filter offers client-side when search query or filters change
    filterOffers();
  }, [searchQuery, offerTypeFilter, statusFilter, allOffers]);

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
      // For each offer, get the wholesaler's delivery days for the selected region
      for (const offer of allOffers) {
        const deliveryDays = await getDeliveryDays(offer.wholesaler_id, selectedRegion.id);
        newDeliveryDaysMap[offer.id] = deliveryDays;
      }
      
      setDeliveryDaysMap(newDeliveryDaysMap);
    } catch (error) {
      console.error('Error fetching delivery days:', error);
    } finally {
      setLoadingDeliveryDays(false);
    }
  }

  async function fetchOffers() {
    try {
      setLoading(true);
      
      // Fetch all offers
      const { data: offersData, error: offersError } = await supabase
        .from('promotional_offers')
        .select(`
          *,
          products:offer_products (
            id,
            medication_id,
            quantity,
            price,
            is_priority,
            priority_message,
            free_units_percentage,
            expiry_date,
            medications:medications (
              id,
              commercial_name,
              form,
              dosage
            )
          )
        `)
        .eq('wholesaler_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (offersError) throw offersError;
      
      // Fetch documents for each offer
      const offersWithDocuments: OfferWithDocuments[] = [];
      
      for (const offer of offersData || []) {
        const { data: documentsData, error: documentsError } = await supabase
          .from('offer_documents')
          .select('*')
          .eq('offer_id', offer.id);
        
        if (documentsError) throw documentsError;
        
        offersWithDocuments.push({
          ...offer,
          documents: documentsData || []
        });
      }
      
      setAllOffers(offersWithDocuments);
      setFilteredOffers(offersWithDocuments);
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
    if (offerTypeFilter !== 'all') {
      filtered = filtered.filter(offer => offer.type === offerTypeFilter);
    }
    
    // Filter by status
    const now = new Date();
    if (statusFilter === 'active') {
      filtered = filtered.filter(offer => 
        new Date(offer.start_date) <= now && new Date(offer.end_date) >= now
      );
    } else if (statusFilter === 'upcoming') {
      filtered = filtered.filter(offer => new Date(offer.start_date) > now);
    } else if (statusFilter === 'expired') {
      filtered = filtered.filter(offer => new Date(offer.end_date) < now);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(offer => {
        // Check if offer name matches
        if (offer.name.toLowerCase().includes(query)) return true;
        
        // Check if any product name matches
        return offer.products.some(product => 
          product.medications?.commercial_name?.toLowerCase().includes(query)
        );
      });
    }
    
    setFilteredOffers(filtered);
  }

  async function handleDuplicateOffer(offerId: string, e: React.MouseEvent) {
    e.stopPropagation();
    
    try {
      setLoading(true);
      
      // Get the offer to duplicate
      const offerToDuplicate = allOffers.find(o => o.id === offerId);
      if (!offerToDuplicate) return;
      
      // Create a new offer with the same data
      const { data: newOffer, error: offerError } = await supabase
        .from('promotional_offers')
        .insert({
          wholesaler_id: user?.id,
          name: `${offerToDuplicate.name} (copie)`,
          type: offerToDuplicate.type,
          min_purchase_amount: offerToDuplicate.min_purchase_amount,
          is_public: offerToDuplicate.is_public,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          custom_total_price: offerToDuplicate.custom_total_price,
          comment: offerToDuplicate.comment
        })
        .select()
        .single();
      
      if (offerError) throw offerError;
      
      // Duplicate products
      const productsToInsert = offerToDuplicate.products.map(product => ({
        offer_id: newOffer.id,
        medication_id: product.medication_id,
        quantity: product.quantity,
        price: product.price,
        is_priority: product.is_priority,
        priority_message: product.priority_message,
        free_units_percentage: product.free_units_percentage,
        expiry_date: product.expiry_date
      }));
      
      if (productsToInsert.length > 0) {
        const { error: productsError } = await supabase
          .from('offer_products')
          .insert(productsToInsert);
        
        if (productsError) throw productsError;
      }
      
      fetchOffers();
    } catch (error) {
      console.error('Error duplicating offer:', error);
      setError('Erreur lors de la duplication de l\'offre');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteOffer(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette offre ?')) return;

    try {
      setLoading(true);
      
      // Delete the offer (this will cascade delete products and document references)
      const { error } = await supabase
        .from('promotional_offers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchOffers();
    } catch (error) {
      console.error('Error deleting offer:', error);
      setError('Erreur lors de la suppression de l\'offre');
    } finally {
      setLoading(false);
    }
  }

  const handleEditOffer = (offer: OfferWithDocuments, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingOffer(offer);
    setShowWizard(true);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };

  const getOfferStatus = (offer: OfferWithDocuments) => {
    const now = new Date();
    const startDate = new Date(offer.start_date);
    const endDate = new Date(offer.end_date);
    
    if (now < startDate) {
      return { status: 'upcoming', label: 'À venir', color: 'bg-yellow-100 text-yellow-800' };
    } else if (now > endDate) {
      return { status: 'expired', label: 'Terminée', color: 'bg-red-100 text-red-800' };
    } else {
      return { status: 'active', label: 'Active', color: 'bg-green-100 text-green-800' };
    }
  };

  const handleShareOffer = (offerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShareModalOpen(offerId);
  };

  // Calculate total price for a pack offer
  const calculatePackTotal = (offer: OfferWithDocuments) => {
    // If there's a custom total price, use that
    if (offer.custom_total_price !== null && offer.custom_total_price !== undefined) {
      return offer.custom_total_price;
    }
    
    // Otherwise calculate from products
    if (!offer.products || !Array.isArray(offer.products)) return 0;
    
    return offer.products
      .filter((p: any) => !p.is_priority)
      .reduce((sum: number, product: any) => sum + (product.price * product.quantity), 0);
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
        <h2 className="text-2xl font-semibold text-gray-900">Gestion des packs</h2>
        <button
          onClick={() => {
            setEditingOffer(undefined);
            setShowWizard(true);
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouveau pack
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Rechercher des packs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <select
            value={offerTypeFilter}
            onChange={(e) => setOfferTypeFilter(e.target.value as 'all' | 'pack' | 'threshold')}
            className="border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Tous les types</option>
            <option value="pack">Packs groupés</option>
            <option value="threshold">Achats libres</option>
          </select>

          <RegionSelector 
            onRegionChange={setSelectedRegion}
            selectedRegion={selectedRegion}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {filteredOffers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Tag className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun pack</h3>
          <p className="mt-1 text-sm text-gray-500">Commencez par créer un nouveau pack.</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Offre
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Période
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visibilité
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Livraison
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produits
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOffers.map((offer) => {
                  const status = getOfferStatus(offer);
                  const priorityProducts = offer.products.filter(p => p.is_priority).length;
                  const standardProducts = offer.products.filter(p => !p.is_priority).length;
                  const packTotal = offer.type === 'pack' ? calculatePackTotal(offer) : null;
                  
                  return (
                    <tr 
                      key={offer.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={(e) => handleEditOffer(offer, e)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{offer.name}</div>
                        {offer.comment && (
                          <div className="text-xs text-gray-500 mt-1">{offer.comment}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {offer.type === 'pack' ? 'Pack groupé' : 'Achats libres'}
                        </span>
                        {offer.type === 'threshold' && (
                          <div className="text-xs text-gray-500 mt-1">
                            Min: {offer.min_purchase_amount?.toFixed(2)} DZD
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Du {formatDate(offer.start_date)}
                        </div>
                        <div className="text-sm text-gray-900">
                          au {formatDate(offer.end_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {offer.is_public ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Eye className="h-3 w-3 mr-1" />
                            Publique
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Privée
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <DeliveryDaysDisplay 
                          deliveryDays={deliveryDaysMap[offer.id]}
                          isLoading={loadingDeliveryDays}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">{standardProducts} standard</div>
                        <div className="text-xs text-green-600">
                          {priorityProducts} prioritaire{priorityProducts > 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {offer.products.some(p => p.expiry_date) && (
                            <span className="text-amber-600">Avec dates d'expiration</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {packTotal !== null && (
                          <div className="text-sm font-medium text-gray-900">
                            {packTotal.toFixed(2)} DZD
                            {offer.custom_total_price !== null && (
                              <span className="text-xs text-indigo-600 ml-1">(personnalisé)</span>
                            )}
                          </div>
                        )}
                        {offer.type === 'threshold' && (
                          <div className="text-sm font-medium text-gray-900">
                            Min: {offer.min_purchase_amount?.toFixed(2)} DZD
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {offer.is_public && status.status === 'active' && (
                            <button
                              onClick={(e) => handleShareOffer(offer.id, e)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Partager"
                            >
                              <Share2 className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleEditOffer(offer, e)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Modifier"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => handleDuplicateOffer(offer.id, e)}
                            className="text-green-600 hover:text-green-900"
                            title="Dupliquer"
                          >
                            <Copy className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteOffer(offer.id, e)}
                            className="text-red-600 hover:text-red-900"
                            title="Supprimer"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pack Creation Wizard */}
      <PackCreationWizard
        isOpen={showWizard}
        onClose={() => {
          setShowWizard(false);
          setEditingOffer(undefined);
        }}
        onSuccess={() => {
          fetchOffers();
        }}
        initialData={editingOffer}
      />

      {/* Share Modal */}
      {shareModalOpen && (
        <ShareOfferModal 
          offerId={shareModalOpen} 
          onClose={() => setShareModalOpen(null)} 
        />
      )}
    </div>
  );
}