import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, Search, Clock, Loader2, AlertTriangle } from 'lucide-react';
import type { Tender, TenderItem } from '../types/supabase';
import { algerianWilayas } from '../lib/wilayas';

type ExtendedTender = Tender & {
  items_count: number;
  items?: (TenderItem & {
    medication: {
      commercial_name: string;
      form: string;
      dosage: string;
    } | null;
  })[];
};

export function PublicTenders() {
  const navigate = useNavigate();
  const [tenders, setTenders] = useState<ExtendedTender[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [wilayaFilter, setWilayaFilter] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTenders();
  }, []);

  async function fetchTenders() {
  try {
    setLoading(true);

    // 1️⃣ on ne demande plus le count…
    const { data, error } = await supabase
      .from('tenders')
      .select(`
        *,
        items:tender_items (
          id,
          quantity,
          medication:medications (
            commercial_name,
            form,
            dosage
          )
        )
      `)
      .eq('status', 'open')
      .eq('is_public', true)
      .gt('deadline', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 2️⃣ on calcule nous-mêmes items_count
    const processed = (data || []).map(t => ({
      ...t,
      items_count: t.items?.length ?? 0
    }));

    setTenders(processed);
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

  const handleWilayaChange = (wilaya: string) => {
    setWilayaFilter(prev => {
      if (prev.includes(wilaya)) {
        return prev.filter(w => w !== wilaya);
      } else {
        return [...prev, wilaya];
      }
    });
  };

  const filteredTenders = tenders.filter(tender => {
    // Apply search filter
    const matchesSearch = !searchQuery || 
      tender.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tender.items?.some(item => 
        item.medication?.commercial_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.medication?.form?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.medication?.dosage?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    // Apply wilaya filter
    const matchesWilaya = wilayaFilter.length === 0 || wilayaFilter.includes(tender.wilaya);
    
    return matchesSearch && matchesWilaya;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Médicaments recherchés par les pharmaciens</h1>
        <p className="mt-2 text-xl text-gray-600">
          Consultez les appels d'offres en cours et proposez vos meilleures offres
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          {/* Barre de recherche */}
          <div className="relative w-full md:w-1/2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Rechercher par titre ou médicament..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        
          {/* Sélecteur de wilaya */}
          <div className="w-full md:w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filtrer par wilaya
            </label>
            <select
              value={wilayaFilter[0] || ''}
              onChange={(e) => setWilayaFilter(e.target.value ? [e.target.value] : [])}
              className="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Toutes les wilayas</option>
              {algerianWilayas.map(w => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        </div>


      </div>

      {filteredTenders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun appel d'offres</h3>
          <p className="mt-1 text-sm text-gray-500">
            Aucun appel d'offres ne correspond à vos critères de recherche.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTenders.map((tender) => (
            <div
              key={tender.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
              onClick={() => navigate(`/tenders/public/${tender.public_link}`)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{tender.title}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Clock className="h-3 w-3 mr-1" />
                    Ouvert
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>
                      Date limite: {formatDate(tender.deadline)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Wilaya: {tender.wilaya}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Produits demandés:</h4>
                  <ul className="space-y-2">
                    {tender.items?.slice(0, 3).map((item) => (
                      <li key={item.id} className="text-sm text-gray-600">
                        {item.medication ? 
                          `${item.medication.commercial_name} - ${item.quantity} unités` : 
                          `Produit non disponible - ${item.quantity} unités`
                        }
                      </li>
                    ))}
                    {(tender.items_count) > 3 && (
                      <li className="text-sm text-indigo-600">
                        + {tender.items_count - 3} autres produits
                      </li>
                    )}
                  </ul>
                </div>

                <Link
                  to={`/tenders/public/${tender.public_link}`}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Voir les détails
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}