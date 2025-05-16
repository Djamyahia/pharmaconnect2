import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { 
  Search, 
  Tag, 
  Package, 
  Calendar, 
  Eye, 
  EyeOff, 
  Edit2, 
  Trash2, 
  Copy, 
  Loader2, 
  AlertTriangle,
  Users,
  Save,
  X,
  ExternalLink,
  Plus
} from 'lucide-react';
import AsyncSelect from 'react-select/async';
import { customStyles, selectComponents } from '../../components/VirtualizedSelect';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PackCreationWizard } from '../wholesaler/PackCreationWizard';
import Select from 'react-select'


type OfferWithDetails = {
  id: string;
  name: string;
  type: 'pack' | 'threshold' | 'quota';
  min_purchase_amount: number | null;
  is_public: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
  custom_total_price: number | null;
  comment: string | null;
  max_quota_selections: number | null;
  free_units_enabled: boolean | null;
  free_text_products: string | null;
  wholesaler_id: string;
  wholesaler: {
    company_name: string;
    email: string;
    wilaya: string;
    phone: string;
  };
  products_count: number;
  priority_count: number;
};

type WholesalerOption = {
  id: string;
  company_name: string;
  email: string;
  wilaya: string;
};

type ChangeOwnerModalProps = {
  offer: OfferWithDetails;
  onClose: () => void;
  onSave: (offerId: string, newWholesalerId: string) => Promise<void>;
};

function ChangeOwnerModal({ offer, onClose, onSave }: ChangeOwnerModalProps) {
  const [wholesalers, setWholesalers] = useState<WholesalerOption[]>([]);
    useEffect(() => {
      supabaseAdmin
        .from('users')
        .select('id, company_name, email')
        .eq('role', 'wholesaler')
        .order('company_name', { ascending: true })
        .then(({ data, error }) => {
          if (error) throw error;
          setWholesalers(data || []);
        })
        .catch(console.error);
    }, []);
  
  const [selectedWholesaler, setSelectedWholesaler] = useState<WholesalerOption | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');


  




  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedWholesaler) {
      setError('Veuillez sélectionner un grossiste');
      return;
    }

    try {
      setLoading(true);
      await onSave(offer.id, selectedWholesaler.id);
      onClose();
    } catch (err) {
      console.error('Error changing owner:', err);
      setError('Erreur lors du changement de propriétaire');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Changer le propriétaire du pack</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pack
            </label>
            <div className="text-sm text-gray-900 p-2 bg-gray-50 rounded-md">
              {offer.name}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Propriétaire actuel
            </label>
            <div className="text-sm text-gray-900 p-2 bg-gray-50 rounded-md">
              {offer.wholesaler.company_name} ({offer.wholesaler.email})
            </div>
          </div>

          <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Nouveau propriétaire
  </label>
  <select
    value={selectedWholesaler?.id || ''}
    onChange={e => {
      const found = wholesalers.find(w => w.id === e.target.value) || null;
      setSelectedWholesaler(found);
      setError('');
    }}
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm
               focus:border-indigo-500 focus:ring-indigo-500"
  >
    <option value="">-- Sélectionnez un grossiste --</option>
    {wholesalers.map(w => (
      <option key={w.id} value={w.id}>
        {w.company_name} ({w.email})
      </option>
    ))}
  </select>
</div>


          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !selectedWholesaler}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
    
  );
}

