import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ShoppingBag, TrendingUp, Clock, CheckCircle, XCircle, Package, Building2, MapPin } from 'lucide-react';

type OrderStats = {
  total_orders: number;
  total_spent: number;
  pending_orders: number;
  completed_orders: number;
  canceled_orders: number;
  most_ordered_medications: {
    medication_name: string;
    quantity: number;
    revenue: number;
    details: {
      form: string;
      dosage: string;
      orders: {
        date: string;
        quantity: number;
        price: number;
      }[];
    };
  }[];
  top_wholesalers: {
    company_name: string;
    order_count: number;
    total_spent: number;
    details: {
      orders: {
        date: string;
        status: string;
        total_amount: number;
        items: {
          medication_name: string;
          quantity: number;
          unit_price: number;
        }[];
      }[];
    };
  }[];
  top_wilayas: {
    wilaya: string;
    order_count: number;
    total_revenue: number;
    details: {
      wholesalers: {
        company_name: string;
        order_count: number;
        total_spent: number;
      }[];
    };
  }[];
};

type DetailModalProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

function DetailModal({ title, onClose, children }: DetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Analytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState<OrderStats>({
    total_orders: 0,
    total_spent: 0,
    pending_orders: 0,
    completed_orders: 0,
    canceled_orders: 0,
    most_ordered_medications: [],
    top_wholesalers: [],
    top_wilayas: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedMedication, setSelectedMedication] = useState<typeof stats.most_ordered_medications[0] | null>(null);
  const [selectedWholesaler, setSelectedWholesaler] = useState<typeof stats.top_wholesalers[0] | null>(null);
  const [selectedWilaya, setSelectedWilaya] = useState<typeof stats.top_wilayas[0] | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchOrderStats();
    }
  }, [user?.id]);

  async function fetchOrderStats() {
    try {
      // Fetch basic order stats
      const { data: orderStats, error: statsError } = await supabase
        .from('orders')
        .select(`
          status,
          total_amount,
          created_at,
          wholesaler_id,
          order_items (
            quantity,
            unit_price,
            medications (
              commercial_name,
              form,
              dosage
            )
          ),
          users!orders_wholesaler_id_fkey (
            company_name,
            wilaya
          )
        `)
        .eq('pharmacist_id', user?.id);

      if (statsError) throw statsError;

      // Calculate order statistics
      const stats = {
        total_orders: orderStats?.length || 0,
        total_spent: orderStats?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0,
        pending_orders: orderStats?.filter(order => order.status === 'pending' || order.status === 'pending_delivery_confirmation').length || 0,
        completed_orders: orderStats?.filter(order => order.status === 'accepted').length || 0,
        canceled_orders: orderStats?.filter(order => order.status === 'canceled').length || 0,
      };

      // Process medication statistics with detailed information
      const medicationMap = new Map();
      orderStats?.forEach(order => {
        order.order_items?.forEach(item => {
          // Skip if medications data is missing
          if (!item?.medications) return;

          const key = item.medications.commercial_name;
          const current = medicationMap.get(key) || {
            medication_name: key,
            quantity: 0,
            revenue: 0,
            details: {
              form: item.medications.form,
              dosage: item.medications.dosage,
              orders: [],
            },
          };

          current.quantity += item.quantity;
          current.revenue += item.quantity * item.unit_price;
          current.details.orders.push({
            date: order.created_at,
            quantity: item.quantity,
            price: item.unit_price,
          });

          medicationMap.set(key, current);
        });
      });

      const topMedications = Array.from(medicationMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Process wholesaler statistics with detailed information
      const wholesalerMap = new Map();
      orderStats?.forEach(order => {
        if (order.status === 'accepted' && order.users) {
          const key = order.users.company_name;
          const current = wholesalerMap.get(key) || {
            company_name: key,
            order_count: 0,
            total_spent: 0,
            details: {
              orders: [],
            },
          };

          current.order_count++;
          current.total_spent += order.total_amount;
          current.details.orders.push({
            date: order.created_at,
            status: order.status,
            total_amount: order.total_amount,
            items: order.order_items
              .filter(item => item.medications) // Only include items with valid medication data
              .map(item => ({
                medication_name: item.medications.commercial_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
              })),
          });

          wholesalerMap.set(key, current);
        }
      });

      const topWholesalers = Array.from(wholesalerMap.values())
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 5);

      // Process wilaya statistics with detailed information
      const wilayaMap = new Map();
      orderStats?.forEach(order => {
        if (order.status === 'accepted' && order.users?.wilaya) {
          const key = order.users.wilaya;
          const current = wilayaMap.get(key) || {
            wilaya: key,
            order_count: 0,
            total_revenue: 0,
            details: {
              wholesalers: [],
            },
          };

          current.order_count++;
          current.total_revenue += order.total_amount;

          // Update wholesaler details for this wilaya
          const wholesalerIndex = current.details.wholesalers.findIndex(
            w => w.company_name === order.users.company_name
          );

          if (wholesalerIndex === -1) {
            current.details.wholesalers.push({
              company_name: order.users.company_name,
              order_count: 1,
              total_spent: order.total_amount,
            });
          } else {
            current.details.wholesalers[wholesalerIndex].order_count++;
            current.details.wholesalers[wholesalerIndex].total_spent += order.total_amount;
          }

          wilayaMap.set(key, current);
        }
      });

      const topWilayas = Array.from(wilayaMap.values())
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 5);

      setStats({
        ...stats,
        most_ordered_medications: topMedications,
        top_wholesalers: topWholesalers,
        top_wilayas: topWilayas,
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
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
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stats-card hover:shadow-lg transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total des commandes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_orders}</p>
            </div>
            <ShoppingBag className="h-8 w-8 text-indigo-600" />
          </div>
        </div>

        <div className="stats-card hover:shadow-lg transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total dépensé</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_spent.toFixed(2)} DZD</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="stats-card hover:shadow-lg transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Commandes en attente</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending_orders}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="stats-card hover:shadow-lg transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Commandes terminées</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed_orders}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Order Status Distribution */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribution des statuts de commande</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-yellow-50 rounded-lg cursor-pointer hover:shadow-md transition-all">
            <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">En attente</p>
            <p className="text-xl font-bold text-gray-900">{stats.pending_orders}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg cursor-pointer hover:shadow-md transition-all">
            <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Terminées</p>
            <p className="text-xl font-bold text-gray-900">{stats.completed_orders}</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg cursor-pointer hover:shadow-md transition-all">
            <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Annulées</p>
            <p className="text-xl font-bold text-gray-900">{stats.canceled_orders}</p>
          </div>
        </div>
      </div>

      {/* Most Ordered Medications */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Médicaments les plus commandés</h3>
        {stats.most_ordered_medications.length > 0 ? (
          <div className="space-y-4">
            {stats.most_ordered_medications.map((med, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-all"
                onClick={() => setSelectedMedication(med)}
              >
                <div className="flex items-center space-x-3">
                  <Package className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{med.medication_name}</p>
                    <p className="text-xs text-gray-500">{med.quantity} unités commandées</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{med.revenue.toFixed(2)} DZD</p>
                  <p className="text-xs text-gray-500">Chiffre d'affaires</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">Pas encore d'historique de commandes</p>
        )}
      </div>

      {/* Top Wholesalers */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Grossistes principaux</h3>
        {stats.top_wholesalers.length > 0 ? (
          <div className="space-y-4">
            {stats.top_wholesalers.map((wholesaler, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-all"
                onClick={() => setSelectedWholesaler(wholesaler)}
              >
                <div className="flex items-center space-x-3">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{wholesaler.company_name}</p>
                    <p className="text-xs text-gray-500">{wholesaler.order_count} commandes</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{wholesaler.total_spent.toFixed(2)} DZD</p>
                  <p className="text-xs text-gray-500">Total dépensé</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">Pas encore de commandes acceptées</p>
        )}
      </div>

      {/* Top Wilayas */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Meilleures wilayas</h3>
        {stats.top_wilayas.length > 0 ? (
          <div className="space-y-4">
            {stats.top_wilayas.map((wilaya, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-all"
                onClick={() => setSelectedWilaya(wilaya)}
              >
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{wilaya.wilaya}</p>
                    <p className="text-xs text-gray-500">{wilaya.order_count} commandes</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{wilaya.total_revenue.toFixed(2)} DZD</p>
                  <p className="text-xs text-gray-500">Chiffre d'affaires</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">Pas encore de commandes acceptées</p>
        )}
      </div>

      {/* Medication Detail Modal */}
      {selectedMedication && (
        <DetailModal
          title={`Détails pour ${selectedMedication.medication_name}`}
          onClose={() => setSelectedMedication(null)}
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Informations générales</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Forme</p>
                  <p className="text-sm font-medium text-gray-900">{selectedMedication.details.form}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Dosage</p>
                  <p className="text-sm font-medium text-gray-900">{selectedMedication.details.dosage}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Quantité totale commandée</p>
                  <p className="text-sm font-medium text-gray-900">{selectedMedication.quantity} unités</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Chiffre d'affaires total</p>
                  <p className="text-sm font-medium text-gray-900">{selectedMedication.revenue.toFixed(2)} DZD</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Historique des commandes</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantité</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Prix unitaire</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedMedication.details.orders.map((order, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatDate(order.date)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{order.quantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{order.price.toFixed(2)} DZD</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          {(order.quantity * order.price).toFixed(2)} DZD
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </DetailModal>
      )}

      {/* Wholesaler Detail Modal */}
      {selectedWholesaler && (
        <DetailModal
          title={`Détails pour ${selectedWholesaler.company_name}`}
          onClose={() => setSelectedWholesaler(null)}
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Résumé</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nombre total de commandes</p>
                  <p className="text-sm font-medium text-gray-900">{selectedWholesaler.order_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total dépensé</p>
                  <p className="text-sm font-medium text-gray-900">{selectedWholesaler.total_spent.toFixed(2)} DZD</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Historique des commandes</h4>
              <div className="space-y-4">
                {selectedWholesaler.details.orders.map((order, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Commande du {formatDate(order.date)}</p>
                        <p className="text-sm text-gray-500">Status: {order.status}</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{order.total_amount.toFixed(2)} DZD</p>
                    </div>
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="text-left text-xs font-medium text-gray-500">Médicament</th>
                          <th className="text-right text-xs font-medium text-gray-500">Quantité</th>
                          <th className="text-right text-xs font-medium text-gray-500">Prix unitaire</th>
                          <th className="text-right text-xs font-medium text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item, itemIndex) => (
                          <tr key={itemIndex}>
                            <td className="text-sm text-gray-900">{item.medication_name}</td>
                            <td className="text-sm text-gray-900 text-right">{item.quantity}</td>
                            <td className="text-sm text-gray-900 text-right">{item.unit_price.toFixed(2)} DZD</td>
                            <td className="text-sm text-gray-900 text-right">
                              {(item.quantity * item.unit_price).toFixed(2)} DZD
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DetailModal>
      )}

      {/* Wilaya Detail Modal */}
      {selectedWilaya && (
        <DetailModal
          title={`Détails pour ${selectedWilaya.wilaya}`}
          onClose={() => setSelectedWilaya(null)}
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Résumé</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nombre total de commandes</p>
                  <p className="text-sm font-medium text-gray-900">{selectedWilaya.order_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Chiffre d'affaires total</p>
                  <p className="text-sm font-medium text-gray-900">{selectedWilaya.total_revenue.toFixed(2)} DZD</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Grossistes dans cette wilaya</h4>
              <div className="space-y-2">
                {selectedWilaya.details.wholesalers.map((wholesaler, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{wholesaler.company_name}</p>
                      <p className="text-xs text-gray-500">{wholesaler.order_count} commandes</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{wholesaler.total_spent.toFixed(2)} DZD</p>
                      <p className="text-xs text-gray-500">Total dépensé</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DetailModal>
      )}
    </div>
  );
}