import React, { useEffect, useState } from 'react';
import { Calendar, Search, Filter, Loader2, Edit2, Trash2, Save, X, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Select from 'react-select';
import { customStyles, selectComponents } from '../../components/VirtualizedSelect';
import type { Medication, Promotion } from '../../types/supabase';

type ExtendedPromotion = Promotion & {
  medications: Medication;
  wholesaler: {
    company_name: string;
    wilaya: string;
  };
};

type EditingPromotion = {
  id: string;
  free_units_percentage: number;
  start_date: string;
  end_date: string;
};

export function Promotions() {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<ExtendedPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [availableMedications, setAvailableMedications] = useState<Medication[]>([]);
  const [error, setError] = useState<string>('');
  const [editingPromotion, setEditingPromotion] = useState<EditingPromotion | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWilaya, setSelectedWilaya] = useState('');
  const [newPromotion, setNewPromotion] = useState({
    medication_id: '',
    free_units_percentage: 0,
    start_date: '',
    end_date: '',
  });
  const [selectedMedication, setSelectedMedication] = useState<{
    id: string;
    commercial_name: string;
  } | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchPromotions();
      fetchAvailableMedications();
    }
  }, [user?.id]);

  async function fetchAvailableMedications() {
    try {
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('wholesaler_inventory')
        .select(`
          medication_id,
          medications (
            id,
            commercial_name,
            form,
            dosage,
            COND
          )
        `)
        .eq('wholesaler_id', user?.id);

      if (inventoryError) throw inventoryError;

      const medications = inventoryData
        .filter(item => item.medications)
        .map(item => ({
          ...item.medications
        }));

      setAvailableMedications(medications);
    } catch (error) {
      console.error('Error fetching medications:', error);
    }
  }

  async function fetchPromotions() {
    if (!user?.id) return;

    try {
      let query = supabase
        .from('active_promotions_view')
        .select(`
          *,
          medications (*),
          wholesaler:users!promotions_wholesaler_id_fkey (
            company_name,
            wilaya
          )
        `)
        .eq('wholesaler_id', user.id)
        .order('start_date', { ascending: true });

      if (searchQuery) {
        query = query.textSearch('medications.search_vector', searchQuery);
      }

      if (selectedWilaya) {
        query = query.eq('wholesaler.delivery_wilayas', selectedWilaya);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePromotion(id: string) {
    if (!editingPromotion) return;

    // Validate dates
    const startDate = new Date(editingPromotion.start_date);
    const endDate = new Date(editingPromotion.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for comparison

    if (startDate < today) {
      setError('La date de début ne peut pas être dans le passé');
      return;
    }

    if (endDate <= startDate) {
      setError('La date de fin doit être après la date de début');
      return;
    }

    if (editingPromotion.free_units_percentage <= 0 || editingPromotion.free_units_percentage > 100) {
      setError('Le pourcentage d\'unités gratuites doit être entre 0 et 100');
      return;
    }

    try {
      const { error } = await supabase
        .from('promotions')
        .update({
          free_units_percentage: editingPromotion.free_units_percentage,
          start_date: editingPromotion.start_date,
          end_date: editingPromotion.end_date
        })
        .eq('id', id);

      if (error) throw error;

      setEditingPromotion(null);
      fetchPromotions();
    } catch (error) {
      console.error('Error updating promotion:', error);
      setError('Failed to update promotion. Please try again.');
    }
  }

  async function handleDeletePromotion(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette promotion ?')) return;

    try {
      // First get the promotion to update the inventory flag
      const { data: promotion, error: getError } = await supabase
        .from('promotions')
        .select('medication_id')
        .eq('id', id)
        .single();

      if (getError) throw getError;

      // Delete the promotion
      const { error: deleteError } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Check if there are any other active promotions for this medication
      const { data: activePromotions, error: checkError } = await supabase
        .from('promotions')
        .select('id')
        .eq('medication_id', promotion.medication_id)
        .eq('wholesaler_id', user?.id)
        .gte('end_date', new Date().toISOString().split('T')[0]);

      if (checkError) throw checkError;

      // If no other active promotions, update the inventory flag
      if (activePromotions.length === 0) {
        const { error: updateError } = await supabase
          .from('wholesaler_inventory')
          .update({ has_active_promotion: false })
          .eq('medication_id', promotion.medication_id)
          .eq('wholesaler_id', user?.id);

        if (updateError) throw updateError;
      }

      fetchPromotions();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      setError('Failed to delete promotion. Please try again.');
    }
  }

  const handleAddPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedMedication) {
      setError('Please select a medication');
      return;
    }

    // Validate dates
    const startDate = new Date(newPromotion.start_date);
    const endDate = new Date(newPromotion.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for comparison

    if (startDate < today) {
      setError('La date de début ne peut pas être dans le passé');
      return;
    }

    if (endDate <= startDate) {
      setError('La date de fin doit être après la date de début');
      return;
    }

    if (newPromotion.free_units_percentage <= 0 || newPromotion.free_units_percentage > 100) {
      setError('Le pourcentage d\'unités gratuites doit être entre 0 et 100');
      return;
    }

    try {
      // First, update the inventory to reflect the promotion
      const { error: inventoryError } = await supabase
        .from('wholesaler_inventory')
        .update({
          has_active_promotion: true
        })
        .eq('wholesaler_id', user?.id)
        .eq('medication_id', selectedMedication.id);

      if (inventoryError) throw inventoryError;

      // Then create the promotion
      const { error: promotionError } = await supabase
        .from('promotions')
        .insert({
          medication_id: selectedMedication.id,
          wholesaler_id: user?.id,
          free_units_percentage: newPromotion.free_units_percentage,
          start_date: newPromotion.start_date,
          end_date: newPromotion.end_date
        });

      if (promotionError) throw promotionError;

      setShowAddForm(false);
      setSelectedMedication(null);
      setNewPromotion({
        medication_id: '',
        free_units_percentage: 0,
        start_date: '',
        end_date: '',
      });
      fetchPromotions();
    } catch (error) {
      console.error('Error adding promotion:', error);
      setError('Failed to add promotion. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isPromotionActive = (promotion: ExtendedPromotion) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to start of day for comparison
    
    const startDate = new Date(promotion.start_date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(promotion.end_date);
    endDate.setHours(23, 59, 59, 999); // Set to end of day
    
    return now >= startDate && now <= endDate;
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
        <h2 className="text-2xl font-semibold text-gray-900">Gestion des promotions</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouvelle promotion
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Rechercher des médicaments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {promotions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune promotion</h3>
          <p className="mt-1 text-sm text-gray-500">Créez une nouvelle promotion pour commencer.</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  Médicament
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">
                  Promotion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">
                  Période
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[8%]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {promotions.map((promotion) => {
                const isActive = isPromotionActive(promotion);
                
                return (
                  <tr key={promotion.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {promotion.medications.commercial_name}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {promotion.medications.form} - {promotion.medications.dosage}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {editingPromotion?.id === promotion.id ? (
                        <input
                          type="number"
                          min="0.01"
                          max="100"
                          step="0.01"
                          value={editingPromotion.free_units_percentage}
                          onChange={(e) => setEditingPromotion({
                            ...editingPromotion,
                            free_units_percentage: parseFloat(e.target.value)
                          })}
                          className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-900">
                          {promotion.free_units_percentage}% UG
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingPromotion?.id === promotion.id ? (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs text-gray-500">Début</label>
                            <input
                              type="date"
                              value={editingPromotion.start_date.split('T')[0]}
                              onChange={(e) => setEditingPromotion({
                                ...editingPromotion,
                                start_date: e.target.value
                              })}
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500">Fin</label>
                            <input
                              type="date"
                              value={editingPromotion.end_date.split('T')[0]}
                              onChange={(e) => setEditingPromotion({
                                ...editingPromotion,
                                end_date: e.target.value
                              })}
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>Du {formatDate(promotion.start_date)}</div>
                          <div>au {formatDate(promotion.end_date)}</div>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        isActive 
                          ? 'bg-green-100 text-green-800'
                          : new Date() < new Date(promotion.start_date)
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {isActive 
                          ? 'Active'
                          : new Date() < new Date(promotion.start_date)
                            ? 'À venir'
                            : 'Terminée'
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingPromotion?.id === promotion.id ? (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleUpdatePromotion(promotion.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Enregistrer"
                          >
                            <Save className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setEditingPromotion(null)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Annuler"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setEditingPromotion({
                              id: promotion.id,
                              free_units_percentage: promotion.free_units_percentage,
                              start_date: promotion.start_date.split('T')[0],
                              end_date: promotion.end_date.split('T')[0],
                            })}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Modifier"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeletePromotion(promotion.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Supprimer"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Promotion Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Créer une nouvelle promotion</h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setError('');
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleAddPromotion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Médicament
                </label>
                <Select
                  value={availableMedications.find(med => med.id === selectedMedication?.id)}
                  onChange={(selected) => selected && setSelectedMedication({
                    id: selected.id,
                    commercial_name: selected.commercial_name
                  })}
                  options={availableMedications}
                  getOptionLabel={(option) => 
                    `${option.commercial_name} - ${option.form} ${option.dosage}${option.COND ? ` (${option.COND})` : ''}`
                  }
                  getOptionValue={(option) => option.id}
                  className="mt-1"
                  styles={customStyles}
                  components={selectComponents}
                  placeholder="Sélectionner un médicament..."
                  isClearable
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Pourcentage d'unités gratuites (UG)
                </label>
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={newPromotion.free_units_percentage}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    setNewPromotion({ 
                      ...newPromotion, 
                      free_units_percentage: value
                    });
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date de début
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={newPromotion.start_date}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    setNewPromotion(prev => ({
                      ...prev,
                      start_date: newStartDate,
                      end_date: prev.end_date && new Date(prev.end_date) <= new Date(newStartDate) ? '' : prev.end_date
                    }));
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date de fin
                </label>
                <input
                  type="date"
                  min={newPromotion.start_date}
                  value={newPromotion.end_date}
                  onChange={(e) => setNewPromotion({ ...newPromotion, end_date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                  disabled={!newPromotion.start_date}
                />
                {!newPromotion.start_date && (
                  <p className="mt-1 text-sm text-gray-500">
                    Veuillez d'abord sélectionner une date de début
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setError('');
                  }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Créer la promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}