import React, { useEffect, useState } from 'react';
import { ShoppingCart, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Loader2, Calendar, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Order, OrderItem } from '../../types/supabase';
import { sendOrderNotification } from '../../lib/notifications';
import { UserLink } from '../../components/UserLink';

type ExtendedOrder = Order & {
  pharmacist: {
    company_name: string;
    wilaya: string;
    phone: string;
    email: string;
  };
  order_items: (OrderItem & {
    medications: {
      commercial_name: string;
      scientific_name: string;
      form: string;
      dosage: string;
    };
    product?: {
      name: string;
      brand: string;
      category: string;
    };
  })[];
  offer_details?: {
    offer_name: string;
    offer_type: 'pack' | 'threshold';
    min_purchase_amount?: number;
    free_text_products?: string;
  };
  tender_details?: {
    tender_id: string;
    tender_title?: string;
  };
};

export function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'pending_delivery_confirmation' | 'accepted' | 'canceled'>('all');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [deliveryDateError, setDeliveryDateError] = useState<string>('');

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  async function fetchOrders() {
    if (!user?.id) return;

    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          pharmacist:users!orders_pharmacist_id_fkey (
            company_name,
            wilaya,
            phone,
            email
          ),
          order_items (
            *,
            medications (
              commercial_name,
              scientific_name,
              form,
              dosage
            ),
            product:parapharmacy_products (
              name,
              brand,
              category
            )
          )
        `)
        .eq('wholesaler_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Process orders to identify pack/threshold offers and tenders
      const processedOrders = (data || []).map(order => {
        // Check if this is a pack order by looking at metadata or patterns
        const isPackOrder = order.metadata && order.metadata.offer_type === 'pack';
        
        // For threshold offers, check if there's a minimum purchase amount
        const isThresholdOrder = order.metadata && order.metadata.offer_type === 'threshold';
        
        // Check if this is a tender order
        const isTenderOrder = order.metadata && order.metadata.source === 'tender';
        
        // Extract offer details if available
        let offerDetails = undefined;
        let tenderDetails = undefined;
        
        if (isPackOrder || isThresholdOrder) {
          offerDetails = {
            offer_name: order.metadata?.offer_name || "Pack de produits",
            offer_type: isThresholdOrder ? 'threshold' : 'pack',
            min_purchase_amount: order.metadata?.min_purchase_amount,
            free_text_products: order.metadata?.free_text_products
          };
        }
        
        if (isTenderOrder) {
          tenderDetails = {
            tender_id: order.metadata?.tender_id,
            tender_title: order.metadata?.tender_title || "Appel d'offres"
          };
        }
        
        return {
          ...order,
          offer_details: offerDetails,
          tender_details: tenderDetails
        };
      });
      
      setOrders(processedOrders);
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptOrder(orderId: string) {
    setDeliveryDateError('');
    
    if (!deliveryDate) {
      setDeliveryDateError('La date de livraison est obligatoire');
      return;
    }

    const selectedDate = new Date(deliveryDate);
    const now = new Date();
    if (selectedDate <= now) {
      setDeliveryDateError('La date de livraison doit être dans le futur');
      return;
    }

    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      // Check if this is a tender order
      const isTenderOrder = order.metadata && order.metadata.source === 'tender';
      
      // For tender orders, set status directly to accepted
      const newStatus = isTenderOrder ? 'accepted' : 'pending_delivery_confirmation';

      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          delivery_date: deliveryDate
        })
        .eq('id', orderId);

      if (error) throw error;

      // Update inventory quantities with explicit type casting
      if (order) {
        for (const item of order.order_items) {
          const { error: inventoryError } = await supabase.rpc('update_inventory_quantity', {
            p_wholesaler_id: user?.id,
            p_medication_id: item.medication_id,
            p_quantity: item.quantity,
            p_expiry_date: null // Explicitly pass null for expiry_date to select the correct overload
          });
          
          if (inventoryError) {
            console.error('Erreur lors de la mise à jour de l\'inventaire:', inventoryError);
          }
        }
      }

      // Send email notification to pharmacist
      try {
        if (isTenderOrder) {
          // For tender orders, send a special notification
          await sendOrderNotification(
            'tender_order_confirmed',
            order.pharmacist.email,
            {
              pharmacist_name: order.pharmacist.company_name,
              wholesaler_name: user?.company_name || '',
              order_id: orderId,
              delivery_date: new Date(deliveryDate).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              total_amount: `${order.total_amount.toFixed(2)} DZD`
            }
          );
        } else {
          // For regular orders
          await sendOrderNotification(
            'order_accepted',
            order.pharmacist.email,
            {
              pharmacist_name: order.pharmacist.company_name,
              wholesaler_name: user?.company_name || '',
              order_id: orderId,
              delivery_date: new Date(deliveryDate).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              total_amount: `${order.total_amount.toFixed(2)} DZD`
            }
          );
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      setDeliveryDate('');
      setDeliveryDateError('');
      fetchOrders();
    } catch (error) {
      console.error('Erreur lors de l\'acceptation de la commande:', error);
      alert('Échec de l\'acceptation de la commande. Veuillez réessayer.');
    }
  }

  async function handleRejectOrder(orderId: string) {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const { error } = await supabase
        .from('orders')
        .update({ status: 'canceled' })
        .eq('id', orderId);

      if (error) throw error;

      // Send email notifications to pharmacist
      try {
        await sendOrderNotification(
          'order_canceled',
          order.pharmacist.email,
          {
            recipient_name: order.pharmacist.company_name,
            order_id: orderId,
            total_amount: `${order.total_amount.toFixed(2)} DZD`,
            reason: 'Commande rejetée par le grossiste'
          }
        );
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      fetchOrders();
    } catch (error) {
      console.error('Erreur lors du rejet de la commande:', error);
      alert('Échec du rejet de la commande. Veuillez réessayer.');
    }
  }

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'pending_delivery_confirmation':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'accepted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'canceled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-red-100 text-red-800';
      case 'pending_delivery_confirmation':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'À valider';
      case 'pending_delivery_confirmation':
        return 'En attente de confirmation';
      case 'accepted':
        return 'Acceptée';
      case 'canceled':
        return 'Annulée';
      default:
        return status;
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const pendingOrders = orders.filter(order => order.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Gestion des commandes</h2>
          {pendingOrders > 0 && (
            <p className="mt-1 text-sm text-red-600 font-medium">
              {pendingOrders} commande{pendingOrders > 1 ? 's' : ''} en attente de validation
            </p>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="all">Toutes les commandes</option>
          <option value="pending">À valider</option>
          <option value="pending_delivery_confirmation">En attente de confirmation</option>
          <option value="accepted">Acceptées</option>
          <option value="canceled">Annulées</option>
        </select>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune commande</h3>
          <p className="mt-1 text-sm text-gray-500">Aucune commande ne correspond à votre filtre actuel.</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {orders.map((order) => (
              <li key={order.id} className={`p-4 ${order.status === 'pending' ? 'bg-red-50' : ''}`}>
                <div className="cursor-pointer" onClick={() => toggleOrderExpansion(order.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(order.status)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Commande de <UserLink user={order.pharmacist} />
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(order.created_at)}
                        </p>
                        {order.offer_details && (
                          <p className="text-sm text-indigo-600">
                            {order.offer_details.offer_name} - {order.offer_details.offer_type === 'pack' ? 'Pack groupé' : 'Achats libres'}
                            {order.offer_details.min_purchase_amount && ` (min: ${order.offer_details.min_purchase_amount.toFixed(2)} DZD)`}
                          </p>
                        )}
                        {order.tender_details && (
                          <p className="text-sm text-indigo-600 flex items-center">
                            <FileText className="h-4 w-4 mr-1" />
                            Appel d'offres
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {order.total_amount.toFixed(2)} DZD
                      </span>
                      {expandedOrders.includes(order.id) ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedOrders.includes(order.id) && (
                  <div className="mt-4">
                    {/* Pharmacist Details */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Détails du pharmacien</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Nom de l'entreprise</p>
                          <UserLink user={order.pharmacist} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Wilaya</p>
                          <p className="text-sm text-gray-900">{order.pharmacist.wilaya}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Téléphone</p>
                          <p className="text-sm text-gray-900">{order.pharmacist.phone}</p>
                        </div>
                      </div>
                    </div>

                    {/* Special display for threshold offers */}
                    {order.offer_details?.offer_type === 'threshold' && order.offer_details.min_purchase_amount && (
                      <div className="bg-amber-50 p-4 rounded-lg mb-4">
                        <h4 className="text-sm font-medium text-amber-800 mb-2">Offre sur achats libres</h4>
                        <p className="text-sm text-amber-700">
                          Montant minimum d'achat : {order.offer_details.min_purchase_amount.toFixed(2)} DZD
                        </p>
                        {order.offer_details.free_text_products && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-amber-800">Produits demandés par le pharmacien :</p>
                            <p className="text-sm text-amber-700 whitespace-pre-line">
                              {order.offer_details.free_text_products}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Special display for tender orders */}
                    {order.tender_details && (
                      <div className="bg-indigo-50 p-4 rounded-lg mb-4">
                        <h4 className="text-sm font-medium text-indigo-800 mb-2">
                          <FileText className="h-4 w-4 inline mr-1" />
                          Commande issue d'un appel d'offres
                        </h4>
                        <p className="text-sm text-indigo-700">
                          Cette commande a été créée à partir de votre réponse à un appel d'offres.
                        </p>
                      </div>
                    )}

                    {/* Order Items */}
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Produit
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Détails
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantité
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Prix unitaire
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {order.order_items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {item.medications ? item.medications.commercial_name : item.product?.name || 'N/A'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {item.medications ? 
                                `${item.medications.form} - ${item.medications.dosage}` : 
                                item.product ? 
                                  `${item.product.brand || ''}` : 
                                  'N/A'
                              }
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {item.unit_price.toFixed(2)} DZD
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {(item.quantity * item.unit_price).toFixed(2)} DZD
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                            Montant total:
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                            {order.total_amount.toFixed(2)} DZD
                          </td>
                        </tr>
                        {order.offer_details?.offer_type === 'threshold' && order.offer_details.min_purchase_amount && (
                          <tr>
                            <td colSpan={5} className="px-4 py-2 text-xs text-amber-600 text-right">
                              Ce montant inclut le minimum d'achat requis de {order.offer_details.min_purchase_amount.toFixed(2)} DZD
                            </td>
                          </tr>
                        )}
                      </tfoot>
                    </table>

                    {/* Action Buttons */}
                    {order.status === 'pending' && (
                      <div className="mt-4 space-y-4 border-t pt-4">
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <AlertCircle className="h-5 w-5 text-yellow-400" />
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-yellow-800">
                                Action requise
                              </h3>
                              <p className="mt-2 text-sm text-yellow-700">
                                Cette commande nécessite votre validation. Veuillez définir une date de livraison pour accepter la commande.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">
                              Date de livraison <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="datetime-local"
                              value={deliveryDate}
                              onChange={(e) => {
                                setDeliveryDate(e.target.value);
                                setDeliveryDateError('');
                              }}
                              min={new Date().toISOString().slice(0, 16)}
                              className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${
                                deliveryDateError ? 'border-red-300' : 'border-gray-300'
                              }`}
                              required
                            />
                            {deliveryDateError && (
                              <p className="mt-1 text-sm text-red-600">{deliveryDateError}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => handleRejectOrder(order.id)}
                            className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                          >
                            Rejeter la commande
                          </button>
                          <button
                            onClick={() => handleAcceptOrder(order.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                          >
                            Accepter la commande
                          </button>
                        </div>
                      </div>
                    )}

                    {order.status === 'pending_delivery_confirmation' && (
                      <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center">
                          <Calendar className="h-5 w-5 text-blue-500 mr-2" />
                          <p className="text-sm text-blue-700">
                            Date de livraison proposée : {formatDate(order.delivery_date!)}
                          </p>
                        </div>
                        <p className="mt-2 text-sm text-blue-600">
                          En attente de la confirmation du pharmacien pour la date de livraison
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}