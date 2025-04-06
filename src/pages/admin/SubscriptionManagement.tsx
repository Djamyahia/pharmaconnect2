import React, { useEffect, useState } from 'react';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { Search, CreditCard, Save, X } from 'lucide-react';
import type { User, UserSubscription } from '../../types/supabase';
import { sendOrderNotification } from '../../lib/notifications';

type ExtendedSubscription = UserSubscription & {
  user: User;
};

type EditingSubscription = {
  id: string;
  status: UserSubscription['status'];
  trial_end_date: string;
  subscription_start: string | null;
  subscription_end: string | null;
  payment_status: UserSubscription['payment_status'] | null;
  payment_reference: string | null;
  notes: string | null;
};

export function SubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState<ExtendedSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | UserSubscription['status']>('all');
  const [editingSubscription, setEditingSubscription] = useState<EditingSubscription | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSubscriptions();
  }, [searchQuery, statusFilter]);

  async function fetchSubscriptions() {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_subscriptions')
        .select(`
          *,
          user:users (
            id,
            email,
            company_name,
            role,
            wilaya
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let results = (data || []).filter(sub => sub.user && sub.user.role !== 'admin');

      if (statusFilter !== 'all') {
        results = results.filter(sub => sub.status === statusFilter);
      }

      if (searchQuery.trim() !== '') {
        const lower = searchQuery.toLowerCase();
        results = results.filter(sub =>
          sub.user?.company_name?.toLowerCase().includes(lower) ||
          sub.user?.email?.toLowerCase().includes(lower)
        );
      }

      setSubscriptions(results);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      setError('Erreur lors de la récupération des abonnements.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateSubscription(id: string) {
    if (!editingSubscription) return;

    try {
      const { error: updateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({
          status: editingSubscription.status,
          trial_end_date: editingSubscription.trial_end_date,
          subscription_start: editingSubscription.subscription_start,
          subscription_end: editingSubscription.subscription_end,
          payment_status: editingSubscription.payment_status,
          payment_reference: editingSubscription.payment_reference,
          notes: editingSubscription.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      const subscription = subscriptions.find(s => s.id === id);
      if (subscription && editingSubscription.payment_status === 'validated') {
        await sendOrderNotification(
          'payment_validated',
          subscription.user.email,
          {
            user_name: subscription.user.company_name,
            subscription_start: new Date(editingSubscription.subscription_start!).toLocaleDateString('fr-FR'),
            subscription_end: new Date(editingSubscription.subscription_end!).toLocaleDateString('fr-FR'),
            payment_reference: editingSubscription.payment_reference || ''
          }
        );
      }

      setSuccess('Abonnement mis à jour avec succès');
      setEditingSubscription(null);
      fetchSubscriptions();
    } catch (error) {
      console.error('Error updating subscription:', error);
      setError('Erreur lors de la mise à jour de l\'abonnement.');
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '---';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: UserSubscription['status']) => {
    const statusConfig = {
      trial: { color: 'bg-blue-100 text-blue-800', text: 'Essai' },
      active: { color: 'bg-green-100 text-green-800', text: 'Actif' },
      expired: { color: 'bg-red-100 text-red-800', text: 'Expiré' },
      pending_payment: { color: 'bg-yellow-100 text-yellow-800', text: 'Paiement en attente' }
    };

    const config = statusConfig[status];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: UserSubscription['payment_status']) => {
    if (!status) return null;

    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'En attente' },
      validated: { color: 'bg-green-100 text-green-800', text: 'Validé' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Rejeté' }
    };

    const config = statusConfig[status];
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Gestion des abonnements</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      {/* Barre de recherche */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Rechercher par nom d'entreprise ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="border rounded-md py-2 pl-3 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="trial">En essai</option>
            <option value="active">Actif</option>
            <option value="expired">Expiré</option>
            <option value="pending_payment">Paiement en attente</option>
          </select>
        </div>
      </div>

      {/* Liste des abonnements */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Période d'essai</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abonnement</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paiement</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {subscriptions.map((subscription) => (
              <tr key={subscription.id}>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{subscription.user.company_name}</div>
                  <div className="text-sm text-gray-500">{subscription.user.email}</div>
                  <div className="text-xs text-gray-500">
                    {subscription.user.role === 'pharmacist' ? 'Pharmacien' : 'Grossiste'} - {subscription.user.wilaya}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {editingSubscription?.id === subscription.id ? (
                    <select
                      value={editingSubscription.status}
                      onChange={(e) => setEditingSubscription({
                        ...editingSubscription,
                        status: e.target.value as UserSubscription['status']
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="trial">Essai</option>
                      <option value="active">Actif</option>
                      <option value="expired">Expiré</option>
                      <option value="pending_payment">Paiement en attente</option>
                    </select>
                  ) : (
                    getStatusBadge(subscription.status)
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingSubscription?.id === subscription.id ? (
                    <input
                      type="date"
                      value={editingSubscription.trial_end_date.split('T')[0]}
                      onChange={(e) => setEditingSubscription({
                        ...editingSubscription,
                        trial_end_date: e.target.value
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  ) : (
                    `Jusqu'au ${formatDate(subscription.trial_end_date)}`
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingSubscription?.id === subscription.id ? (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-500">Début</label>
                        <input
                          type="date"
                          value={editingSubscription.subscription_start?.split('T')[0] || ''}
                          onChange={(e) => setEditingSubscription({
                            ...editingSubscription,
                            subscription_start: e.target.value
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Fin</label>
                        <input
                          type="date"
                          value={editingSubscription.subscription_end?.split('T')[0] || ''}
                          onChange={(e) => setEditingSubscription({
                            ...editingSubscription,
                            subscription_end: e.target.value
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  ) : (
                    subscription.subscription_start ? (
                      <>
                        Du {formatDate(subscription.subscription_start)}<br />
                        au {formatDate(subscription.subscription_end)}
                      </>
                    ) : (
                      'Non défini'
                    )
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingSubscription?.id === subscription.id ? (
                    <div className="space-y-2">
                      <select
                        value={editingSubscription.payment_status || ''}
                        onChange={(e) => setEditingSubscription({
                          ...editingSubscription,
                          payment_status: e.target.value as UserSubscription['payment_status']
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      >
                        <option value="">Non défini</option>
                        <option value="pending">En attente</option>
                        <option value="validated">Validé</option>
                        <option value="rejected">Rejeté</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Référence de paiement"
                        value={editingSubscription.payment_reference || ''}
                        onChange={(e) => setEditingSubscription({
                          ...editingSubscription,
                          payment_reference: e.target.value
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <textarea
                        placeholder="Notes"
                        value={editingSubscription.notes || ''}
                        onChange={(e) => setEditingSubscription({
                          ...editingSubscription,
                          notes: e.target.value
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        rows={2}
                      />
                    </div>
                  ) : (
                    <>
                      {getPaymentStatusBadge(subscription.payment_status)}
                      {subscription.payment_reference && (
                        <div className="text-xs text-gray-500 mt-1">
                          Ref: {subscription.payment_reference}
                        </div>
                      )}
                      {subscription.notes && (
                        <div className="text-xs text-gray-500 mt-1">
                          Notes: {subscription.notes}
                        </div>
                      )}
                    </>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {editingSubscription?.id === subscription.id ? (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleUpdateSubscription(subscription.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Save className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingSubscription(null);
                          setError('');
                          setSuccess('');
                        }}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        setEditingSubscription({
                          id: subscription.id,
                          status: subscription.status,
                          trial_end_date: subscription.trial_end_date,
                          subscription_start: subscription.subscription_start,
                          subscription_end: subscription.subscription_end,
                          payment_status: subscription.payment_status,
                          payment_reference: subscription.payment_reference,
                          notes: subscription.notes
                        })
                      }
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <CreditCard className="h-5 w-5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {subscriptions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun abonnement ne correspond à vos critères.</p>
          </div>
        )}
      </div>
    </div>
  );
}