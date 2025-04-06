import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ShoppingBag, TrendingUp, Clock, CheckCircle, XCircle, Package, Percent, MapPin } from 'lucide-react';

type OrderStats = {
  total_medications: number;
  total_inventory_value: number;
  active_promotions: number;
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  canceled_orders: number;
  top_selling_medications: {
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
        pharmacist: string;
      }[];
    };
  }[];
  top_pharmacists: {
    company_name: string;
    order_count: number;
    total_revenue: number;
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
      pharmacists: {
        company_name: string;
        order_count: number;
        total_revenue: number;
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
    total_medications: 0,
    total_inventory_value: 0,
    active_promotions: 0,
    total_orders: 0,
    pending_orders: 0,
    completed_orders: 0,
    canceled_orders: 0,
    top_selling_medications: [],
    top_pharmacists: [],
    top_wilayas: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedMedication, setSelectedMedication] = useState<typeof stats.top_selling_medications[0] | null>(null);
  const [selectedPharmacist, setSelectedPharmacist] = useState<typeof stats.top_pharmacists[0] | null>(null);
  const [selectedWilaya, setSelectedWilaya] = useState<typeof stats.top_wilayas[0] | null>(null);
  const [showOrderStatusDetails, setShowOrderStatusDetails] = useState(false);
  const [showInventoryDetails, setShowInventoryDetails] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchStats();
    }
  }, [user?.id]);

  async function fetchStats() {
    try {
      // Fetch inventory stats
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('wholesaler_inventory')
        .select(`
          quantity,
          price,
          has_active_promotion,
          medications (
            commercial_name,
            form,
            dosage
          )
        `)
        .eq('wholesaler_id', user?.id);

      if (inventoryError) throw inventoryError;

      // Calculate inventory statistics
      const inventoryStats = {
        total_medications: inventoryData?.length || 0,
        total_inventory_value: inventoryData?.reduce((sum, item) => sum + (item.quantity * item.price), 0) || 0,
        active_promotions: inventoryData?.filter(item => item.has_active_promotion).length || 0,
      };

      // Fetch order stats with detailed information
      const { data: orderStats, error: orderError } = await supabase
        .from('orders')
        .select(`
          status,
          total_amount,
          created_at,
          pharmacist:users!orders_pharmacist_id_fkey (
            company_name,
            wilaya
          ),
          order_items (
            quantity,
            unit_price,
            medications (
              commercial_name,
              form,
              dosage
            )
          )
        `)
        .eq('wholesaler_id', user?.id);

      if (orderError) throw orderError;

      // Calculate order statistics
      const orderCounts = {
        total_orders: orderStats?.length || 0,
        pending_orders: orderStats?.filter(order => order.status === 'pending' || order.status === 'pending_delivery_confirmation').length || 0,
        completed_orders: orderStats?.filter(order => order.status === 'accepted').length || 0,
        canceled_orders: orderStats?.filter(order => order.status === 'canceled').length || 0,
      };

      // Process medication statistics
      const medicationMap = new Map();
      orderStats?.forEach(order => {
        if (order.status === 'accepted') {
          order.order_items.forEach(item => {
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
              pharmacist: order.pharmacist.company_name,
            });

            medicationMap.set(key, current);
          });
        }
      });

      const topMedications = Array.from(medicationMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Process pharmacist statistics
      const pharmacistMap = new Map();
      orderStats?.forEach(order => {
        if (order.status === 'accepted') {
          const key = order.pharmacist.company_name;
          const current = pharmacistMap.get(key) || {
            company_name: key,
            order_count: 0,
            total_revenue: 0,
            details: {
              orders: [],
            },
          };

          current.order_count++;
          current.total_revenue += order.total_amount;
          current.details.orders.push({
            date: order.created_at,
            status: order.status,
            total_amount: order.total_amount,
            items: order.order_items.map(item => ({
              medication_name: item.medications.commercial_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
            })),
          });

          pharmacistMap.set(key, current);
        }
      });

      const topPharmacists = Array.from(pharmacistMap.values())
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 5);

      // Process wilaya statistics
      const wilayaMap = new Map();
      orderStats?.forEach(order => {
        if (order.status === 'accepted') {
          const key = order.pharmacist.wilaya;
          const current = wilayaMap.get(key) || {
            wilaya: key,
            order_count: 0,
            total_revenue: 0,
            details: {
              pharmacists: [],
            },
          };

          current.order_count++;
          current.total_revenue += order.total_amount;

          // Update pharmacist details for this wilaya
          const pharmacistIndex = current.details.pharmacists.findIndex(
            p => p.company_name === order.pharmacist.company_name
          );

          if (pharmacistIndex === -1) {
            current.details.pharmacists.push({
              company_name: order.pharmacist.company_name,
              order_count: 1,
              total_revenue: order.total_amount,
            });
          } else {
            current.details.pharmacists[pharmacistIndex].order_count++;
            current.details.pharmacists[pharmacistIndex].total_revenue += order.total_amount;
          }

          wilayaMap.set(key, current);
        }
      });

      const topWilayas = Array.from(wilayaMap.values())
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 5);

      setStats({
        ...inventoryStats,
        ...orderCounts,
        top_selling_medications: topMedications,
        top_pharmacists: topPharmacists,
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
        <div 
          className="stats-card hover:shadow-lg transition-all cursor-pointer"
          onClick={() => setShowInventoryDetails(true)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total des médicaments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_medications}</p>
            </div>
            <Package className="h-8 w-8 text-indigo-600" />
          </div>
        </div>

        <div 
          className="stats-card hover:shadow-lg transition-all cursor-pointer"
          onClick={() => setShowInventoryDetails(true)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Valeur de l'inventaire</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_inventory_value.toFixed(2)} DZD</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div 
          className="stats-card hover:shadow-lg transition-all cursor-pointer"
          onClick={() => setShowInventoryDetails(true)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Promotions actives</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active_promotions}</p>
            </div>
            <Percent className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div 
          className="stats-card hover:shadow-lg transition-all cursor-pointer"
          onClick={() => setShowOrderStatusDetails(true)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total des commandes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_orders}</p>
            </div>
            <ShoppingBag className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Order Status Distribution */}
      <div 
        className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-all"
        onClick={() => setShowOrderStatusDetails(true)}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribution des statuts de commande</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">En attente</p>
            <p className="text-xl font-bold text-gray-900">{stats.pending_orders}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Terminées</p>
            <p className="text-xl font-bold text-gray-900">{stats.completed_orders}</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Annulées</p>
            <p className="text-xl font-bold text-gray-900">{stats.canceled_orders}</p>
          </div>
        </div>
      </div>

      {/* Top Selling Medications */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Médicaments les plus vendus</h3>
        {stats.top_selling_medications.length > 0 ? (
          <div className="space-y-4">
            {stats.top_selling_medications.map((med, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-all"
                onClick={() => setSelectedMedication(med)}
              >
                <div className="flex items-center space-x-3">
                  <Package className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{med.medication_name}</p>
                    <p className="text-xs text-gray-500">{med.quantity} unités vendues</p>
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
          <p className="text-center text-gray-500 py-4">Pas encore de données de vente disponibles</p>
        )}
      </div>

      {/* Top Pharmacists */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Meilleurs pharmaciens</h3>
        {stats.top_pharmacists.length > 0 ? (
          <div className="space-y-4">
            {stats.top_pharmacists.map((pharmacist, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-all"
                onClick={() => setSelectedPharmacist(pharmacist)}
              >
                <div className="flex items-center space-x-3">
                  <ShoppingBag className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{pharmacist.company_name}</p>
                    <p className="text-xs text-gray-500">{pharmacist.order_count} commandes</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{pharmacist.total_revenue.toFixed(2)} DZD</p>
                  <p className="text-xs text-gray-500">Chiffre d'affaires</p>
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

      {/* Inventory Details Modal */}
      {showInventoryDetails && (
        <DetailModal
          title="Détails de l'inventaire"
          onClose={() => setShowInventoryDetails(false)}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Médicaments</h4>
                <p className="text-2xl font-bold text-indigo-600">{stats.total_medications}</p>
                <p className="text-sm text-gray-500">Total des médicaments en stock</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Valeur totale</h4>
                <p className="text-2xl font-bold text-green-600">{stats.total_inventory_value.toFixed(2)} DZD</p>
                <p className="text-sm text-gray-500">Valeur totale de l'inventaire</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Promotions</h4>
                <p className="text-2xl font-bold text-purple-600">{stats.active_promotions}</p>
                <p className="text-sm text-gray-500">Promotions actives</p>
              </div>
            </div>
          </div>
        </DetailModal>
      )}

      {/* Order Status Details Modal */}
      {showOrderStatusDetails && (
        <DetailModal
          title="Détails des commandes"
          onClose={() => setShowOrderStatusDetails(false)}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Total</h4>
                <p className="text-2xl font-bold text-blue-600">{stats.total_orders}</p>
                <p className="text-sm text-gray-500">Commandes totales</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">En attente</h4>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending_orders}</p>
                <p className="text-sm text-gray-500">À traiter</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Terminées</h4>
                <p className="text-2xl font-bold text-green-600">{stats.completed_orders}</p>
                <p className="text-sm text-gray-500">Commandes acceptées</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Annulées</h4>
                <p className="text-2xl font-bold text-red-600">{stats.canceled_orders}</p>
                <p className="text-sm text-gray-500">Commandes annulées</p>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-4">Distribution des statuts</h4>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${(stats.completed_orders / stats.total_orders) * 100}%`,
                    float: 'left',
                  }}
                />
                <div
                  className="h-full bg-yellow-500"
                  style={{
                    width: `${(stats.pending_orders / stats.total_orders) * 100}%`,
                    float: 'left',
                  }}
                />
                <div
                  className="h-full bg-red-500"
                  style={{
                    width: `${(stats.canceled_orders / stats.total_orders) * 100}%`,
                    float: 'left',
                  }}
                />
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-green-600">{Math.round((stats.completed_orders / stats.total_orders) * 100)}% Terminées</span>
                <span className="text-yellow-600">{Math.round((stats.pending_orders / stats.total_orders) * 100)}% En attente</span>
                <span className="text-red-600">{Math.round((stats.canceled_orders / stats.total_orders) * 100)}% Annulées</span>
              </div>
            </div>
          </div>
        </DetailModal>
      )}

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
                  <p className="text-sm text-gray-500">Quantité totale vendue</p>
                  <p className="text-sm font-medium text-gray-900">{selectedMedication.quantity} unités</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Chiffre d'affaires total</p>
                  <p className="text-sm font-medium text-gray-900">{selectedMedication.revenue.toFixed(2)} DZD</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Historique des ventes</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pharmacien</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantité</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Prix unitaire</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedMedication.details.orders.map((order, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatDate(order.date)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{order.pharmacist}</td>
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

      {/* Pharmacist Detail Modal */}
      {selectedPharmacist && (
        <DetailModal
          title={`Détails pour ${selectedPharmacist.company_name}`}
          onClose={() => setSelectedPharmacist(null)}
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Résumé</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nombre total de commandes</p>
                  <p className="text-sm font-medium text-gray-900">{selectedPharmacist.order_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Chiffre d'affaires total</p>
                  <p className="text-sm font-medium text-gray-900">{selectedPharmacist.total_revenue.toFixed(2)} DZD</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Historique des commandes</h4>
              <div className="space-y-4">
                {selectedPharmacist.details.orders.map((order, index) => (
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
              <h4 className="font-medium text-gray-900 mb-2">Pharmaciens dans cette wilaya</h4>
              <div className="space-y-2">
                {selectedWilaya.details.pharmacists.map((pharmacist, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{pharmacist.company_name}</p>
                      <p className="text-xs text-gray-500">{pharmacist.order_count} commandes</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{pharmacist.total_revenue.toFixed(2)} DZD</p>
                      <p className="text-xs text-gray-500">Chiffre d'affaires</p>
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