export function PackManagement() {
  const [offers, setOffers] = useState<OfferWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'pack' | 'threshold' | 'quota'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'expired'>('all');
  const [selectedOffer, setSelectedOffer] = useState<OfferWithDetails | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any | null>(null);
  const [wholesalers, setWholesalers] = useState<WholesalerOption[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
  (async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, company_name, email')
        .eq('role', 'wholesaler')
        .order('company_name', { ascending: true });
      if (error) throw error;
      setWholesalers(data || []);
    } catch (err) {
      console.error('Impossible de charger les grossistes', err);
    }
  })();
}, []);


  async function fetchOffers() {
    try {
      setLoading(true);

      const { data, error } = await supabaseAdmin
        .from('promotional_offers')
        .select(`
          *,
          wholesaler:users!promotional_offers_wholesaler_id_fkey (
            company_name,
            email,
            wilaya,
            phone
          ),
          products_count:offer_products(count),
          priority_count:offer_products(count).filter(is_priority.eq.true)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
      setError('Erreur lors de la récupération des offres');
    } finally {
      setLoading(false);
    }
  }

  async function handleChangeOwner(offerId: string, newWholesalerId: string) {
    try {
      const { error } = await supabaseAdmin
        .from('promotional_offers')
        .update({ wholesaler_id: newWholesalerId })
        .eq('id', offerId);
      
      if (error) throw error;
      
      await fetchOffers();
    } catch (err) {
      console.error('Error changing owner:', err);
      throw err;
    }
  }

  async function handleDeleteOffer(offerId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette offre ?')) return;
    
    try {
      const { error } = await supabaseAdmin
        .from('promotional_offers')
        .delete()
        .eq('id', offerId);
      
      if (error) throw error;
      
      await fetchOffers();
    } catch (error) {
      console.error('Error deleting offer:', error);
      setError('Erreur lors de la suppression de l\'offre');
    }
  }

  async function handleDuplicateOffer(offerId: string, e: React.MouseEvent) {
    e.stopPropagation();
    
    try {
      setLoading(true);
      
      // Get the offer to duplicate
      const { data: offerToDuplicate, error: getError } = await supabaseAdmin
        .from('promotional_offers')
        .select('*')
        .eq('id', offerId)
        .single();
      
      if (getError) throw getError;
      
      // Create a new offer with the same data
      const { data: newOffer, error: createError } = await supabaseAdmin
        .from('promotional_offers')
        .insert({
          ...offerToDuplicate,
          id: undefined, // Let the database generate a new ID
          name: `${offerToDuplicate.name} (copie)`,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      // Get products from the original offer
      const { data: products, error: productsError } = await supabaseAdmin
        .from('offer_products')
        .select('*')
        .eq('offer_id', offerId);
      
      if (productsError) throw productsError;
      
      // Create products for the new offer
      if (products && products.length > 0) {
        const newProducts = products.map(product => ({
          ...product,
          id: undefined, // Let the database generate a new ID
          offer_id: newOffer.id
        }));
        
        const { error: insertError } = await supabaseAdmin
          .from('offer_products')
          .insert(newProducts);
        
        if (insertError) throw insertError;
      }
      
      await fetchOffers();
    } catch (error) {
      console.error('Error duplicating offer:', error);
      setError('Erreur lors de la duplication de l\'offre');
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };

  const getOfferStatus = (offer: OfferWithDetails) => {
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

  const getOfferTypeLabel = (type: 'pack' | 'threshold' | 'quota') => {
    switch (type) {
      case 'pack':
        return 'Pack groupé';
      case 'threshold':
        return 'Achats libres';
      case 'quota':
        return 'Quota';
      default:
        return type;
    }
  };

  // Filter offers based on search query and filters
  const filteredOffers = offers.filter(offer => {
    // Filter by type
    if (typeFilter !== 'all' && offer.type !== typeFilter) {
      return false;
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      const status = getOfferStatus(offer).status;
      if (status !== statusFilter) {
        return false;
      }
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        offer.name.toLowerCase().includes(query) ||
        offer.wholesaler.company_name.toLowerCase().includes(query) ||
        offer.wholesaler.email.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const handleEditOffer = async (offer: OfferWithDetails) => {
    try {
      setLoading(true);
      
      // Fetch the complete offer with products
      const { data: offerData, error: offerError } = await supabaseAdmin
        .from('promotional_offers')
        .select('*')
        .eq('id', offer.id)
        .single();
      
      if (offerError) throw offerError;
      
      // Fetch products
      const { data: productsData, error: productsError } = await supabaseAdmin
        .from('offer_products')
        .select(`
          *,
          medications (
            id,
            commercial_name,
            form,
            dosage
          )
        `)
        .eq('offer_id', offer.id);
      
      if (productsError) throw productsError;
      
      // Fetch documents
      const { data: documentsData, error: documentsError } = await supabaseAdmin
        .from('offer_documents')
        .select('*')
        .eq('offer_id', offer.id);
      
      if (documentsError) throw documentsError;
      
      // Format data for the wizard
      const formattedOffer = {
        ...offerData,
        products: productsData.map((product: any) => ({
          id: product.id,
          medication_id: product.medication_id,
          medication_name: product.medications?.commercial_name,
          quantity: product.quantity,
          price: product.price,
          is_priority: product.is_priority,
          priority_message: product.priority_message || '',
          free_units_percentage: product.free_units_percentage
        })),
        documents: documentsData
      };
      
      setEditingOffer(formattedOffer);
      setShowWizard(true);
    } catch (error) {
      console.error('Error fetching offer details:', error);
      setError('Erreur lors de la récupération des détails de l\'offre');
    } finally {
      setLoading(false);
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
        <h2 className="text-2xl font-semibold text-gray-900">Gestion des packs</h2>
        <button
          onClick={() => {
            setEditingOffer(null);
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
              placeholder="Rechercher par nom, grossiste..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'pack' | 'threshold' | 'quota')}
            className="border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Tous les types</option>
            <option value="pack">Packs groupés</option>
            <option value="threshold">Achats libres</option>
            <option value="quota">Quota</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'upcoming' | 'expired')}
            className="border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="upcoming">À venir</option>
            <option value="expired">Terminés</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {filteredOffers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun pack</h3>
          <p className="mt-1 text-sm text-gray-500">
            Aucun pack ne correspond à vos critères de recherche.
          </p>
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
                    Grossiste
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
                    Produits
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOffers.map((offer) => {
                  const status = getOfferStatus(offer);
                  const productsCount = typeof offer.products_count === 'number' 
                    ? offer.products_count 
                    : (offer.products_count as any)?.count || 0;
                  
                  const priorityCount = typeof offer.priority_count === 'number'
                    ? offer.priority_count
                    : (offer.priority_count as any)?.count || 0;
                  
                  return (
                    <tr key={offer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{offer.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Créé le {formatDate(offer.created_at)}
                        </div>
                        {offer.comment && (
                          <div className="text-xs text-gray-500 mt-1">{offer.comment}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {offer.wholesaler.company_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {offer.wholesaler.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          {offer.wholesaler.wilaya}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getOfferTypeLabel(offer.type)}
                        </span>
                        {offer.type === 'threshold' && offer.min_purchase_amount && (
                          <div className="text-xs text-gray-500 mt-1">
                            Min: {offer.min_purchase_amount.toFixed(2)} DZD
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
                        <div className="text-sm text-gray-900">{productsCount} produits</div>
                        {priorityCount > 0 && (
                          <div className="text-xs text-green-600">
                            dont {priorityCount} prioritaire{priorityCount > 1 ? 's' : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <a
                            href={`/offers/${offer.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Voir"
                          >
                            <ExternalLink className="h-5 w-5" />
                          </a>
                          <button
                            onClick={() => handleEditOffer(offer)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Modifier"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setSelectedOffer(offer)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Changer le propriétaire"
                          >
                            <Users className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => handleDuplicateOffer(offer.id, e)}
                            className="text-green-600 hover:text-green-900"
                            title="Dupliquer"
                          >
                            <Copy className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteOffer(offer.id)}
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

      {selectedOffer && (
        <ChangeOwnerModal
          offer={selectedOffer}
          onClose={() => setSelectedOffer(null)}
          onSave={handleChangeOwner}
        />
      )}

      {showWizard && (
        <PackCreationWizard
          isOpen={showWizard}
          onClose={() => {
            setShowWizard(false);
            setEditingOffer(null);
          }}
          onSuccess={() => {
            fetchOffers();
            setShowWizard(false);
            setEditingOffer(null);
          }}
          initialData={editingOffer}
        />
      )}
    </div>
  );
}