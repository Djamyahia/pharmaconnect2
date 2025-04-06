import React, { useEffect, useState } from 'react';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { Save, X } from 'lucide-react';
import type { AppConfig } from '../../types/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function AppSettings() {
  const { user } = useAuth();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    free_period_start: '',
    free_period_end: '',
    default_trial_duration: 30
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const { data, error } = await supabaseAdmin
        .from('app_config')
        .select('*')
        .single();

      if (error) throw error;

      setConfig(data);
      setFormData({
        free_period_start: data.free_period_start ? new Date(data.free_period_start).toISOString().split('T')[0] : '',
        free_period_end: data.free_period_end ? new Date(data.free_period_end).toISOString().split('T')[0] : '',
        default_trial_duration: data.default_trial_duration
      });
    } catch (error) {
      console.error('Error fetching app config:', error);
      setError('Erreur lors de la récupération des paramètres.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const { error } = await supabaseAdmin
        .from('app_config')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('id', config?.id);

      if (error) throw error;

      setSuccess('Paramètres mis à jour avec succès.');
      setEditing(false);
      fetchConfig();
    } catch (error) {
      console.error('Error updating app config:', error);
      setError('Erreur lors de la mise à jour des paramètres.');
    }
  }

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
        <h2 className="text-2xl font-semibold text-gray-900">Paramètres de l'application</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Modifier les paramètres
          </button>
        )}
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

      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Début de la période gratuite
                  </label>
                  <input
                    type="date"
                    value={formData.free_period_start}
                    onChange={(e) => setFormData({ ...formData, free_period_start: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Fin de la période gratuite
                  </label>
                  <input
                    type="date"
                    value={formData.free_period_end}
                    onChange={(e) => setFormData({ ...formData, free_period_end: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Durée d'essai par défaut (jours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.default_trial_duration}
                    onChange={(e) => setFormData({ ...formData, default_trial_duration: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  <X className="h-5 w-5" />
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  <Save className="h-5 w-5" />
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Période gratuite</h3>
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-gray-500">
                      Début : {config?.free_period_start ? new Date(config.free_period_start).toLocaleDateString('fr-FR') : 'Non défini'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Fin : {config?.free_period_end ? new Date(config.free_period_end).toLocaleDateString('fr-FR') : 'Non défini'}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900">Période d'essai</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Durée par défaut : {config?.default_trial_duration} jours
                  </p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900">Dernière mise à jour</h3>
                <p className="mt-2 text-sm text-gray-500">
                  {config?.updated_at ? new Date(config.updated_at).toLocaleString('fr-FR') : 'Jamais'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}