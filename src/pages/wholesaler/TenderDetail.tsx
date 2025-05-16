import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, 
  Clock, 
  ExternalLink, 
  Loader2, 
  Send, 
  AlertTriangle,
  Save,
  X,
  Calendar,
  Percent
} from 'lucide-react';
import type { 
  Tender, 
  TenderItem, 
  TenderResponse, 
  TenderResponseItem,
  TenderMessage,
  User
} from '../../types/supabase';


type ExtendedTenderItem = TenderItem & {
  medication: {
    commercial_name: string;
    form: string;
    dosage: string;
  };
};

type ResponseFormItem = {
  tender_item_id: string;
  price: number;
  free_units_percentage: number | null;
  delivery_date: string;
  expiry_date: string | null;
};



export function TenderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [tender, setTender] = useState<Tender | null>(null);
  const [tenderItems, setTenderItems] = useState<ExtendedTenderItem[]>([]);
  const [existingResponse, setExistingResponse] = useState<TenderResponse | null>(null);
  const [existingResponseItems, setExistingResponseItems] = useState<TenderResponseItem[]>([]);
  const [messages, setMessages] = useState<(TenderMessage & { user: User })[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [responseLoading, setResponseLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const responseSectionRef = useRef<HTMLDivElement>(null);
  
  // Form state for response
  const [responseItems, setResponseItems] = useState<ResponseFormItem[]>([]);

  useEffect(() => {
    if (id) {
      fetchTenderDetails();
    }
  }, [id]);

  useEffect(() => {
   if (isEditing && responseSectionRef.current) {
     responseSectionRef.current.scrollIntoView({ behavior: 'smooth' });
   }
 }, [isEditing]);

  useEffect(() => {
    // Set up real-time subscription for new messages
    if (id) {
      const messagesSubscription = supabase
        .channel('tender-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'tender_messages',
            filter: `tender_id=eq.${id}`
          },
          (payload) => {
            // Only fetch messages from the pharmacist or from this wholesaler
            if (payload.new.user_id === tender?.pharmacist_id || payload.new.user_id === user?.id) {
              fetchMessageUser(payload.new);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesSubscription);
      };
    }
  }, [id, tender?.pharmacist_id, user?.id]);

  async function fetchMessageUser(message: any) {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', message.user_id)
        .single();
      
      if (userError) throw userError;
      
      setMessages(prev => [...prev, { ...message, user: userData }]);
    } catch (error) {
      console.error('Error fetching message user:', error);
    }
  }

  async function fetchTenderDetails() {
    try {
      setLoading(true);
      
      // Fetch tender
      const { data: tenderData, error: tenderError } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', id)
        .single();
      
      if (tenderError) throw tenderError;
      
      setTender(tenderData);
      
      // Fetch tender items
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
        .eq('tender_id', id);
      
      if (itemsError) throw itemsError;
      
      setTenderItems(itemsData || []);
      
      // Initialize response form items
      const initialResponseItems = (itemsData || []).map(item => ({
        tender_item_id: item.id,
        price: 0,
        free_units_percentage: null,
        delivery_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // tomorrow
        expiry_date: null
      }));
      
      setResponseItems(initialResponseItems);
      
      // Check if wholesaler has already responded
      const { data: responseData, error: responseError } = await supabase
        .from('tender_responses')
        .select('*')
        .eq('tender_id', id)
        .eq('wholesaler_id', user?.id)
        .maybeSingle();
      
      if (responseError) throw responseError;
      
      if (responseData) {
        setExistingResponse(responseData);
        
        // Fetch response items
        const { data: responseItemsData, error: responseItemsError } = await supabase
          .from('tender_response_items')
          .select('*')
          .eq('tender_response_id', responseData.id);
        
        if (responseItemsError) throw responseItemsError;
        
        setExistingResponseItems(responseItemsData || []);
        
        // Pre-fill form with existing response data
        if (responseItemsData) {
          const filledResponseItems = initialResponseItems.map(item => {
            const existingItem = responseItemsData.find(ri => ri.tender_item_id === item.tender_item_id);
            
            if (existingItem) {
              return {
                tender_item_id: item.tender_item_id,
                price: existingItem.price,
                free_units_percentage: existingItem.free_units_percentage,
                delivery_date: new Date(existingItem.delivery_date).toISOString().slice(0, 16),
                expiry_date: existingItem.expiry_date
              };
            }
            
            return item;
          });
          
          setResponseItems(filledResponseItems);
        }
      }
      
      // Fetch messages - only between this wholesaler and the pharmacist
      const { data: messagesData, error: messagesError } = await supabase
        .from('tender_messages')
        .select(`
          *,
          user:users (
            *
          )
        `)
        .eq('tender_id', id)
        .or(`user_id.eq.${user?.id},user_id.eq.${tenderData.pharmacist_id}`)
        .order('created_at', { ascending: true });
      
      if (messagesError) throw messagesError;
      
      setMessages(messagesData || []);
    } catch (error) {
      console.error('Error fetching tender details:', error);
      setError('Erreur lors de la récupération des détails de l\'appel d\'offres');
    } finally {
      setLoading(false);
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    try {
      setMessageLoading(true);
      
      const { error } = await supabase
        .from('tender_messages')
        .insert({
          tender_id: id,
          user_id: user?.id,
          message: newMessage.trim()
        });
      
      if (error) throw error;
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Erreur lors de l\'envoi du message');
    } finally {
      setMessageLoading(false);
    }
  };

  const handleResponseItemChange = (index: number, field: string, value: any) => {
    const newItems = [...responseItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setResponseItems(newItems);
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    const filledItems = responseItems.filter(item => 
      item.price > 0 && item.delivery_date
    );
    
    if (filledItems.length === 0) {
      setError('Veuillez remplir au moins un produit avec un prix et une date de livraison');
      return;
    }
    
    try {
      setResponseLoading(true);
      
      if (existingResponse) {
        // Update existing response
        
        // First, delete existing response items
        const { error: deleteError } = await supabase
          .from('tender_response_items')
          .delete()
          .eq('tender_response_id', existingResponse.id);
        
        if (deleteError) throw deleteError;
        
        // Then, insert new response items
        const responseItemsToInsert = filledItems.map(item => ({
          tender_response_id: existingResponse.id,
          tender_item_id: item.tender_item_id,
          price: item.price,
          free_units_percentage: item.free_units_percentage,
          delivery_date: item.delivery_date,
          expiry_date: item.expiry_date
        }));
        
        const { error: insertError } = await supabase
          .from('tender_response_items')
          .insert(responseItemsToInsert);
        
        if (insertError) throw insertError;
        
        // Update the response updated_at timestamp
        const { error: updateError } = await supabase
          .from('tender_responses')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', existingResponse.id);
        
        if (updateError) throw updateError;
      } else {
        // Create new response
        const { data: responseData, error: responseError } = await supabase
          .from('tender_responses')
          .insert({
            tender_id: id,
            wholesaler_id: user?.id
          })
          .select()
          .single();
        
        if (responseError) throw responseError;
        
        // Insert response items
        const responseItemsToInsert = filledItems.map(item => ({
          tender_response_id: responseData.id,
          tender_item_id: item.tender_item_id,
          price: item.price,
          free_units_percentage: item.free_units_percentage,
          delivery_date: item.delivery_date,
          expiry_date: item.expiry_date
        }));
        
        const { error: insertError } = await supabase
          .from('tender_response_items')
          .insert(responseItemsToInsert);
        
        if (insertError) throw insertError;
        
        setExistingResponse(responseData);
      }
      
      // Refresh data
      fetchTenderDetails();
      setIsEditing(false);
    } catch (error) {
      console.error('Error submitting response:', error);
      setError('Erreur lors de l\'envoi de la réponse');
    } finally {
      setResponseLoading(false);
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

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);
    
    if (diffMins < 60) {
      return `il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else {
      return formatDate(dateString);
    }
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
            <X className="h-3 w-3 mr-1" />
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

  if (!tender) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Appel d'offres introuvable</h3>
        <p className="mt-1 text-sm text-gray-500">
          L'appel d'offres que vous recherchez n'existe pas ou vous n'avez pas les permissions nécessaires.
        </p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/wholesaler/tenders')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Retour aux appels d'offres
          </button>
        </div>
      </div>
    );
  }

  const isExpired = new Date(tender.deadline) < new Date();
  const isOpen = tender.status === 'open';
  const canRespond = isOpen && !isExpired;

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <button
          onClick={() => navigate('/wholesaler/tenders')}
          className="mr-4 text-indigo-600 hover:text-indigo-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-2xl font-semibold text-gray-900">{tender.title}</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informations générales</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Statut</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {getStatusBadge(tender.status, tender.deadline)}
                </dd>
              </div>
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
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Visibilité</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {tender.is_public ? 'Public' : 'Privé'}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Actions</h3>
            </div>
            <div className="space-y-3">
              {canRespond && !existingResponse && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Send className="h-5 w-5 mr-2" />
                  Répondre à l'appel d'offres
                </button>
              )}
              {canRespond && existingResponse && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-5 w-5 mr-2" />
                  Modifier ma réponse
                </button>
              )}
              <a
                href={`/tenders/public/${tender.public_link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ExternalLink className="h-5 w-5 mr-2" />
                Voir la page publique
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Produits demandés</h3>
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
                    <div className="text-sm font-medium text-gray-900">
                      {item.medication.commercial_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {item.medication.form} - {item.medication.dosage}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      

      {isEditing ? (
        <div ref={responseSectionRef} className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">
              {existingResponse ? 'Modifier ma réponse' : 'Répondre à l\'appel d\'offres'}
            </h3>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmitResponse}>
              <div className="space-y-6">
                <p className="text-sm text-gray-500">
                  Vous pouvez répondre à tout ou partie des produits demandés. Seuls les produits avec un prix et une date de livraison seront inclus dans votre réponse.
                </p>
                
                {tenderItems.map((item, index) => (
                  <div key={item.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="mb-4">
                      <h4 className="text-md font-medium text-gray-900">
                        {item.medication.commercial_name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {item.medication.form} - {item.medication.dosage}
                      </p>
                      <p className="text-sm text-gray-500">
                        Quantité demandée: {item.quantity}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Prix unitaire (DZD)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={responseItems[index].price || ''}
                          onChange={(e) => handleResponseItemChange(
                            index, 
                            'price', 
                            e.target.value ? parseFloat(e.target.value) : 0
                          )}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder="Laisser vide pour ne pas répondre à ce produit"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Unités gratuites (%)
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Percent className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={responseItems[index].free_units_percentage || ''}
                            onChange={(e) => handleResponseItemChange(
                              index, 
                              'free_units_percentage', 
                              e.target.value ? parseFloat(e.target.value) : null
                            )}
                            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            placeholder="Optionnel"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Date de livraison possible
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Calendar className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="datetime-local"
                            value={responseItems[index].delivery_date || ''}
                            onChange={(e) => handleResponseItemChange(index, 'delivery_date', e.target.value)}
                            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            min={new Date().toISOString().slice(0, 16)}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Date d'expiration (optionnelle)
                        </label>
                        <input
                          type="date"
                          value={responseItems[index].expiry_date || ''}
                          onChange={(e) => handleResponseItemChange(index, 'expiry_date', e.target.value || null)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          min={new Date().toISOString().split('T')[0]}
                          placeholder="Optionnel"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border rounded-md hover:bg-gray-50"
                    disabled={responseLoading}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={responseLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                  >
                    {responseLoading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                    {existingResponse ? 'Mettre à jour ma réponse' : 'Envoyer ma réponse'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : existingResponse && existingResponseItems.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Ma réponse</h3>
            {canRespond && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Modifier
              </button>
            )}
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
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix unitaire
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    UG
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Livraison
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiration
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {existingResponseItems.map((item) => {
                  const tenderItem = tenderItems.find(ti => ti.id === item.tender_item_id);
                  if (!tenderItem) return null;
                  
                  const totalPrice = item.price * tenderItem.quantity;
                  const freeUnits = item.free_units_percentage 
                    ? Math.floor(tenderItem.quantity * item.free_units_percentage / 100) 
                    : 0;
                  
                  return (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {tenderItem.medication.commercial_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {tenderItem.medication.form} - {tenderItem.medication.dosage}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {tenderItem.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {item.price.toFixed(2)} DZD
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {item.free_units_percentage ? (
                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {item.free_units_percentage}%
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              +{freeUnits} unités gratuites
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {totalPrice.toFixed(2)} DZD
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(item.delivery_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.expiry_date ? (
                          <div className="text-sm text-gray-900">
                            {new Date(item.expiry_date).toLocaleDateString('fr-FR')}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    Total:
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                    {existingResponseItems.reduce((sum, item) => {
                      const tenderItem = tenderItems.find(ti => ti.id === item.tender_item_id);
                      return sum + (item.price * (tenderItem?.quantity || 0));
                    }, 0).toFixed(2)} DZD
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : null}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Messages</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucun message pour le moment</p>
              </div>
            ) : (
              messages.map((message) => {
                const isCurrentUser = message.user_id === user?.id;
                
                return (
                  <div 
                    key={message.id} 
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-md rounded-lg px-4 py-2 ${
                        isCurrentUser 
                          ? 'bg-indigo-100 text-indigo-900' 
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="flex items-center mb-1">
                        <span className="text-xs font-medium">
                          {isCurrentUser ? 'Vous' : 'Pharmacien'}
                        </span>
                        <span className="mx-2 text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">
                          {formatMessageDate(message.created_at)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <form onSubmit={handleSendMessage} className="mt-4">
            <div className="flex space-x-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Écrivez un message..."
                className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                disabled={tender.status !== 'open'}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || messageLoading || tender.status !== 'open'}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {messageLoading ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            {tender.status !== 'open' && (
              <p className="mt-2 text-xs text-gray-500">
                Vous ne pouvez plus envoyer de messages car l'appel d'offres est {tender.status === 'closed' ? 'clôturé' : 'annulé'}.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}