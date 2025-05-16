import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, 
  Clock, 
  Loader2, 
  AlertTriangle,
  FileText,
  LogIn
} from 'lucide-react';
import type { 
  Tender, 
  TenderItem
} from '../types/supabase';

type ExtendedTenderItem = TenderItem & {
  medication: {
    commercial_name: string;
    form: string;
    dosage: string;
  } | null;
};

export function PublicTenderView() {
  const { publicLink } = useParams<{ publicLink: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [tender, setTender] = useState<Tender | null>(null);
  const [tenderItems, setTenderItems] = useState<ExtendedTenderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (publicLink) {
      fetchTenderDetails();
    }
  }, [publicLink]);

  async function fetchTenderDetails() {
    try {
      setLoading(true);
      setError('');
      
      // Fetch tender by public link with limit 1 to ensure single result
      const { data: tenderData, error: tenderError } = await supabase
        .from('tenders')
        .select('*')
        .eq('public_link', publicLink)
        .limit(1)
        .maybeSingle();
      
      if (tenderError) {
        console.error('Error fetching tender:', tenderError);
        setError('Erreur lors de la récupération de l\'appel d\'offres');
        return;
      }
      
      if (!tenderData) {
        setError('Appel d\'offres introuvable');
        return;
      }
      
      setTender(tenderData);
      
      // Fetch tender items with medication data
      const { data: itemsData, error: itemsError } = await supabase
        .from('tender_items')
        .select(`
          *,
          medication:medications (
            commercial_name,
            form,
            dosage
          )
        `)
        .eq('tender_id', tenderData.id);
      
      if (itemsError) {
        console.error('Error fetching tender items:', itemsError);
        setError('Erreur lors de la récupération des détails de l\'appel d\'offres');
        return;
      }
      
      setTenderItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching tender details:', error);
      setError('Erreur lors de la récupération des détails de l\'appel d\'offres');
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
            <Clock className="h-3 w-3 mr-1" />
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
            <Clock className="h-3 w-3 mr-1" />
            Annulé
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !tender) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Appel d'offres introuvable</h3>
          <p className="mt-1 text-sm text-gray-500">
            L'appel d'offres que vous recherchez n'existe pas ou a été supprimé.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = new Date(tender.deadline) < new Date();
  const isOpen = tender.status === 'open';
  const canRespond = isOpen && !isExpired && user?.role === 'wholesaler';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{tender.title}</h2>
            {getStatusBadge(tender.status, tender.deadline)}
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informations générales</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Date limite</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(tender.deadline)}
                    {isExpired && isOpen && (
                      <span className="ml-2 text-xs text-red-500">Expiré</span>
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Wilaya</dt>
                  <dd className="mt-1 text-sm text-gray-900">{tender.wilaya}</dd>
                </div>
              </dl>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Actions</h3>
              </div>
              <div className="space-y-3">
                {user ? (
                  canRespond ? (
                    <Link
                      to={`/wholesaler/tenders/${tender.id}`}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <FileText className="h-5 w-5 mr-2" />
                      Répondre à l'appel d'offres
                    </Link>
                  ) : user.role === 'wholesaler' ? (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            {isExpired ? 
                              "Cet appel d'offres a expiré." : 
                              tender.status === 'closed' ? 
                                "Cet appel d'offres est clôturé." : 
                                "Cet appel d'offres est annulé."}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            Seuls les grossistes peuvent répondre aux appels d'offres.
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <Link
                    to="/login"
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <LogIn className="h-5 w-5 mr-2" />
                    Se connecter pour répondre
                  </Link>
                )}
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Médicament
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantité
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenderItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.medication ? (
                        <>
                          <div className="text-sm font-medium text-gray-900">
                            {item.medication.commercial_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.medication.form} - {item.medication.dosage}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-500">
                          Médicament non disponible
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {item.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">
              Cet appel d'offres est anonyme. Les informations du pharmacien ne seront visibles qu'après acceptation d'une réponse.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}