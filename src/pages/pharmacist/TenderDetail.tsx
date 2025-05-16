import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, 
  Clock, 
  Copy, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Loader2, 
  Send, 
  AlertTriangle,
  ShoppingCart,
  Mail,
  RefreshCw
} from 'lucide-react';
import type { 
  Tender, 
  TenderItem, 
  TenderResponse, 
  TenderResponseItem,
  TenderMessage,
  User
} from '../../types/supabase';
import { UserLink } from '../../components/UserLink';
import { sendOrderNotification } from '../../lib/notifications';

type ExtendedTenderItem = TenderItem & {
  medication: {
    commercial_name: string;
    form: string;
    dosage: string;
  };
};

type ExtendedTenderResponse = TenderResponse & {
  wholesaler: User;
  items: (TenderResponseItem & {
    tender_item: ExtendedTenderItem;
  })[];
};

type EmailModalProps = {
  tender: Tender;
  tenderItems: ExtendedTenderItem[];
  onClose: () => void;
};

function EmailModal({ tender, tenderItems, onClose }: EmailModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSendEmails = async () => {
  try {
    setLoading(true)
    setError('')

    // on envoie en preview uniquement à l'adresse de dev configurée côté serveur
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-tender-emails`
    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        tenderId: tender.id
      }),
    })

    if (!res.ok) {
      const result = await res.json()
      throw new Error(result.message || 'Erreur lors de l\'envoi des emails')
    }

    setSuccess(true)
    setTimeout(onClose, 2000)
  } catch (error: any) {
    console.error('Error sending emails:', error)
    setError(error.message || 'Erreur lors de l\'envoi des emails')
  } finally {
    setLoading(false)
  }
}


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Envoyer à tous les grossistes</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-4">
            Emails envoyés avec succès à tous les grossistes !
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-700">
              Cette action enverra un email à tous les grossistes inscrits sur la plateforme pour les informer de cet appel d'offres.
            </p>
            
            <div className="bg-amber-50 p-4 rounded-md">
              <p className="text-sm text-amber-700">
                <strong>Note :</strong> L'email ne contiendra aucune information personnelle vous concernant. Les grossistes verront uniquement les produits demandés, les quantités et la wilaya de livraison.
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Résumé de l'appel d'offres :</h4>
              <p className="text-sm text-gray-700">Titre : {tender.title}</p>
              <p className="text-sm text-gray-700">Wilaya : {tender.wilaya}</p>
              <p className="text-sm text-gray-700">Date limite : {new Date(tender.deadline).toLocaleDateString('fr-FR')}</p>
              <p className="text-sm text-gray-700">Nombre de produits : {tenderItems.length}</p>
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
                type="button"
                onClick={handleSendEmails}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Envoyer à tous les grossistes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TenderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [tender, setTender] = useState<Tender | null>(null);
  const [tenderItems, setTenderItems] = useState<ExtendedTenderItem[]>([]);
  const [tenderResponses, setTenderResponses] = useState<ExtendedTenderResponse[]>([]);
  const [messages, setMessages] = useState<(TenderMessage & { user: User })[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedWholesaler, setSelectedWholesaler] = useState<string | null>(null);
  const [creatingOrderId, setCreatingOrderId] = useState<string | null>(null);
  const [reopeningTender, setReopeningTender] = useState(false);
  const [cloningTender, setCloningTender] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTenderDetails();
    }
  }, [id]);

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
            // Fetch the user details for the new message
            fetchMessageUser(payload.new);
          }
        )
        .subscribe();

      // Set up real-time subscription for new responses
      const responsesSubscription = supabase
        .channel('tender-responses')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'tender_responses',
            filter: `tender_id=eq.${id}`
          },
          () => {
            // Refresh the tender responses
            fetchTenderResponses();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesSubscription);
        supabase.removeChannel(responsesSubscription);
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
      
      // Fetch tender responses
      await fetchTenderResponses();
      
      // Fetch messages
      await fetchMessages();
    } catch (error) {
      console.error('Error fetching tender details:', error);
      setError('Erreur lors de la récupération des détails de l\'appel d\'offres');
    } finally {
      setLoading(false);
    }
  }

  async function fetchTenderResponses() {
    try {
      const { data: responsesData, error: responsesError } = await supabase
        .from('tender_responses')
        .select(`
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
        `)
        .eq('tender_id', id);
      
      if (responsesError) throw responsesError;
      
      setTenderResponses(responsesData || []);
    } catch (error) {
      console.error('Error fetching tender responses:', error);
      setError('Erreur lors de la récupération des réponses à l\'appel d\'offres');
    }
  }

  async function fetchMessages() {
    try {
      // If a wholesaler is selected, only fetch messages between the pharmacist and that wholesaler
      let query = supabase
        .from('tender_messages')
        .select(`
          *,
          user:users (
            *
          )
        `)
        .eq('tender_id', id);
      
      if (selectedWholesaler && tender) {
        query = query.or(`user_id.eq.${selectedWholesaler},user_id.eq.${tender.pharmacist_id}`);
      }
      
      query = query.order('created_at', { ascending: true });
      
      const { data: messagesData, error: messagesError } = await query;
      
      if (messagesError) throw messagesError;
      
      // If a wholesaler is selected, filter messages to only show those from the pharmacist or the selected wholesaler
      let filteredMessages = messagesData || [];
      if (selectedWholesaler && tender) {
        filteredMessages = filteredMessages.filter(msg => 
          msg.user_id === tender.pharmacist_id || msg.user_id === selectedWholesaler
        );
      }
      
      setMessages(filteredMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Erreur lors de la récupération des messages');
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !tender) return;
    
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

  const handleCopyLink = () => {
    if (!tender) return;
    
    const fullUrl = `${window.location.origin}/tenders/public/${tender.public_link}`;
    navigator.clipboard.writeText(fullUrl);
    
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCloseTender = async () => {
    if (!tender) return;
    
    if (!confirm('Êtes-vous sûr de vouloir clôturer cet appel d\'offres ? Aucune nouvelle réponse ne sera acceptée.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('tenders')
        .update({ status: 'closed' })
        .eq('id', tender.id);
      
      if (error) throw error;
      
      setTender({ ...tender, status: 'closed' });
    } catch (error) {
      console.error('Error closing tender:', error);
      setError('Erreur lors de la clôture de l\'appel d\'offres');
    }
  };

  const handleReopenTender = async () => {
    if (!tender) return;
    
    if (!confirm('Êtes-vous sûr de vouloir rouvrir cet appel d\'offres ?')) {
      return;
    }
    
    try {
      setReopeningTender(true);
      
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
        .eq('id', tender.id);
      
      if (error) throw error;
      
      setTender({ ...tender, status: 'open', deadline: newDeadline });
    } catch (error) {
      console.error('Error reopening tender:', error);
      setError('Erreur lors de la réouverture de l\'appel d\'offres');
    } finally {
      setReopeningTender(false);
    }
  };

  const handleCloneTender = async () => {
    if (!tender || !tenderItems.length) return;
    
    try {
      setCloningTender(true);
      
      // Create a new deadline 14 days from now
      const newDeadline = new Date();
      newDeadline.setDate(newDeadline.getDate() + 14);
      
      // Create a new tender with the same details
      const { data: newTender, error: tenderError } = await supabase
        .from('tenders')
        .insert({
          pharmacist_id: user?.id,
          title: `${tender.title} (copie)`,
          deadline: newDeadline.toISOString(),
          wilaya: tender.wilaya,
          is_public: tender.is_public,
          status: 'open'
        })
        .select()
        .single();
      
      if (tenderError) throw tenderError;
      
      // Clone all tender items
      const newItems = tenderItems.map(item => ({
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
      setCloningTender(false);
    }
  };

  const handleCancelTender = async () => {
    if (!tender) return;
    
    if (!confirm('Êtes-vous sûr de vouloir annuler cet appel d\'offres ?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('tenders')
        .update({ status: 'canceled' })
        .eq('id', tender.id);
      
      if (error) throw error;
      
      setTender({ ...tender, status: 'canceled' });
    } catch (error) {
      console.error('Error canceling tender:', error);
      setError('Erreur lors de l\'annulation de l\'appel d\'offres');
    }
  };

  const handleCreateOrder = async (responseId: string) => {
    if (!tender || !user) return;
    setCreatingOrderId(responseId)
    
    try {
      // Find the selected response
      const response = tenderResponses.find(r => r.id === responseId);
      if (!response) throw new Error('Response not found');
      
      // Calculate total amount
      const totalAmount = response.items.reduce((sum, item) => {
        return sum + (item.price * item.tender_item.quantity);
      }, 0);
      
      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          pharmacist_id: user.id,
          wholesaler_id: response.wholesaler_id,
          total_amount: totalAmount,
          status: 'accepted', // Set status directly to accepted since delivery date is already confirmed
          delivery_date: response.items[0]?.delivery_date, // Use the first item's delivery date
          metadata: {
            tender_id: tender.id,
            tender_response_id: response.id,
            source: 'tender'
          }
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Create order items
      for (const item of response.items) {
        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: orderData.id,
            medication_id: item.tender_item.medication_id,
            quantity: item.tender_item.quantity,
            unit_price: item.price,
            metadata: {
              tender_item_id: item.tender_item_id,
              tender_response_item_id: item.id,
              free_units_percentage: item.free_units_percentage,
              source: 'tender'
            }
          });
        
        if (itemError) throw itemError;
      }
      
      // Close the tender
      const { error: tenderError } = await supabase
        .from('tenders')
        .update({ status: 'closed' })
        .eq('id', tender.id);
      
      if (tenderError) throw tenderError;

      // Send notification to wholesaler
      try {
        await sendOrderNotification(
          'tender_order_accepted',
          response.wholesaler.email,
          {
            wholesaler_name: response.wholesaler.company_name,
            pharmacist_name: user.company_name,
            pharmacist_email: user.email,
            pharmacist_phone: user.phone,
            pharmacist_address: user.address,
            pharmacist_wilaya: user.wilaya,
            order_id: orderData.id,
            tender_id: tender.id,
            tender_title: tender.title,
            delivery_date: new Date(response.items[0]?.delivery_date).toLocaleDateString('fr-FR'),
            total_amount: totalAmount.toFixed(2)
          }
        );
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }
      
      // Navigate to orders page
      navigate('/pharmacist/orders');
    } catch (error) {
      console.error('Error creating order:', error);
      setError('Erreur lors de la création de la commande');
    } finally {
    setCreatingOrderId(null);
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
            onClick={() => navigate('/pharmacist/tenders')}
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
  const isClosed = tender.status === 'closed';
  const isCanceled = tender.status === 'canceled';
  const canClose = isOpen && !isExpired;
  const canReopen = (isClosed || isCanceled);
  const canCancel = isOpen;

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <button
          onClick={() => navigate('/pharmacist/tenders')}
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
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Lien public</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center">
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm mr-2 flex-grow overflow-x-auto">
                    {`${window.location.origin}/tenders/public/${tender.public_link}`}
                  </code>
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs rounded hover:bg-gray-50"
                    title="Copier le lien public"
                  >
                    {copiedLink ? (
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
                  <a
                    href={`/tenders/public/${tender.public_link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center px-2 py-1 border border-gray-300 text-xs rounded hover:bg-gray-50"
                    title="Voir la page publique"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Voir
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Actions</h3>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setShowEmailModal(true)}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Mail className="h-5 w-5 mr-2" />
                Envoyer à tous les grossistes
              </button>
              
              <button
                onClick={handleCloneTender}
                disabled={cloningTender}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {cloningTender ? (
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                ) : (
                  <Copy className="h-5 w-5 mr-2" />
                )}
                Dupliquer l'appel d'offres
              </button>
              
              
              
              {canReopen && (
                <button
                  onClick={handleReopenTender}
                  disabled={reopeningTender}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                >
                  {reopeningTender ? (
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  ) : (
                    <RefreshCw className="h-5 w-5 mr-2" />
                  )}
                  Rouvrir l'appel d'offres
                </button>
              )}
              
              {canCancel && (
                <button
                  onClick={handleCancelTender}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Annuler l'appel d'offres
                </button>
              )}
              
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

      {tenderResponses.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">Réponses reçues ({tenderResponses.length})</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {tenderResponses.map((response) => (
              <div key={response.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      <UserLink user={response.wholesaler} />
                    </h4>
                    <p className="text-sm text-gray-500">
                      Réponse envoyée le {formatDate(response.created_at)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedWholesaler(response.wholesaler_id)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Voir les messages
                    </button>
                    
                    {tender.status === 'open' && (
                      <button
                        onClick={() => handleCreateOrder(response.id)}
                        disabled={creatingOrderId === response.id}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {creatingOrderId === response.id
                          ? <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          : <ShoppingCart className="h-4 w-4 mr-2" />
                        }
                        Commander
                      </button>
                    )}
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
                      {response.items.map((item) => {
                        const totalPrice = item.price * item.tender_item.quantity;
                        const freeUnits = item.free_units_percentage 
                          ? Math.floor(item.tender_item.quantity * item.free_units_percentage / 100) 
                          : 0;
                        
                        return (
                          <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {item.tender_item.medication.commercial_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {item.tender_item.medication.form} - {item.tender_item.medication.dosage}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {item.tender_item.quantity}
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
                          {response.items.reduce((sum, item) => sum + (item.price * item.tender_item.quantity), 0).toFixed(2)} DZD
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune réponse reçue</h3>
          <p className="mt-1 text-sm text-gray-500">
            Cet appel d'offres n'a pas encore reçu de réponses.
          </p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Messages</h3>
          
          {tenderResponses.length > 0 && (
            <div className="flex items-center">
              <span className="mr-2 text-sm text-gray-500">Conversation avec :</span>
              <select
                value={selectedWholesaler || ''}
                onChange={(e) => {
                  setSelectedWholesaler(e.target.value || null);
                  fetchMessages();
                }}
                className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
              >
                <option value="">Tous les grossistes</option>
                {tenderResponses.map(response => (
                  <option key={response.wholesaler_id} value={response.wholesaler_id}>
                    {response.wholesaler.company_name}
                  </option>
                ))}
              </select>
            </div>
          )}
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
                          {isCurrentUser ? 'Vous' : message.user.company_name}
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

      {showEmailModal && tender && (
        <EmailModal
          tender={tender}
          tenderItems={tenderItems}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </div>
  );
}