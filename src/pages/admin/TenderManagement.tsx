import React, { useEffect, useState } from 'react';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { Search, FileText, Loader2, ExternalLink, Download, Mail, X, Send, Plus } from 'lucide-react';
import type { Tender, TenderItem, TenderResponse, User } from '../../types/supabase';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';

type ExtendedTender = Tender & {
  pharmacist: User;
  items_count: number | { count: number };
  responses_count: number | { count: number };
  items?: (TenderItem & {
    medication: {
      commercial_name: string;
      form: string;
      dosage: string;
    };
  })[];
  responses?: (TenderResponse & {
    wholesaler: User;
    items: any[];
  })[];
};

type EmailModalProps = {
  tender: ExtendedTender;
  onClose: () => void;
};

function EmailModal({ tender, onClose }: EmailModalProps) {
  const [email, setEmail] = useState('');
  const [includeContacts, setIncludeContacts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const tenderUrl = `${window.location.origin}/tenders/public/${tender.public_link}`;

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  
  if (!email) {
    setError('L\'adresse email est requise');
    return;
  }
  
  try {
    setLoading(true);
    
    // 1) Génération du contenu HTML
    const content = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
        <!-- en-tête -->
        <div style="background:#4F46E5;padding:16px;text-align:center;border-radius:4px 4px 0 0;">
          <h1 style="margin:0;color:#fff;font-size:20px;">Résultats de l'appel d'offres</h1>
        </div>
        <!-- corps -->
        <div style="padding:16px;background:#f9fafb;">
          <p style="margin:4px 0;"><strong>Titre :</strong> ${tender.title}</p>
          <p style="margin:4px 0;"><strong>Wilaya :</strong> ${tender.wilaya}</p>
          <p style="margin:4px 0;"><strong>Date limite :</strong> ${new Date(tender.deadline).toLocaleDateString('fr-FR')}</p>
          
          <h2 style="font-size:16px;color:#4F46E5;margin:16px 0 8px;">Produits demandés</h2>
          <ul style="padding-left:20px;margin:4px 0;">
            ${tender.items?.map(item => `
              <li style="margin:2px 0;">
                ${item.medication.commercial_name} – ${item.medication.form} ${item.medication.dosage} : ${item.quantity}
              </li>
            `).join('')}
          </ul>
          
          <h2 style="font-size:16px;color:#4F46E5;margin:16px 0 8px;">Réponses reçues</h2>
          ${
            tender.responses && tender.responses.length > 0
              ? tender.responses.map(response => {
                  const total = response.items
                    .reduce((sum, ri) => {
                      const ti = tender.items?.find(ti => ti.id === ri.tender_item_id);
                      return sum + (ri.price * (ti?.quantity||0));
                    }, 0)
                    .toFixed(2);
                  return `
            <div style="margin-bottom:12px;padding:12px;background:#fff;border:1px solid #e5e7eb;border-radius:4px;">
              <p style="margin:0 0 6px;"><strong>${response.wholesaler.company_name}</strong></p>
              ${includeContacts ? `
                <p style="margin:2px 0;"><strong>Email :</strong> ${response.wholesaler.email}</p>
                <p style="margin:2px 0;"><strong>Tél. :</strong> ${response.wholesaler.phone}</p>
              ` : ''}
              <ul style="padding-left:20px;margin:4px 0;">
                ${response.items.map(ri => {
                  const ti = tender.items?.find(ti => ti.id === ri.tender_item_id);
                  const lineTotal = (ri.price * (ti?.quantity||0)).toFixed(2);
                  return `
                <li style="margin:2px 0;">
                  ${ti?.medication.commercial_name} – ${ti?.medication.form} ${ti?.medication.dosage},
                  Qté: ${ti?.quantity}, PU: ${ri.price.toFixed(2)} DZD,
                  UG: ${ri.free_units_percentage ?? '-'}%, Total: ${lineTotal} DZD,
                  Livraison: ${new Date(ri.delivery_date).toLocaleDateString('fr-FR')}
                </li>`;
                }).join('')}
              </ul>
              <p style="margin:4px 0;"><strong>Total ${response.wholesaler.company_name} :</strong> ${total} DZD</p>
            </div>`;
                }).join('')
              : `<p style="margin:4px 0;">Aucune réponse reçue.</p>`
          }
          
          <p style="text-align:center;margin:20px 0;">
            <a href="${tenderUrl}" style="display:inline-block;padding:10px 20px;background:#4F46E5;color:#fff;
               text-decoration:none;border-radius:4px;font-weight:bold;">
              Voir l'appel d'offres
            </a>
          </p>
          
          <p style="font-size:12px;color:#777;margin-top:24px;text-align:center;">
            Email généré automatiquement par PharmaConnect.
          </p>
        </div>
      </div>
    `;
    
    // 2) Envoi via ta fonction Supabase
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-fixed`;
    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        to: email,
        subject: `Résultats de l'appel d'offres : ${tender.title}`,
        content,
      }),
    });
    
    if (!res.ok) {
      const { message } = await res.json();
      throw new Error(message || 'Erreur lors de l’envoi du mail');
    }
    
    // 3) Feedback à l’utilisateur
    setSuccess(true);
    setTimeout(onClose, 2000);
  } catch (err) {
    console.error('Error sending email:', err);
    setError(`Échec de l’envoi : ${err instanceof Error ? err.message : 'Unknown error'}`);
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Envoyer les résultats par email</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {success ? (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-4">
            Email envoyé avec succès !
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Adresse email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeContacts"
                checked={includeContacts}
                onChange={(e) => setIncludeContacts(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="includeContacts" className="ml-2 block text-sm text-gray-700">
                Inclure les coordonnées des grossistes
              </label>
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
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Envoyer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function TenderManagement() {
  const [tenders, setTenders] = useState<ExtendedTender[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed' | 'canceled'>('all');
  const [selectedTender, setSelectedTender] = useState<ExtendedTender | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTenders();
  }, [statusFilter]);

  async function fetchTenders() {
    try {
      setLoading(true);
      
      let query = supabaseAdmin
        .from('tenders')
        .select(`
          *,
          pharmacist:users!tenders_pharmacist_id_fkey (
            *
          ),
          items_count:tender_items(count),
          responses_count:tender_responses(count),
          items:tender_items (
            *,
            medication:medications (
              commercial_name,
              form,
              dosage
            )
          ),
          responses:tender_responses (
            *,
            wholesaler:users (
              *
            ),
            items:tender_response_items (
              *,
              tender_item:tender_items (
                *,
                medication:medications (
                  commercial_name,
                  form,
                  dosage
                )
              )
            )
          )
        `)
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

  const handleExportTender = (tender: ExtendedTender) => {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Create tender info sheet
      const tenderInfoData = [
        ['Titre', tender.title],
        ['Pharmacien', tender.pharmacist?.company_name || 'Admin'],
        ['Email', tender.pharmacist?.email || ''],
        ['Téléphone', tender.pharmacist?.phone || ''],
        ['Wilaya', tender.wilaya],
        ['Date limite', new Date(tender.deadline).toLocaleString('fr-FR')],
        ['Statut', tender.status],
        ['Lien public', `${window.location.origin}/tenders/public/${tender.public_link}`],
        ['Créé le', new Date(tender.created_at).toLocaleString('fr-FR')],
      ];
      
      if (tender.admin_facebook_link) {
        tenderInfoData.push(['Lien Facebook', tender.admin_facebook_link]);
      }
      
      if (tender.admin_facebook_profile) {
        tenderInfoData.push(['Profil Facebook', tender.admin_facebook_profile]);
      }
      
      const tenderInfoWs = XLSX.utils.aoa_to_sheet(tenderInfoData);
      XLSX.utils.book_append_sheet(wb, tenderInfoWs, 'Informations');
      
      // Create items sheet
      const itemsData = [
        ['Médicament', 'Forme', 'Dosage', 'Quantité']
      ];
      
      tender.items?.forEach(item => {
        itemsData.push([
          item.medication.commercial_name,
          item.medication.form,
          item.medication.dosage,
          item.quantity
        ]);
      });
      
      const itemsWs = XLSX.utils.aoa_to_sheet(itemsData);
      XLSX.utils.book_append_sheet(wb, itemsWs, 'Produits');
      
      // Create responses sheet
      if (tender.responses && tender.responses.length > 0) {
        const responsesData = [
          ['Grossiste', 'Email', 'Téléphone', 'Médicament', 'Quantité', 'Prix unitaire', 'UG', 'Total', 'Date de livraison', 'Date d\'expiration']
        ];
        
        tender.responses.forEach(response => {
          response.items.forEach(item => {
            const tenderItem = tender.items?.find(ti => ti.id === item.tender_item_id);
            if (!tenderItem) return;
            
            const totalPrice = item.price * tenderItem.quantity;
            
            responsesData.push([
              response.wholesaler.company_name,
              response.wholesaler.email,
              response.wholesaler.phone,
              tenderItem.medication.commercial_name,
              tenderItem.quantity,
              item.price,
              item.free_units_percentage || '',
              totalPrice,
              new Date(item.delivery_date).toLocaleString('fr-FR'),
              item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('fr-FR') : ''
            ]);
          });
        });
        
        const responsesWs = XLSX.utils.aoa_to_sheet(responsesData);
        XLSX.utils.book_append_sheet(wb, responsesWs, 'Réponses');
      }
      
      // Write file
      XLSX.writeFile(wb, `appel_offres_${tender.id}.xlsx`);
    } catch (error) {
      console.error('Error exporting tender:', error);
      setError('Erreur lors de l\'export de l\'appel d\'offres');
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
              Expiré
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Ouvert
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Clôturé
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Annulé
          </span>
        );
      default:
        return null;
    }
  };

  const getCount = (count: number | { count: number } | undefined) => {
    if (typeof count === 'object' && count !== null) {
      return count.count || 0;
    }
    return count || 0;
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
        <h2 className="text-2xl font-semibold text-gray-900">Gestion des appels d'offres</h2>
        <button
          onClick={() => navigate('/admin/tenders/create')}
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
              placeholder="Rechercher par titre, pharmacien..."
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
                    Pharmacien
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
                    Réponses
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
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
                    
                    return (
                      tender.title.toLowerCase().includes(query) ||
                      (tender.pharmacist?.company_name?.toLowerCase().includes(query) || false) ||
                      (tender.pharmacist?.email?.toLowerCase().includes(query) || false) ||
                      tender.wilaya.toLowerCase().includes(query)
                    );
                  })
                  .map((tender) => (
                    <tr
                      key={tender.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/admin/tenders/${tender.id}`)}
                    >

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{tender.title}</div>
                        <div className="text-xs text-gray-500">
                          Créé le {formatDate(tender.created_at)}
                        </div>
                        {tender.admin_facebook_link && (
                          <div className="text-xs text-blue-600">
                            <a href={tender.admin_facebook_link} target="_blank" rel="noopener noreferrer">
                              Lien Facebook
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {tender.pharmacist?.company_name || 'Créé par Admin'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {tender.pharmacist?.email || ''}
                        </div>
                        <div className="text-xs text-gray-500">
                          {tender.pharmacist?.phone || ''}
                        </div>
                        {tender.admin_facebook_profile && (
                          <div className="text-xs text-blue-600">
                            FB: {tender.admin_facebook_profile}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(tender.deadline)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">{tender.wilaya}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {getCount(tender.items_count)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          {getCount(tender.responses_count)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(tender.status, tender.deadline)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <a
                            href={`/tenders/public/${tender.public_link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Voir la page publique"
                          >
                            <ExternalLink className="h-5 w-5" />
                          </a>
                          <button
                            onClick={() => handleExportTender(tender)}
                            className="text-green-600 hover:text-green-900"
                            title="Exporter en Excel"
                          >
                            <Download className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTender(tender);
                              setShowEmailModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Envoyer par email"
                          >
                            <Mail className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showEmailModal && selectedTender && (
        <EmailModal
          tender={selectedTender}
          onClose={() => {
            setShowEmailModal(false);
            setSelectedTender(null);
          }}
        />
      )}
    </div>
  );
}