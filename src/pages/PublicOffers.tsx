import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, Package, Tag, ShoppingCart, Calendar, Info, AlertCircle, Share2, CheckCircle, X, FileText, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { ActiveOffer, OfferDocument } from '../types/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function PublicOffers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allOffers, setAllOffers] = useState<(ActiveOffer & { documents?: OfferDocument[] })[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<(ActiveOffer & { documents?: OfferDocument[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [offerType, setOfferType] = useState<'all' | 'pack' | 'threshold'>('all');
  const [error, setError] = useState('');
  const [loginRedirectUrl, setLoginRedirectUrl] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    // Filter offers client-side when search query or offer type changes
    filterOffers();
  }, [searchQuery, offerType, allOffers]);

  useEffect(() => {
    setLoginRedirectUrl(window.location.pathname);
  }, []);

  async function fetchOffers() {
    try {
      setLoading(true);
      
      // Get all public offers
      const { data: offersData, error: offersError } = await supabase
        .from('promotional_offers')
        .select('*')
        .eq('is_public', true)
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

  const handleOrderClick = (offerId: string) => {
    if (!user) {
      localStorage.setItem('redirectAfterLogin', `/offers/${offerId}`);
      navigate('/login');
    } else {
      navigate(`/pharmacist/offers/${offerId}`);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };

  const getOfferTypeLabel = (type: 'pack' | 'threshold') => {
    return type === 'pack' ? 'Pack groupé' : 'Offre sur achats libres';
  };

  const handleShare = (offerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/offers/${offerId}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Offre spéciale PharmaConnect',
        text: 'Découvrez cette offre spéciale sur PharmaConnect',
        url: url
      }).catch(err => {
        console.error('Error sharing:', err);
        // Fallback to copy to clipboard
        copyToClipboard(url);
        setShareModalOpen(offerId);
      });
    } else {
      // Fallback for browsers that don't support navigator.share
      copyToClipboard(url);
      setShareModalOpen(offerId);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Success
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Offres promotionnelles</h1>
        <p className="mt-2 text-gray-600">
          Découvrez les offres spéciales proposées par nos grossistes partenaires
        </p>
      </div>

      {!user && (
        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-6 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-indigo-700">
                Vous consultez les offres en tant que visiteur. Pour commander, veuillez{' '}
                <a href="/login" className="font-medium underline">vous connecter</a>{' '}
                ou{' '}
                <a href="/register" className="font-medium underline">créer un compte</a>.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      </div>

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

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredOffers.length === 0 ? (
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
                  <div className="flex space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getOfferTypeLabel(offer.type)}
                    </span>
                    <button 
                      onClick={(e) => handleShare(offer.id, e)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Partager cette offre"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
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
                </div>

                {offer.documents && offer.documents.length > 0 && (
                  <div className="mb-4 bg-blue-50 p-3 rounded-md">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">
                      Documents disponibles :
                    </h4>
                    <ul className="space-y-1">
                      {offer.documents.slice(0, 2).map((doc) => (
                        <li key={doc.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 text-blue-600 mr-1" />
                            <span className="text-sm text-blue-700">{doc.file_name}</span>
                          </div>
                          <button
                            onClick={(e) => handleDownloadDocument(doc, e)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            <Download className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                      {offer.documents.length > 2 && (
                        <li className="text-sm text-blue-700">
                          + {offer.documents.length - 2} autre(s) document(s)
                        </li>
                      )}
                    </ul>
                  </div>
                )}

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

                <div className="flex space-x-2 mt-4">
                  <Link
                    to={`/offers/${offer.id}`}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Tag className="h-4 w-4 mr-2" />
                    Détails
                  </Link>
                  <button
                    onClick={() => handleOrderClick(offer.id)}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Commander
                  </button>
                </div>
              </div>
              
              {shareModalOpen === offer.id && (
                <div className="p-4 bg-gray-50 border-t">
                  <p className="text-sm text-gray-700 mb-2">Lien copié dans le presse-papier !</p>
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareModalOpen(null);
                      }}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}