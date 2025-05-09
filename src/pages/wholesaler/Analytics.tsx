import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '@tremor/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { UserLink } from '../../components/UserLink';

type OrderStats = {
  daily: {
    date: string;
    orders: number;
    revenue: number;
  }[];
  monthly: {
    month: string;
    orders: number;
    revenue: number;
  }[];
  topProducts: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
  topPharmacists: {
    pharmacist: {
      id: string;
      company_name: string;
      wilaya: string;
      email: string;
    };
    orders: number;
    revenue: number;
  }[];
  ordersByStatus: {
    status: string;
    count: number;
  }[];
};

export function Analytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState<OrderStats>({
    daily: [],
    monthly: [],
    topProducts: [],
    topPharmacists: [],
    ordersByStatus: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchStats();
    }
  }, [user?.id]);

  const fetchStats = async () => {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          pharmacist:users!orders_pharmacist_id_fkey (
            id,
            company_name,
            wilaya,
            email
          ),
          order_items (
            quantity,
            unit_price,
            medication_id,
            medications (
              commercial_name
            )
          )
        `)
        .eq('wholesaler_id', user?.id);

      if (error) throw error;

      // Process daily stats
      const dailyStats = new Map();
      orders?.forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        const current = dailyStats.get(date) || { orders: 0, revenue: 0 };
        current.orders++;
        current.revenue += order.total_amount;
        dailyStats.set(date, current);
      });

      // Process monthly stats
      const monthlyStats = new Map();
      orders?.forEach(order => {
        const month = new Date(order.created_at).toISOString().slice(0, 7);
        const current = monthlyStats.get(month) || { orders: 0, revenue: 0 };
        current.orders++;
        current.revenue += order.total_amount;
        monthlyStats.set(month, current);
      });

      // Process top products
      const productsMap = new Map();
      orders?.forEach(order => {
        order.order_items?.forEach(item => {
          if (!item.medications) return;
          const name = item.medications.commercial_name;
          const current = productsMap.get(name) || { quantity: 0, revenue: 0 };
          current.quantity += item.quantity;
          current.revenue += item.quantity * item.unit_price;
          productsMap.set(name, current);
        });
      });

      // Process pharmacist stats
      const pharmacistMap = new Map();
      orders?.forEach(order => {
        const pharmacist = order.pharmacist;
        if (!pharmacist) return;
        const current = pharmacistMap.get(pharmacist.id) || {
          pharmacist,
          orders: 0,
          revenue: 0
        };
        current.orders++;
        current.revenue += order.total_amount;
        pharmacistMap.set(pharmacist.id, current);
      });

      // Process order status stats
      const statusMap = new Map();
      orders?.forEach(order => {
        const current = statusMap.get(order.status) || 0;
        statusMap.set(order.status, current + 1);
      });

      setStats({
        daily: Array.from(dailyStats.entries()).map(([date, stats]) => ({
          date,
          ...stats
        })),
        monthly: Array.from(monthlyStats.entries()).map(([month, stats]) => ({
          month,
          ...stats
        })),
        topProducts: Array.from(productsMap.entries())
          .map(([name, stats]) => ({ name, ...stats }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10),
        topPharmacists: Array.from(pharmacistMap.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10),
        ordersByStatus: Array.from(statusMap.entries()).map(([status, count]) => ({
          status,
          count
        }))
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadStats = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // Daily stats sheet
      const dailyData = stats.daily.map(day => ({
        'Date': day.date,
        'Nombre de commandes': day.orders,
        'Chiffre d\'affaires': day.revenue.toFixed(2) + ' DZD'
      }));
      const dailySheet = XLSX.utils.json_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(workbook, dailySheet, 'Statistiques journalières');

      // Monthly stats sheet
      const monthlyData = stats.monthly.map(month => ({
        'Mois': month.month,
        'Nombre de commandes': month.orders,
        'Chiffre d\'affaires': month.revenue.toFixed(2) + ' DZD'
      }));
      const monthlySheet = XLSX.utils.json_to_sheet(monthlyData);
      XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Statistiques mensuelles');

      // Top products sheet
      const productsData = stats.topProducts.map(product => ({
        'Produit': product.name,
        'Quantité vendue': product.quantity,
        'Chiffre d\'affaires': product.revenue.toFixed(2) + ' DZD'
      }));
      const productsSheet = XLSX.utils.json_to_sheet(productsData);
      XLSX.utils.book_append_sheet(workbook, productsSheet, 'Top produits');

      // Top pharmacists sheet
      const pharmacistsData = stats.topPharmacists.map(pharm => ({
        'Pharmacie': pharm.pharmacist.company_name,
        'Wilaya': pharm.pharmacist.wilaya,
        'Email': pharm.pharmacist.email,
        'Nombre de commandes': pharm.orders,
        'Chiffre d\'affaires': pharm.revenue.toFixed(2) + ' DZD'
      }));
      const pharmacistsSheet = XLSX.utils.json_to_sheet(pharmacistsData);
      XLSX.utils.book_append_sheet(workbook, pharmacistsSheet, 'Top pharmacies');

      XLSX.writeFile(workbook, 'statistiques_ventes.xlsx');
    } catch (error) {
      console.error('Error downloading stats:', error);
      alert('Erreur lors du téléchargement des statistiques');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Analytiques</h2>
        <button
          onClick={downloadStats}
          className="flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <Download className="h-5 w-5 mr-2" />
          Télécharger les statistiques
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Chiffre d'affaires mensuel</h3>
          <div className="w-full overflow-x-auto">
            <BarChart width={500} height={300} data={stats.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" name="Chiffre d'affaires" fill="#4F46E5" />
            </BarChart>
          </div>
        </Card>

        {/* Orders by Status */}
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Commandes par statut</h3>
          <div className="w-full overflow-x-auto">
            <BarChart width={500} height={300} data={stats.ordersByStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Nombre de commandes" fill="#10B981" />
            </BarChart>
          </div>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Produits les plus vendus</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Chiffre d'affaires</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.topProducts.map((product, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{product.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{product.revenue.toFixed(2)} DZD</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Top Pharmacists */}
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Meilleures pharmacies</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pharmacie</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wilaya</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Commandes</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Chiffre d'affaires</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.topPharmacists.map((pharm, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <UserLink user={pharm.pharmacist} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pharm.pharmacist.wilaya}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{pharm.orders}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{pharm.revenue.toFixed(2)} DZD</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}