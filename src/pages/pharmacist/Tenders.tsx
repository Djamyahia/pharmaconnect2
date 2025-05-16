import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Plus, Search, Clock, CheckCircle, XCircle, Loader2, ExternalLink, Copy, RefreshCw } from 'lucide-react';
import type { Tender, TenderItem, TenderResponse } from '../../types/supabase';

type ExtendedTender = Tender & {
  items: (TenderItem & {
    medication: {
      commercial_name: string;
      form: string;
      dosage: string;
    };
  })[];
  responses: { id: string }[];
};

export function Tenders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tenders, setTenders] = useState<ExtendedTender[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed' | 'canceled'>('open');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [reopeningTender, setReopeningTender] = useState<string | null>(null);
  const [cloningTender, setCloningTender] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchTenders();
    }
  }, [user?.id, statusFilter]);

  async function fetchTenders() {
    try {
      setLoading(true);
      
      let query = supabase
        .from('tenders')
        .select(`
          *,
          items:tender_items (
            id,
            medication:medications (
              commercial_name,
              form,
              dosage
            )
          ),
          responses:tender_responses (
            id
          )
        `)
        .eq('pharmacist_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setTenders(data || []);
    } catch (error) {
      console.error('Error fetching tenders:', error);
      setError('Erreur lors de la récupération des appels d\'offres');
    } finally {
      setLoading(false);
    }
  }

  const handleCopyLink = (publicLink: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const fullUrl = `${window.location.origin}/tenders/public/${publicLink}`;
    navigator.clipboard.writeText(fullUrl);
    
    setCopiedLink(publicLink);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleReopenTender = async (tenderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Êtes-vous sûr de vouloir rouvrir cet appel d\'offres ?')) {
      return;
    }
    
    try {
      setReopeningTender(tenderId);
      
      // Get the tender to check its deadline
      const { data: tender, error: tenderError } = await supabase
        .from('tenders')
        .select('deadline')
        .eq('id', tenderId)
        .single();
      
      if (tenderError) throw tenderError;
      
      // Check if deadline is in the past
      const deadlineDate = new Date(tender.deadline);
      const now = new Date();
      
      // If deadline is in the past, set a new deadline 7 days from now
      let newDeadline = tender.deadline;
      if (deadlineDate < now) {
        const newDeadlineDate = new Date();
        newDeadlineDate.setDate(newDeadlineDate.getDate() + 7);
        newDeadline = newDeadlineDate.toISOString();
      }
      
      const { error } = await supabase
        .from('tenders')
        .update({ 
          status: 'open',
          deadline: newDeadline
        })
        .eq('id', tenderId);
      
      if (error) throw error;
      
      fetchTenders();
    } catch (error) {
      console.error('Error reopening tender:', error);
      setError('Erreur lors de la réouverture de l\'appel d\'offres');
    } finally {
      setReopeningTender(null);
    }
  };

  const handleCloneTender = async (tenderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      setCloningTender(tenderId);
      
      // Get the tender to clone
      const { data: tenderToClone, error: tenderError } = await supabase
        .from('tenders')
        .select(`
          title,
          wilaya,
          is_public,
          items:tender_items (
            medication_id,
            quantity
          )
        `)
        .eq('id', tenderId)
        .single();
      
      if (tenderError) throw tenderError;
      
      // Create a new deadline 14 days from now
      const newDeadline = new Date();
      newDeadline.setDate(newDeadline.getDate() + 14);
      
      // Create a new tender with the same details
      const { data: newTender, error: createError } = await supabase
        .from('tenders')
        .insert({
          pharmacist_id: user?.id,
          title: `${tenderToClone.title} (copie)`,
          deadline: newDeadline.toISOString(),
          wilaya: tenderToClone.wilaya,
          is_public: tenderToClone.is_public,
          status: 'open'
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      // Clone all tender items
      const newItems = tenderToClone.items.map((item: any) => ({
        tender_id: newTender.id,
        medication_id: item.medication_id,
        quantity: item.quantity
      }));
      
      const { error: itemsError } = await supabase
        .from('tender_items')
        .insert(newItems);
      
      if (itemsError) throw itemsError;
      
      // Navigate to the new tender
      navigate(`/pharmacist/tenders/${newTender.id}`);
    } catch (error) {
      console.error('Error cloning tender:', error);
      setError('Erreur lors de la duplication de l\'appel d\'offres');
    } finally {
      setCloningTender(null);
    }
  };

  const handleCancelTender = async (tenderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Êtes-vous sûr de vouloir annuler cet appel d\'offres ?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('tenders')
        .update({ status: 'canceled' })
        .eq('id', tenderId);
      
      if (error) throw error;
      
      fetchTenders();
    } catch (error) {
      console.error('Error canceling tender:', error);
      setError('Erreur lors de l\'annulation de l\'appel d\'offres');
    }
  };

  const handleCloseTender = async (tenderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Êtes-vous sûr de vouloir clôturer cet appel d\'offres ? Aucune nouvelle réponse ne sera acceptée.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('tenders')
        .update({ status: 'closed' })
        .eq('id', tenderId);
      
      if (error) throw error;
      
      fetchTenders();
    } catch (error) {
      console.error('Error closing tender:', error);
      setError('Erreur lors de la clôture de l\'appel d\'offres');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string, deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const isExpired = deadlineDate < now;
    
    switch (status) {
      case 'open':
        if (isExpired) {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <Clock className="h-3 w-3 mr-1" />
              Expiré
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ouvert
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            Clôturé
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Annulé
          </span>
        );
      default:
        return null;
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
        <h2 className="text-2xl font-semibold text-gray-900">Mes appels d'offres</h2>
        <button
          onClick={() => navigate('/pharmacist/tenders/create')}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Créer un appel d'offres
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative w-full md:w-auto md:flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Rechercher par titre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="w-full md:w-auto border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="open">Ouverts</option>
            <option value="closed">Clôturés</option>
            <option value="canceled">Annulés</option>
          </select>
        </div>
      </div>

      {tenders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun appel d'offres</h3>
          <p className="mt-1 text-sm text-gray-500">
            Commencez par créer un nouvel appel d'offres pour recevoir des propositions de grossistes.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/pharmacist/tenders/create')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Créer un appel d'offres
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Titre
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date limite
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produits
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Réponses
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lien public
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenders
                  .filter(tender => 
                    tender.title.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((tender) => {
                    const isExpired = new Date(tender.deadline) < new Date();
                    const isOpen = tender.status === 'open';
                    const isClosed = tender.status === 'closed';
                    const isCanceled = tender.status === 'canceled';
                    
                    return (
                      <tr 
                        key={tender.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/pharmacist/tenders/${tender.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{tender.title}</div>
                          <div className="text-xs text-gray-500">Wilaya: {tender.wilaya}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(tender.deadline)}</div>
                          {isExpired && isOpen && (
                            <div className="text-xs text-red-500">Expiré</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {tender.items.length}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            {tender.responses.length}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusBadge(tender.status, tender.deadline)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={(e) => handleCopyLink(tender.public_link, e)}
                            className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs rounded hover:bg-gray-50"
                            title="Copier le lien public"
                          >
                            {copiedLink === tender.public_link ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                                Copié
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" />
                                Copier
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/tenders/public/${tender.public_link}`, '_blank');
                              }}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Voir la page publique"
                            >
                              <ExternalLink className="h-5 w-5" />
                            </button>
                            
                            <button
                              onClick={(e) => handleCloneTender(tender.id, e)}
                              disabled={cloningTender === tender.id}
                              className={`text-green-600 hover:text-green-900 ${cloningTender === tender.id ? 'opacity-50' : ''}`}
                              title="Dupliquer l'appel d'offres"
                            >
                              {cloningTender === tender.id ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                              ) : (
                                <Copy className="h-5 w-5" />
                              )}
                            </button>
                            
                            {(isClosed || isCanceled) && (
                              <button
                                onClick={(e) => handleReopenTender(tender.id, e)}
                                disabled={reopeningTender === tender.id}
                                className={`text-amber-600 hover:text-amber-900 ${reopeningTender === tender.id ? 'opacity-50' : ''}`}
                                title="Rouvrir l'appel d'offres"
                              >
                                {reopeningTender === tender.id ? (
                                  <Loader2 className="animate-spin h-5 w-5" />
                                ) : (
                                  <RefreshCw className="h-5 w-5" />
                                )}
                              </button>
                            )}
                            
                            {isOpen && !isExpired && (
                              <button
                                onClick={(e) => handleCloseTender(tender.id, e)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Clôturer l'appel d'offres"
                              >
                                <Clock className="h-5 w-5" />
                              </button>
                            )}
                            
                            {isOpen && (
                              <button
                                onClick={(e) => handleCancelTender(tender.id, e)}
                                className="text-red-600 hover:text-red-900"
                                title="Annuler l'appel d'offres"
                              >
                                <XCircle className="h-5 w-5" />
                              </button>
                            )}
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
    </div>
  );
}