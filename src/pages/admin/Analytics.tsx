import React, { useEffect, useState } from 'react';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { Users, ShoppingCart, CreditCard, TrendingUp, X, ChevronRight } from 'lucide-react';

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
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type AnalyticsData = {
  users: {
    total: number;
    pharmacists: number;
    wholesalers: number;
    verified: number;
    unverified: number;
    details: {
      pharmacists: {
        company_name: string;
        email: string;
        wilaya: string;
        is_verified: boolean;
        created_at: string;
      }[];
      wholesalers: {
        company_name: string;
        email: string;
        wilaya: string;
        is_verified: boolean;
        created_at: string;
      }[];
    };
  };
  orders: {
    total: number;
    pending: number;
    accepted: number;
    canceled: number;
    total_amount: number;
    details: {
      recent: {
        id: string;
        pharmacist_name: string;
        wholesaler_name: string;
        status: string;
        total_amount: number;
        created_at: string;
      }[];
      by_status: {
        status: string;
        orders: {
          id: string;
          pharmacist_name: string;
          wholesaler_name: string;
          total_amount: number;
          created_at: string;
        }[];
      }[];
    };
  };
  subscriptions: {
    trial: number;
    active: number;
    expired: number;
    pending_payment: number;
    total_revenue: number;
    details: {
      by_status: {
        status: string;
        subscriptions: {
          user_name: string;
          email: string;
          trial_end_date: string;
          subscription_end: string | null;
          payment_status: string | null;
        }[];
      }[];
    };
  };
  activity: {
    today: number;
    week: number;
    month: number;
    details: {
      recent: {
        user_name: string;
        action: string;
        page: string;
        created_at: string;
      }[];
      by_date: {
        date: string;
        count: number;
        activities: {
          user_name: string;
          action: string;
          page: string;
          created_at: string;
        }[];
      }[];
    };
  };
};

