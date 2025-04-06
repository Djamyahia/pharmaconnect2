import React, { useEffect, useState } from 'react';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { Search, Filter, UserPlus, Edit2, Trash2, CheckCircle, XCircle, Save, X } from 'lucide-react';
import type { User, UserSubscription, AdminNote } from '../../types/supabase';

type ExtendedUser = User & {
  subscription?: UserSubscription;
  notes?: AdminNote[];
};

type EditingUser = {
  id: string;
  is_verified: boolean;
  is_admin: boolean;
};

export function UserManagement() {
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'pharmacist' | 'wholesaler'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [addingNote, setAddingNote] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, roleFilter, statusFilter]);

  async function fetchUsers() {
    try {
      let query = supabaseAdmin
        .from('users')
        .select(`
          *,
          subscription:user_subscriptions(
            status,
            trial_end_date,
            subscription_end,
            payment_status
          ),
          notes:admin_notes(
            id,
            note,
            created_at,
            created_by
          )
        `)
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`company_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('is_verified', statusFilter === 'verified');
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateUser(id: string) {
    if (!editingUser) return;

    try {
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          is_verified: editingUser.is_verified,
          is_admin: editingUser.is_admin
        })
        .eq('id', id);

      if (error) throw error;

      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Failed to update user. Please try again.');
    }
  }

  async function handleAddNote(userId: string) {
    if (!newNote.trim()) return;

    try {
      const { error } = await supabaseAdmin
        .from('admin_notes')
        .insert({
          user_id: userId,
          note: newNote.trim()
        });

      if (error) throw error;

      setAddingNote(null);
      setNewNote('');
      fetchUsers();
    } catch (error) {
      console.error('Error adding note:', error);
      setError('Failed to add note. Please try again.');
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

  const getSubscriptionStatus = (user: ExtendedUser) => {
    if (!user.subscription) {
      return <span className="text-gray-500">Pas d'abonnement</span>;
    }

    const subscription = Array.isArray(user.subscription) 
      ? user.subscription[0] 
      : user.subscription;

    if (!subscription) {
      return <span className="text-gray-500">Pas d'abonnement</span>;
    }

    const statusColors = {
      trial: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      pending_payment: 'bg-yellow-100 text-yellow-800'
    };

    const statusText = {
      trial: 'Essai',
      active: 'Actif',
      expired: 'Expiré',
      pending_payment: 'Paiement en attente'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[subscription.status]}`}>
        {statusText[subscription.status]}
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
        <h2 className="text-2xl font-semibold text-gray-900">Gestion des utilisateurs</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Search and Filter Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            className="border rounded-md py-2 pl-3 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Tous les rôles</option>
            <option value="pharmacist">Pharmaciens</option>
            <option value="wholesaler">Grossistes</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="border rounded-md py-2 pl-3 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="verified">Vérifiés</option>
            <option value="unverified">Non vérifiés</option>
          </select>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Utilisateur
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rôle
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Abonnement
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.company_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.email}
                      </div>
                      <div className="text-xs text-gray-500">
                        Inscrit le {formatDate(user.created_at)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.role === 'pharmacist'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role === 'pharmacist' ? 'Pharmacien' : 'Grossiste'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingUser?.id === user.id ? (
                    <select
                      value={editingUser.is_verified ? 'verified' : 'unverified'}
                      onChange={(e) => setEditingUser({
                        ...editingUser,
                        is_verified: e.target.value === 'verified'
                      })}
                      className="border rounded-md py-1 pl-2 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="verified">Vérifié</option>
                      <option value="unverified">Non vérifié</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_verified
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_verified ? 'Vérifié' : 'Non vérifié'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getSubscriptionStatus(user)}
                </td>
                <td className="px-6 py-4">
                  {addingNote === user.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Ajouter une note..."
                        className="w-full border rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        rows={2}
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setAddingNote(null);
                            setNewNote('');
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <X className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleAddNote(user.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Save className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {user.notes && Array.isArray(user.notes) && user.notes.map((note) => (
                        <div key={note.id} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {note.note}
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(note.created_at)}
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => setAddingNote(user.id)}
                        className="text-sm text-indigo-600 hover:text-indigo-900"
                      >
                        + Ajouter une note
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingUser?.id === user.id ? (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleUpdateUser(user.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Save className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setEditingUser(null)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingUser({
                        id: user.id,
                        is_verified: user.is_verified,
                        is_admin: user.is_admin
                      })}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun utilisateur ne correspond à vos critères.</p>
          </div>
        )}
      </div>
    </div>
  );
}