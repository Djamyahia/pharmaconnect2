import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Search, Clock, CheckCircle, XCircle, Loader2, ExternalLink, Filter } from 'lucide-react';
import type { Tender, TenderItem, TenderResponse } from '../../types/supabase';
import { algerianWilayas } from '../../lib/wilayas';

type ExtendedTender = Tender & {
  items_count: { count: string } | number;
  has_responded: boolean;
  items?: (TenderItem & {
    medication: {
      commercial_name: string;
      form: string;
      dosage: string;
    } | null;
  })[];
};

export function Tenders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tenders, setTenders] = useState<ExtendedTender[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed' | 'canceled'>('all');
  const [wilayaFilter, setWilayaFilter] = useState<string>('');
  const [responseFilter, setResponseFilter] = useState<'all' | 'responded' | 'not_responded'>('all');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchTenders();
    }
  }, [user?.id, statusFilter, wilayaFilter, responseFilter]);

  async function fetchTenders() {
    try {
      setLoading(true);
      
      // First, get all tenders that match the criteria
      let query = supabase
        .from('tenders')
        .select(`
          *,
          items_count:tender_items(count),
          items:tender_items (
            *,
            medication:medications (
              commercial_name,
              form,
              dosage
            )
          )
        `)
        .eq('status', 'open')
        .gt('deadline', new Date().toISOString());
      
      if (wilayaFilter) {
        query = query.eq('wilaya', wilayaFilter);
      } else if (user?.delivery_wilayas && user.delivery_wilayas.length > 0) {
        // Only filter by delivery wilayas if no specific wilaya is selected
        query = query.in('wilaya', user.delivery_wilayas);
      }
      
      const { data: tendersData, error: tendersError } = await query;
      
      if (tendersError) throw tendersError;
      
      // Then, get all responses by this wholesaler
      const { data: responsesData, error: responsesError } = await supabase
        .from('tender_responses')
        .select('tender_id')
        .eq('wholesaler_id', user?.id);
      
      if (responsesError) throw responsesError;
      
      // Create a set of tender IDs that this wholesaler has responded to
      const respondedTenderIds = new Set(responsesData?.map(r => r.tender_id) || []);
      
      // Mark each tender with whether this wholesaler has responded
      const tendersWithResponseInfo = (tendersData || []).map(tender => ({
        ...tender,
        has_responded: respondedTenderIds.has(tender.id)
      }));
      
      // Apply response filter
      let filteredTenders = tendersWithResponseInfo;
      if (responseFilter === 'responded') {
        filteredTenders = tendersWithResponseInfo.filter(t => t.has_responded);
      } else if (responseFilter === 'not_responded') {
        filteredTenders = tendersWithResponseInfo.filter(t => !t.has_responded);
      }
      
      setTenders(filteredTenders);
    } catch (error) {
      console.error('Error fetching tenders:', error);
      setError('Erreur lors de la récupération des appels d\'offres');
    } finally {
      setLoading(false);
    }
  }

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

  const getResponseBadge = (hasResponded: boolean) => {
    if (hasResponded) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Répondu
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="h-3 w-3 mr-1" />
        Non répondu
      </span>
    );
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
        <h2 className="text-2xl font-semibold text-gray-900">Appels d'offres</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Rechercher par titre ou produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <select
            value={wilayaFilter}
            onChange={(e) => setWilayaFilter(e.target.value)}
            className="border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Toutes les wilayas</option>
            {algerianWilayas
              .filter(w => !user?.delivery_wilayas || user.delivery_wilayas.includes(w.value))
              .map(wilaya => (
                <option key={wilaya.value} value={wilaya.value}>
                  {wilaya.label}
                </option>
              ))}
          </select>

          <select
            value={responseFilter}
            onChange={(e) => setResponseFilter(e.target.value as typeof responseFilter)}
            className="border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Tous les appels d'offres</option>
            <option value="responded">Déjà répondu</option>
            <option value="not_responded">Pas encore répondu</option>
          </select>
        </div>
      </div>

      {tenders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun appel d'offres</h3>
          <p className="mt-1 text-sm text-gray-500">
            Aucun appel d'offres ne correspond à vos critères de recherche.
          </p>
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
                    Wilaya
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produits
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Réponse
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenders
                  .filter(tender => {
                    if (!searchQuery) return true;
                    
                    const query = searchQuery.toLowerCase();
                    
                    // Search in title
                    if (tender.title.toLowerCase().includes(query)) return true;
                    
                    // Search in medications
                    return tender.items?.some(item => 
                      item.medication?.commercial_name?.toLowerCase().includes(query) ||
                      item.medication?.form?.toLowerCase().includes(query) ||
                      item.medication?.dosage?.toLowerCase().includes(query)
                    );
                  })
                  .map((tender) => (
                    <tr 
                      key={tender.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/wholesaler/tenders/${tender.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{tender.title}</div>
                        <div className="text-xs text-gray-500">
                          Créé le {formatDate(tender.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(tender.deadline)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">{tender.wilaya}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {typeof tender.items_count === 'object' ? tender.items_count.count : tender.items_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(tender.status, tender.deadline)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getResponseBadge(tender.has_responded)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <a
                            href={`/tenders/public/${tender.public_link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Voir la page publique"
                          >
                            <ExternalLink className="h-5 w-5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}