export function Analytics() {
  const [loading, setLoading] = useState(true);
  // Remplacez par vos vrais IDs Supabase
  const EXCLUDED_USER_IDS = [
    'Pharmagros', 
    'Pharmacie201',
    'PharmaConnect',
    'Axsana'
  ];

  const [data, setData] = useState<AnalyticsData>({
    users: {
      total: 0,
      pharmacists: 0,
      wholesalers: 0,
      verified: 0,
      unverified: 0,
      details: {
        pharmacists: [],
        wholesalers: []
      }
    },
    orders: {
      total: 0,
      pending: 0,
      accepted: 0,
      canceled: 0,
      total_amount: 0,
      details: {
        recent: [],
        by_status: []
      }
    },
    subscriptions: {
      trial: 0,
      active: 0,
      expired: 0,
      pending_payment: 0,
      total_revenue: 0,
      details: {
        by_status: []
      }
    },
    activity: {
      today: 0,
      week: 0,
      month: 0,
      details: {
        recent: [],
        by_date: []
      }
    }
  });

  const [selectedSection, setSelectedSection] = useState<'users' | 'orders' | 'subscriptions' | 'activity' | null>(null);
  const [selectedSubSection, setSelectedSubSection] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      // Fetch user statistics with details
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      const userStats = {
        total: users.length,
        pharmacists: users.filter(u => u.role === 'pharmacist').length,
        wholesalers: users.filter(u => u.role === 'wholesaler').length,
        verified: users.filter(u => u.is_verified).length,
        unverified: users.filter(u => !u.is_verified).length,
        details: {
          pharmacists: users
            .filter(u => u.role === 'pharmacist')
            .map(u => ({
              company_name: u.company_name,
              email: u.email,
              wilaya: u.wilaya,
              is_verified: u.is_verified,
              created_at: u.created_at
            })),
          wholesalers: users
            .filter(u => u.role === 'wholesaler')
            .map(u => ({
              company_name: u.company_name,
              email: u.email,
              wilaya: u.wilaya,
              is_verified: u.is_verified,
              created_at: u.created_at
            }))
        }
      };

      // Fetch order statistics with details
      const { data: orders, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          pharmacist:users!orders_pharmacist_id_fkey (company_name),
          wholesaler:users!orders_wholesaler_id_fkey (company_name)
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const orderStats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending' || o.status === 'pending_delivery_confirmation').length,
        accepted: orders.filter(o => o.status === 'accepted').length,
        canceled: orders.filter(o => o.status === 'canceled').length,
        total_amount: orders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
        details: {
          recent: orders.slice(0, 10).map(o => ({
            id: o.id,
            pharmacist_name: o.pharmacist?.company_name || 'Unknown',
            wholesaler_name: o.wholesaler?.company_name || 'Unknown',
            status: o.status,
            total_amount: o.total_amount,
            created_at: o.created_at
          })),
          by_status: ['pending', 'pending_delivery_confirmation', 'accepted', 'canceled'].map(status => ({
            status,
            orders: orders
              .filter(o => o.status === status)
              .map(o => ({
                id: o.id,
                pharmacist_name: o.pharmacist?.company_name || 'Unknown',
                wholesaler_name: o.wholesaler?.company_name || 'Unknown',
                total_amount: o.total_amount,
                created_at: o.created_at
              }))
          }))
        }
      };

      // Fetch subscription statistics with details
      const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
        .from('user_subscriptions')
        .select(`
          *,
          user:users (
            company_name,
            email
          )
        `);

      if (subscriptionsError) throw subscriptionsError;

      const subscriptionStats = {
        trial: subscriptions.filter(s => s.status === 'trial').length,
        active: subscriptions.filter(s => s.status === 'active').length,
        expired: subscriptions.filter(s => s.status === 'expired').length,
        pending_payment: subscriptions.filter(s => s.status === 'pending_payment').length,
        total_revenue: 0, // To be implemented with actual payment data
        details: {
          by_status: ['trial', 'active', 'expired', 'pending_payment'].map(status => ({
            status,
            subscriptions: subscriptions
              .filter(s => s.status === status)
              .map(s => ({
                user_name: s.user?.company_name || 'Unknown',
                email: s.user?.email || 'Unknown',
                trial_end_date: s.trial_end_date,
                subscription_end: s.subscription_end,
                payment_status: s.payment_status
              }))
          }))
        }
      };

      // Fetch activity statistics with details
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const { data: activities, error: activitiesError } = await supabaseAdmin
        .from('user_activity_logs')
        .select(`
          *,
          user:users (company_name)
        `)
        .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;

      // Group activities by date
      const activityByDate = activities.reduce((acc: any, activity) => {
        const date = new Date(activity.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            count: 0,
            activities: []
          };
        }
        acc[date].count++;
        acc[date].activities.push({
          user_name: activity.user?.company_name || 'Unknown',
          action: activity.action,
          page: activity.page,
          created_at: activity.created_at
        });
        return acc;
      }, {});

      const uniqueUserCount = (arr: any[]) => new Set(arr.map(a => a.user_id)).size

