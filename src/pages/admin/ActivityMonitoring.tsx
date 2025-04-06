import React, { useEffect, useState } from 'react';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { Search, User, Activity as ActivityIcon, Calendar } from 'lucide-react';
import type { User as UserType, UserActivityLog } from '../../types/supabase';

type ExtendedActivityLog = UserActivityLog & {
  user: Pick<UserType, 'id' | 'email' | 'company_name' | 'role'>;
};

export function ActivityMonitoring() {
  const [activities, setActivities] = useState<ExtendedActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActivities();
  }, [searchQuery, actionFilter, dateFilter]);

  async function fetchActivities() {
    try {
      let query = supabaseAdmin
        .from('user_activity_logs')
        .select(`
          *,
          user:users (
            id,
            email,
            company_name,
            role
          )
        `)
        .order('created_at', { ascending: false });

      // Date filter
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (dateFilter === 'today') {
        query = query.gte('created_at', today.toISOString());
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      // Action filter
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = data || [];
      if (searchQuery) {
        results = results.filter((log) =>
          log.user?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setActivities(results);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      setError('Erreur lors du chargement des activités.');
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
        return <User className="h-5 w-5 text-blue-500" />;
      case 'order_placed':
        return <ActivityIcon className="h-5 w-5 text-green-500" />;
      case 'order_updated':
        return <ActivityIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ActivityIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  if (loading) return <div className="p-6 text-center">Chargement...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Surveillance de l'activité</h2>

      {error && <div className="text-red-600 bg-red-50 p-2 rounded">{error}</div>}

      {/* Filters */}
      <div className="bg-white shadow rounded p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Recherche utilisateur..."
              className="pl-10 pr-4 py-2 border rounded w-full"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border rounded py-2 px-3"
          >
            <option value="all">Toutes les actions</option>
            <option value="login">Connexion</option>
            <option value="order_placed">Commande passée</option>
            <option value="order_updated">Commande modifiée</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="border rounded py-2 px-3"
          >
            <option value="all">Toute la période</option>
            <option value="today">Aujourd'hui</option>
            <option value="week">7 derniers jours</option>
            <option value="month">30 derniers jours</option>
          </select>
        </div>

        <div className="divide-y divide-gray-100">
          {activities.map((activity) => (
            <div key={activity.id} className="py-3 px-2 hover:bg-gray-50 flex gap-4">
              <div className="flex-shrink-0">{getActionIcon(activity.action)}</div>
              <div className="flex-grow">
                <div className="font-medium text-gray-900">{activity.user.company_name}</div>
                <div className="text-sm text-gray-600">{activity.user.email}</div>
                <div className="text-sm text-gray-500 mt-1">
                  Action : <strong>{activity.action}</strong> — Page : {activity.page || '---'}
                </div>
                <div className="text-sm text-gray-400 flex items-center mt-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(activity.created_at)}
                </div>
              </div>
            </div>
          ))}

          {activities.length === 0 && (
            <div className="text-center py-8 text-gray-500">Aucune activité à afficher.</div>
          )}
        </div>
      </div>
    </div>
  );
}
