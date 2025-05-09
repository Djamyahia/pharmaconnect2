import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Package, Calendar, CheckCircle, XCircle, ArrowRight, Loader2, Clock } from 'lucide-react';
import { UserLink } from '../../components/UserLink';

type DailyOrder = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  delivery_date: string | null;
  pharmacist: {
    company_name: string;
    wilaya: string;
    email: string;
    address: string;
    phone: string;
  };
  order_items: {
    quantity: number;
    unit_price: number;
    medications: {
      commercial_name: string;
      form: string;
      dosage: string;
    } | null;
    product: {
      name: string;
      brand: string;
    } | null;
  }[];
};

export function DailyActions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [newOrders, setNewOrders] = useState<DailyOrder[]>([]);
  const [confirmedOrders, setConfirmedOrders] = useState<DailyOrder[]>([]);
  const [canceledOrders, setCanceledOrders] = useState<DailyOrder[]>([]);
  const [plannedDeliveries, setPlannedDeliveries] = useState<DailyOrder[]>([]);
  const [comingDeliveries, setComingDeliveries] = useState<DailyOrder[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchDailyActions();
    }
  }, [user?.id]);

  async function fetchDailyActions() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          pharmacist:users!orders_pharmacist_id_fkey (
            company_name,
            wilaya,
            email,
            address,
            phone
          ),
          order_items (
            quantity,
            unit_price,
            medications (
              commercial_name,
              form,
              dosage
            ),
            product:parapharmacy_products (
              name,
              brand
            )
          )
        `)
        .eq('wholesaler_id', user?.id)
        .gte('created_at', today.toISOString());

      if (error) throw error;

      // Filter orders by status
      setNewOrders(orders?.filter(order => order.status === 'pending') || []);
      setConfirmedOrders(orders?.filter(order => order.status === 'accepted' && order.created_at >= today.toISOString()) || []);
      setCanceledOrders(orders?.filter(order => order.status === 'canceled' && order.created_at >= today.toISOString()) || []);

      // Get planned deliveries for today - fix the query
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('orders')
        .select(`
          *,
          pharmacist:users!orders_pharmacist_id_fkey (
            company_name,
            wilaya,
            email,
            address,
            phone
          ),
          order_items (
            quantity,
            unit_price,
            medications (
              commercial_name,
              form,
              dosage
            ),
            product:parapharmacy_products (
              name,
              brand
            )
          )
        `)
        .eq('wholesaler_id', user?.id)
        .eq('status', 'accepted')
        .gte('delivery_date', today.toISOString())
        .lt('delivery_date', tomorrow.toISOString());

      if (deliveriesError) throw deliveriesError;
      setPlannedDeliveries(deliveries || []);

      // Get future deliveries
      const { data: futureDeliveries, error: futureError } = await supabase
        .from('orders')
        .select(`
          *,
          pharmacist:users!orders_pharmacist_id_fkey (
            company_name,
            wilaya,
            email,
            address,
            phone
          ),
          order_items (
            quantity,
            unit_price,
            medications (
              commercial_name,
              form,
              dosage
            ),
            product:parapharmacy_products (
              name,
              brand
            )
          )
        `)
        .eq('wholesaler_id', user?.id)
        .eq('status', 'accepted')
        .gte('delivery_date', tomorrow.toISOString())
        .order('delivery_date', { ascending: true });

      if (futureError) throw futureError;
      setComingDeliveries(futureDeliveries || []);
    } catch (error) {
      console.error('Error fetching daily actions:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDeliveryDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOrderSummary = (order: DailyOrder) => {
    if (order.order_items.length === 0) return 'Aucun produit';
    const item = order.order_items[0];
    const productName = item.medications?.commercial_name || item.product?.name || '';
    const additionalItems = order.order_items.length > 1 
      ? ` et ${order.order_items.length - 1} autre(s) produit(s)` 
      : '';
    return `${productName}${additionalItems}`;
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
      <h2 className="text-2xl font-semibold text-gray-900">Actions du jour</h2>

      {/* New Orders */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Package className="h-5 w-5 text-indigo-600 mr-2" />
            Nouvelles commandes
            {newOrders.length > 0 && (
              <span className="ml-2 px-2.5 py-0.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
                {newOrders.length}
              </span>
            )}
          </h3>
        </div>

        {newOrders.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune nouvelle commande aujourd'hui</p>
        ) : (
          <div className="space-y-4">
            {newOrders.map(order => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => navigate('/wholesaler/orders')}
              >
                <div>
                  <div className="font-medium text-gray-900">
                    <UserLink user={order.pharmacist} />
                  </div>
                  <p className="text-sm text-gray-500">{getOrderSummary(order)}</p>
                  <p className="text-xs text-gray-500">Reçue à {formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center">
                  <span className="text-lg font-medium text-gray-900 mr-4">
                    {order.total_amount.toFixed(2)} DZD
                  </span>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Planned Deliveries */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 text-blue-600 mr-2" />
            Livraisons prévues aujourd'hui
            {plannedDeliveries.length > 0 && (
              <span className="ml-2 px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {plannedDeliveries.length}
              </span>
            )}
          </h3>
        </div>

        {plannedDeliveries.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune livraison prévue aujourd'hui</p>
        ) : (
          <div className="space-y-4">
            {plannedDeliveries.map(order => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => navigate('/wholesaler/orders')}
              >
                <div>
                  <div className="font-medium text-gray-900">
                    <UserLink user={order.pharmacist} />
                  </div>
                  <p className="text-sm text-gray-500">{getOrderSummary(order)}</p>
                  <p className="text-xs text-gray-500">
                    Livraison prévue à {formatDeliveryDate(order.delivery_date!)}
                  </p>
                </div>
                <div className="flex items-center">
                  <span className="text-lg font-medium text-gray-900 mr-4">
                    {order.total_amount.toFixed(2)} DZD
                  </span>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Coming Deliveries */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Clock className="h-5 w-5 text-purple-600 mr-2" />
            Prochaines livraisons
            {comingDeliveries.length > 0 && (
              <span className="ml-2 px-2.5 py-0.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                {comingDeliveries.length}
              </span>
            )}
          </h3>
        </div>

        {comingDeliveries.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune livraison prévue pour les prochains jours</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {comingDeliveries.map(order => (
              <div
                key={order.id}
                className="py-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate('/wholesaler/orders')}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <UserLink user={order.pharmacist} />
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm font-medium text-gray-900">
                        {order.total_amount.toFixed(2)} DZD
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {order.pharmacist.address}, {order.pharmacist.wilaya}
                    </p>
                    <p className="text-sm text-gray-600">
                      Tél: {order.pharmacist.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-purple-600">
                      {formatDeliveryDate(order.delivery_date!)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  {getOrderSummary(order)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmed Orders */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            Commandes confirmées aujourd'hui
          </h3>
        </div>

        {confirmedOrders.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune commande confirmée aujourd'hui</p>
        ) : (
          <div className="space-y-4">
            {confirmedOrders.map(order => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => navigate('/wholesaler/orders')}
              >
                <div>
                  <div className="font-medium text-gray-900">
                    <UserLink user={order.pharmacist} />
                  </div>
                  <p className="text-sm text-gray-500">{getOrderSummary(order)}</p>
                  <p className="text-xs text-gray-500">Confirmée à {formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center">
                  <span className="text-lg font-medium text-gray-900 mr-4">
                    {order.total_amount.toFixed(2)} DZD
                  </span>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Canceled Orders */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <XCircle className="h-5 w-5 text-red-600 mr-2" />
            Commandes annulées aujourd'hui
          </h3>
        </div>

        {canceledOrders.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune commande annulée aujourd'hui</p>
        ) : (
          <div className="space-y-4">
            {canceledOrders.map(order => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => navigate('/wholesaler/orders')}
              >
                <div>
                  <div className="font-medium text-gray-900">
                    <UserLink user={order.pharmacist} />
                  </div>
                  <p className="text-sm text-gray-500">{getOrderSummary(order)}</p>
                  <p className="text-xs text-gray-500">Annulée à {formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center">
                  <span className="text-lg font-medium text-gray-900 mr-4">
                    {order.total_amount.toFixed(2)} DZD
                  </span>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}