const activityStats = {
  today: uniqueUserCount( activities.filter(a => new Date(a.created_at) >=   today) ),
  week:  uniqueUserCount( activities.filter(a => new Date(a.created_at) >=  weekAgo) ),
  month: uniqueUserCount( activities.filter(a => new Date(a.created_at) >= monthAgo) ),
  details: {
    recent:   activities
                .slice(0, 10)
                .map(a => ({ user_name: a.user?.company_name || '—', action: a.action, page: a.page, created_at: a.created_at })),
    by_date:  Object.values(activityByDate)
  }
}

      setData({
        users: userStats,
        orders: orderStats,
        subscriptions: subscriptionStats,
        activity: activityStats
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'En attente' },
      pending_delivery_confirmation: { color: 'bg-blue-100 text-blue-800', text: 'À confirmer' },
      accepted: { color: 'bg-green-100 text-green-800', text: 'Acceptée' },
      canceled: { color: 'bg-red-100 text-red-800', text: 'Annulée' },
      trial: { color: 'bg-blue-100 text-blue-800', text: 'Essai' },
      active: { color: 'bg-green-100 text-green-800', text: 'Actif' },
      expired: { color: 'bg-red-100 text-red-800', text: 'Expiré' },
      pending_payment: { color: 'bg-yellow-100 text-yellow-800', text: 'Paiement en attente' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
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
      <h2 className="text-2xl font-semibold text-gray-900">Tableau de bord analytique</h2>

      {/* User Statistics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Statistiques utilisateurs</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            className="bg-indigo-50 p-4 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors"
            onClick={() => {
              setSelectedSection('users');
              setSelectedSubSection('total');
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-600">Total utilisateurs</p>
                <p className="text-2xl font-bold text-indigo-900">{data.users.total}</p>
              </div>
              <Users className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-sm text-indigo-600">
                Pharmaciens : {data.users.pharmacists}
              </p>
              <p className="text-sm text-indigo-600">
                Grossistes : {data.users.wholesalers}
              </p>
            </div>
            <div className="mt-2 flex items-center text-sm text-indigo-600">
              <span>Voir les détails</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </div>
          </div>

          <div 
            className="bg-green-50 p-4 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
            onClick={() => {
              setSelectedSection('users');
              setSelectedSubSection('verified');
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Utilisateurs vérifiés</p>
                <p className="text-2xl font-bold text-green-900">{data.users.verified}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-green-600">
                Taux de vérification : {((data.users.verified / data.users.total) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="mt-2 flex items-center text-sm text-green-600">
              <span>Voir les détails</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </div>
          </div>

          <div 
            className="bg-yellow-50 p-4 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
            onClick={() => {
              setSelectedSection('users');
              setSelectedSubSection('unverified');
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">En attente de vérification</p>
                <p className="text-2xl font-bold text-yellow-900">{data.users.unverified}</p>
              </div>
              <Users className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="mt-2 flex items-center text-sm text-yellow-600">
              <span>Voir les détails</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Order Statistics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Statistiques commandes</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div 
            className="bg-blue-50 p-4 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => {
              setSelectedSection('orders');
              setSelectedSubSection('total');
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Total commandes</p>
                <p className="text-2xl font-bold text-blue-900">{data.orders.total}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2 flex items-center text-sm text-blue-600">
              <span>Voir les détails</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </div>
          </div>

          <div 
            className="bg-yellow-50 p-4 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
            onClick={() => {
              setSelectedSection('orders');
              setSelectedSubSection('pending');
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">En attente</p>
                <p className="text-2xl font-bold text-yellow-900">{data.orders.pending}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="mt-2 flex items-center text-sm text-yellow-600">
              <span>Voir les détails</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </div>
          </div>

          <div 
            className="bg-green-50 p-4 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
            onClick={() => {
              setSelectedSection('orders');
              setSelectedSubSection('accepted');
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Acceptées</p>
                <p className="text-2xl font-bold text-green-900">{data.orders.accepted}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2 flex items-center text-sm text-green-600">
              <span>Voir les détails</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </div>
          </div>

          <div 
            className="bg-red-50 p-4 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
            onClick={() => {
              setSelectedSection('orders');
              setSelectedSubSection('canceled');
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Annulées</p>
                <p className="text-2xl font-bold text-red-900">{data.orders.canceled}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-red-600" />
            </div>
            <div className="mt-2 flex items-center text-sm text-red-600">
              <span>Voir les détails</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-lg font-medium text-gray-900">
            Chiffre d'affaires total : {data.orders.total_amount.toFixed(2)} DZD
          </p>
        </div>
      </div>

      {/* Subscription Statistics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Statistiques abonnements</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div 
            className="bg-blue-50 p-4 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => {
              setSelectedSection('subscriptions');
              setSelectedSubSection('trial');
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">En essai</p>
                <p className="text-2xl font-bold text-blue-900">{data.subscriptions.trial}</p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2 flex items-center text-sm text-blue-600">
              <span>Voir les détails</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </div>
          </div>

          <div 
            className="bg-green-50 p-4 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
            onClick={() => {
              setSelectedSection('subscriptions');
              setSelectedSubSection('active');
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Actifs</p>
                <p className="text-2xl font-bold text-green-900">{data.subscriptions.active}</p>
              </div>
              <CreditCard className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2 flex items-center text-sm text-green-600">
              <span>Voir les détails</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </div>
          </div>

          <div 
            className="bg-red-50 p-4 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
            onClick={() => {
              setSelectedSection('subscriptions');
              setSelectedSubSection('expired');
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Expirés</p>
                <p className="text-2xl font-bold text-red-900">{data.subscriptions.expired}</p>
              </div>
              <CreditCard className="h-8 w-8 text-red-600" />
            </div>
            <div className="mt-2 flex items-center text-sm text-red-600">
              <span>Voir les détails</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </div>
          </div>

          <div 
            className="bg-yellow-50 p-4 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
            onClick={() => {
              setSelectedSection('subscriptions');
              setSelectedSubSection('pending_payment');
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Paiement en attente</p>
                <p className="text-2xl font-bold text-yellow-900">{data.subscriptions.pending_payment}</p>
              </div>
              <CreditCard className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="mt-2 flex items-center text-sm text-yellow-600">
              <span>Voir les détails</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Statistics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Activité utilisateurs</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            className="bg-indigo-50 p-4 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors"
            onClick={() => {
              setSelectedSection('activity');
              setSelectedSubSection('today');
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-600">Aujourd'hui</p>
                <p className="text-2xl font-bold text-indigo-900">{data.activity.today}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="mt-2 flex items-center text-sm text-indigo-600">
              <span>Voir les détails</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </div>
          </div>

          <div 
            className="bg-indigo-50 p-4 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors"
            onClick={() => {
              setSelectedSection('activity');
              setSelectedSubSection('week');
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-600">Cette semaine</p>
                <p className="text-2xl font-bold text-indigo-900">{data.activity.week}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="mt-2 flex items-center text-sm text-indigo-600">
              <span>Voir les détails</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </div>
          </div>

          <div 
            className="bg-indigo-50 p-4 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors"
            onClick={() => {
              setSelectedSection('activity');
              setSelectedSubSection('month');
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-600">Ce mois</p>
                <p className="text-2xl font-bold text-indigo-900">{data.activity.month}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="mt-2 flex items-center text-sm text-indigo-600">
              <span>Voir les détails</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modals */}
      {selectedSection === 'users' && (
        <DetailModal
          title={
            selectedSubSection === 'total' ? 'Détails des utilisateurs' :
            selectedSubSection === 'verified' ? 'Utilisateurs vérifiés' :
            'Utilisateurs en attente de vérification'
          }
          onClose={() => {
            setSelectedSection(null);
            setSelectedSubSection(null);
          }}
        >
          <div className="space-y-6">
            {selectedSubSection === 'total' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Pharmaciens</h4>
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="text-left text-xs font-medium text-gray-500">Nom</th>
                          <th className="text-left text-xs font-medium text-gray-500">Wilaya</th>
                          <th className="text-left text-xs font-medium text-gray-500">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.users.details.pharmacists.map((user, index) => (
                          <tr key={index}>
                            <td className="py-2">
                              <div className="text-sm font-medium text-gray-900">{user.company_name}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </td>
                            <td className="py-2 text-sm text-gray-900">{user.wilaya}</td>
                            <td className="py-2">
                              {user.is_verified ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Vérifié
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  En attente
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Grossistes</h4>
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="text-left text-xs font-medium text-gray-500">Nom</th>
                          <th className="text-left text-xs font-medium text-gray-500">Wilaya</th>
                          <th className="text-left text-xs font-medium text-gray-500">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.users.details.wholesalers.map((user, index) => (
                          <tr key={index}>
                            <td className="py-2">
                              <div className="text-sm font-medium text-gray-900">{user.company_name}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </td>
                            <td className="py-2 text-sm text-gray-900">{user.wilaya}</td>
                            <td className="py-2">
                              {user.is_verified ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Vérifié
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  En attente
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {selectedSubSection === 'verified' && (
              <div className="space-y-4">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500">Utilisateur</th>
                      <th className="text-left text-xs font-medium text-gray-500">Type</th>
                      <th className="text-left text-xs font-medium text-gray-500">Wilaya</th>
                      <th className="text-left text-xs font-medium text-gray-500">Date d'inscription</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.users.details.pharmacists, ...data.users.details.wholesalers]
                      .filter(user => user.is_verified)
                      .map((user, index) => (
                        <tr key={index}>
                          <td className="py-2">
                            <div className="text-sm font-medium text-gray-900">{user.company_name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </td>
                          <td className="py-2 text-sm text-gray-900">
                            {user.role === 'pharmacist' ? 'Pharmacien' : 'Grossiste'}
                          </td>
                          <td className="py-2 text-sm text-gray-900">{user.wilaya}</td>
                          <td className="py-2 text-sm text-gray-900">{formatDate(user.created_at)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedSubSection === 'unverified' && (
              <div className="space-y-4">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500">Utilisateur</th>
                      <th className="text-left text-xs font-medium text-gray-500">Type</th>
                      <th className="text-left text-xs font-medium text-gray-500">Wilaya</th>
                      <th className="text-left text-xs font-medium text-gray-500">Date d'inscription</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.users.details.pharmacists, ...data.users.details.wholesalers]
                      .filter(user => !user.is_verified)
                      .map((user, index) => (
                        <tr key={index}>
                          <td className="py-2">
                            <div className="text-sm font-medium text-gray-900">{user.company_name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </td>
                          <td className="py-2 text-sm text-gray-900">
                            {user.role === 'pharmacist' ? 'Pharmacien' : 'Grossiste'}
                          </td>
                          <td className="py-2 text-sm text-gray-900">{user.wilaya}</td>
                          <td className="py-2 text-sm text-gray-900">{formatDate(user.created_at)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DetailModal>
      )}

      {selectedSection === 'orders' && (
        <DetailModal
          title={
            selectedSubSection === 'total' ? 'Toutes les commandes' :
            selectedSubSection === 'pending' ? 'Commandes en attente' :
            selectedSubSection === 'accepted' ? 'Commandes acceptées' :
            'Commandes annulées'
          }
          onClose={() => {
            setSelectedSection(null);
            setSelectedSubSection(null);
          }}
        >
          <div className="space-y-6">
            {selectedSubSection === 'total' && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900">Total</h4>
                    <p className="text-2xl font-bold text-gray-900">{data.orders.total}</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-900">En attente</h4>
                    <p className="text-2xl font-bold text-yellow-900">{data.orders.pending}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900">Acceptées</h4>
                    <p className="text-2xl font-bold text-green-900">{data.orders.accepted}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-medium text-red-900">Annulées</h4>
                    <p className="text-2xl font-bold text-red-900">{data.orders.canceled}</p>
                  </div>
                </div>

                <h4 className="font-medium text-gray-900 mt-6 mb-4">Commandes récentes</h4>
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500">ID</th>
                      <th className="text-left text-xs font-medium text-gray-500">Pharmacien</th>
                      <th className="text-left text-xs font-medium text-gray-500">Grossiste</th>
                      <th className="text-left text-xs font-medium text-gray-500">Statut</th>
                      <th className="text-right text-xs font-medium text-gray-500">Montant</th>
                      <th className="text-left text-xs font-medium text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.details.recent.map((order, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-2 text-sm text-gray-900">{order.id}</td>
                        <td className="py-2 text-sm text-gray-900">{order.pharmacist_name}</td>
                        <td className="py-2 text-sm text-gray-900">{order.wholesaler_name}</td>
                        <td className="py-2">{getStatusBadge(order.status)}</td>
                        <td className="py-2 text-sm text-gray-900 text-right">{order.total_amount.toFixed(2)} DZD</td>
                        <td className="py-2 text-sm text-gray-900">{formatDate(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(selectedSubSection === 'pending' || selectedSubSection === 'accepted' || selectedSubSection === 'canceled') && (
              <div className="space-y-4">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500">ID</th>
                      <th className="text-left text-xs font-medium text-gray-500">Pharmacien</th>
                      <th className="text-left text-xs font-medium text-gray-500">Grossiste</th>
                      <th className="text-right text-xs font-medium text-gray-500">Montant</th>
                      <th className="text-left text-xs font-medium text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.details.by_status
                      .find(s => s.status === selectedSubSection)
                      ?.orders.map((order, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="py-2 text-sm text-gray-900">{order.id}</td>
                          <td className="py-2 text-sm text-gray-900">{order.pharmacist_name}</td>
                          <td className="py-2 text-sm text-gray-900">{order.wholesaler_name}</td>
                          <td className="py-2 text-sm text-gray-900 text-right">{order.total_amount.toFixed(2)} DZD</td>
                          <td className="py-2 text-sm text-gray-900">{formatDate(order.created_at)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DetailModal>
      )}

      {selectedSection === 'subscriptions' && (
        <DetailModal
          title={
            selectedSubSection === 'trial' ? 'Abonnements en période d\'essai' :
            selectedSubSection === 'active' ? 'Abonnements actifs' :
            selectedSubSection === 'expired' ? 'Abonnements expirés' :
            'Abonnements en attente de paiement'
          }
          onClose={() => {
            setSelectedSection(null);
            setSelectedSubSection(null);
          }}
        >
          <div className="space-y-4">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500">Utilisateur</th>
                  <th className="text-left text-xs font-medium text-gray-500">Email</th>
                  <th className="text-left text-xs font-medium text-gray-500">Fin d'essai</th>
                  <th className="text-left text-xs font-medium text-gray-500">Fin d'abonnement</th>
                  <th className="text-left text-xs font-medium text-gray-500">Statut paiement</th>
                </tr>
              </thead>
              <tbody>
                {data.subscriptions.details.by_status
                  .find(s => s.status === selectedSubSection)
                  ?.subscriptions.map((subscription, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-2 text-sm text-gray-900">{subscription.user_name}</td>
                      <td className="py-2 text-sm text-gray-900">{subscription.email}</td>
                      <td className="py-2 text-sm text-gray-900">{formatDate(subscription.trial_end_date)}</td>
                      <td className="py-2 text-sm text-gray-900">
                        {subscription.subscription_end ? formatDate(subscription.subscription_end) : '---'}
                      </td>
                      <td className="py-2">
                        {subscription.payment_status ? getStatusBadge(subscription.payment_status) : '---'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </DetailModal>
      )}

      {selectedSection === 'activity' && (
        <DetailModal
          title={
            selectedSubSection === 'today' ? 'Activité du jour' :
            selectedSubSection === 'week' ? 'Activité de la semaine' :
            'Activité du mois'
          }
          onClose={() => {
            setSelectedSection(null);
            setSelectedSubSection(null);
          }}
        >
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-4">Activités récentes</h4>
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500">Utilisateur</th>
                    <th className="text-left text-xs font-medium text-gray-500">Action</th>
                    <th className="text-left text-xs font-medium text-gray-500">Page</th>
                    <th className="text-left text-xs font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activity.details.recent.map((activity, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-2 text-sm text-gray-900">{activity.user_name}</td>
                      <td className="py-2 text-sm text-gray-900">{activity.action}</td>
                      <td className="py-2 text-sm text-gray-900">{activity.page || '---'}</td>
                      <td className="py-2 text-sm text-gray-900">{formatDate(activity.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-4">Activité par date</h4>
              <div className="space-y-4">
                {data.activity.details.by_date.map((day, index) => (
                  <div key={index} className="border-b pb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="font-medium text-gray-900">{formatDate(day.date)}</h5>
                      <span className="text-sm text-gray-500">{day.count} activités</span>
                    </div>
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="text-left text-xs font-medium text-gray-500">Utilisateur</th>
                          <th className="text-left text-xs font-medium text-gray-500">Action</th>
                          <th className="text-left text-xs font-medium text-gray-500">Page</th>
                          <th className="text-left text-xs font-medium text-gray-500">Heure</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.activities.map((activity, activityIndex) => (
                          <tr key={activityIndex} className="hover:bg-gray-50">
                            <td className="py-2 text-sm text-gray-900">{activity.user_name}</td>
                            <td className="py-2 text-sm text-gray-900">{activity.action}</td>
                            <td className="py-2 text-sm text-gray-900">{activity.page || '---'}</td>
                            <td className="py-2 text-sm text-gray-900">
                              {new Date(activity.created_at).toLocaleTimeString('fr-FR')}
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
    </div>
  );
}