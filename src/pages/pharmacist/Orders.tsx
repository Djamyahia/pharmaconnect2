import React, { useEffect, useState } from 'react';
import { ShoppingCart, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Loader2, AlertTriangle, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Order, OrderItem } from '../../types/supabase';
import { UserLink } from '../../components/UserLink';

type ExtendedOrder = Order & {
  wholesaler: {
    company_name: string;
    wilaya: string;
    phone: string;
  };
  order_items: (OrderItem & {
    medications?: {
      commercial_name: string;
      scientific_name: string;
      form: string;
      dosage: string;
    } | null;
    product?: {
      name: string;
      brand: string;
    } | null;
  })[];
  offer_details?: {
    offer_name: string;
    offer_type: 'pack' | 'threshold';
    min_purchase_amount?: number;
    free_text_products?: string;
  };
};

export function Orders() {
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'pending_delivery_confirmation' | 'accepted' | 'canceled'>('all');

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  async function fetchOrders() {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          wholesaler:users!orders_wholesaler_id_fkey (
            company_name,
            wilaya,
            phone
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
              brand
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Process orders to identify pack/threshold offers
      const processedOrders = (data || []).map(order => {
        // Check if this is a pack order by looking at metadata or patterns
        const isPackOrder = order.order_items.length > 1;
        
        // For threshold orders, check if there's a minimum purchase amount
        const isThresholdOrder = order.metadata && order.metadata.min_purchase_amount;
        
        // Extract offer details if available
        let offerDetails = undefined;
        
        if (isPackOrder || isThresholdOrder) {
          offerDetails = {
            offer_name: order.metadata?.offer_name || "Pack de produits",
            offer_type: isThresholdOrder ? 'threshold' : 'pack',
            min_purchase_amount: order.metadata?.min_purchase_amount,
            free_text_products: order.metadata?.free_text_products
          };
        }
        
        return {
          ...order,
          offer_details: offerDetails
        };
      });
      
      setOrders(processedOrders);
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    try {
      setCancellingOrder(orderId);
      const { error } = await supabase
        .from('orders')
        .update({ status: 'canceled' })
        .eq('id', orderId);

      if (error) throw error;
      
      await fetchOrders();
    } catch (error) {
      console.error('Erreur lors de l\'annulation de la commande:', error);
      alert('Échec de l\'annulation de la commande. Veuillez réessayer.');
    } finally {
      setCancellingOrder(null);
    }
  };

  const handleDeliveryResponse = async (orderId: string, accept: boolean) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: accept ? 'accepted' : 'canceled',
          delivery_status: accept ? 'accepted' : 'rejected'
        })
        .eq('id', orderId);

      if (error) throw error;
      
      await fetchOrders();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la réponse:', error);
      alert('Échec de la mise à jour de la réponse. Veuillez réessayer.');
    }
  };

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
        return <Clock className="h-5 w-5 text-yellow-500" />;
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
        return 'bg-yellow-100 text-yellow-800';
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
        return 'En attente';
      case 'pending_delivery_confirmation':
        return 'A valider';
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Historique des commandes</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="all">Toutes les commandes</option>
          <option value="pending">En attente</option>
          <option value="pending_delivery_confirmation">A valider</option>
          <option value="accepted">Acceptées</option>
          <option value="canceled">Annulées</option>
        </select>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune commande</h3>
          <p className="mt-1 text-sm text-gray-500">Vous n'avez pas encore passé de commande.</p>
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
                          Commande de <UserLink user={order.wholesaler} />
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(order.created_at)}
                        </p>
                        {order.offer_details && (
                          <p className="text-sm text-indigo-600">
                            {order.offer_details.offer_name} - {order.offer_details.offer_type === 'pack' ? 'Pack groupé' : 'Achats libres'}
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
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Détails du grossiste</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Nom de l'entreprise</p>
                          <UserLink user={order.wholesaler} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Wilaya</p>
                          <p className="text-sm text-gray-900">{order.wholesaler.wilaya}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Téléphone</p>
                          <p className="text-sm text-gray-900">{order.wholesaler.phone}</p>
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
                            <p className="text-sm font-medium text-amber-800">Produits demandés :</p>
                            <p className="text-sm text-amber-700 whitespace-pre-line">
                              {order.offer_details.free_text_products}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

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
                              {item.medications?.commercial_name || item.product?.name || 'N/A'}
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

                    {order.status === 'pending' && (
                      <div className="mt-4 flex items-center justify-between border-t pt-4">
                        <div className="flex items-center text-sm text-yellow-700">
                          <AlertTriangle className="h-5 w-5 mr-2" />
                          L'annulation de cette commande ne peut pas être annulée
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) {
                              handleCancelOrder(order.id);
                            }
                          }}
                          disabled={cancellingOrder === order.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          {cancellingOrder === order.id ? (
                            <>
                              <Loader2 className="animate-spin h-4 w-4 mr-2" />
                              Annulation...
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              Annuler la commande
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {order.status === 'pending_delivery_confirmation' && (
                      <div className="mt-4 space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex items-center">
                            <Calendar className="h-5 w-5 text-blue-500 mr-2" />
                            <p className="text-sm text-blue-700">
                              Date de livraison proposée : {formatDate(order.delivery_date!)}
                            </p>
                          </div>
                          <p className="mt-2 text-sm text-blue-600">
                            Veuillez confirmer si cette date de livraison vous convient
                          </p>
                        </div>
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => handleDeliveryResponse(order.id, false)}
                            className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                          >
                            Refuser la date
                          </button>
                          <button
                            onClick={() => handleDeliveryResponse(order.id, true)}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                          >
                            Accepter la date
                          </button>
                        </div>
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