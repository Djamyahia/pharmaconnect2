import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Lock, MapPin, Phone, Building2, FileText, Truck, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Select from 'react-select';
import { customStyles, selectComponents } from '../../components/VirtualizedSelect';
import { algerianWilayas } from '../../lib/wilayas';
import { getRegions } from '../../lib/regions';
import type { Region, RegionWithDeliveryDays } from '../../types/supabase';

const weekDays = [
  { value: 'monday', label: 'Lundi' },
  { value: 'tuesday', label: 'Mardi' },
  { value: 'wednesday', label: 'Mercredi' },
  { value: 'thursday', label: 'Jeudi' },
  { value: 'friday', label: 'Vendredi' },
  { value: 'saturday', label: 'Samedi' },
  { value: 'sunday', label: 'Dimanche' }
];

export function Profile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    company_name: user?.company_name || '',
    address: user?.address || '',
    wilaya: user?.wilaya || '',
    phone: user?.phone || '',
    delivery_wilayas: user?.delivery_wilayas || [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [deliveryDaysConfig, setDeliveryDaysConfig] = useState<Record<string, string[]>>({});
  const [loadingRegions, setLoadingRegions] = useState(false);

  useEffect(() => {
    if (user?.role === 'wholesaler') {
      fetchRegions();
      fetchDeliveryDaysConfig();
    }
  }, [user?.role]);

  async function fetchRegions() {
    setLoadingRegions(true);
    try {
      const regionsData = await getRegions();
      setRegions(regionsData);
    } catch (error) {
      console.error('Error fetching regions:', error);
    } finally {
      setLoadingRegions(false);
    }
  }

  async function fetchDeliveryDaysConfig() {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('wholesaler_delivery_days')
        .select('*')
        .eq('wholesaler_id', user.id);

      if (error) throw error;

      const config: Record<string, string[]> = {};
      (data || []).forEach(item => {
        config[item.region_id] = item.delivery_days;
      });

      setDeliveryDaysConfig(config);
    } catch (error) {
      console.error('Error fetching delivery days config:', error);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDeliveryWilayasChange = (selectedOptions: { value: string; label: string }[]) => {
    setFormData(prev => ({
      ...prev,
      delivery_wilayas: selectedOptions.map(option => option.value)
    }));
  };

  const handleDeliveryDaysChange = (regionId: string, selectedDays: string[]) => {
    setDeliveryDaysConfig(prev => ({
      ...prev,
      [regionId]: selectedDays
    }));
  };

  const selectAllWilayas = () => {
    setFormData(prev => ({
      ...prev,
      delivery_wilayas: algerianWilayas.map(w => w.value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Update user profile
      const { error: userError } = await supabase
        .from('users')
        .update(formData)
        .eq('id', user?.id);

      if (userError) throw userError;

      // Update delivery days configuration if wholesaler
      if (user?.role === 'wholesaler') {
        // First, delete existing configurations
        const { error: deleteError } = await supabase
          .from('wholesaler_delivery_days')
          .delete()
          .eq('wholesaler_id', user?.id);

        if (deleteError) throw deleteError;

        // Then, insert new configurations
        const deliveryDaysToInsert = Object.entries(deliveryDaysConfig)
          .filter(([_, days]) => days.length > 0)
          .map(([regionId, days]) => ({
            wholesaler_id: user?.id,
            region_id: regionId,
            delivery_days: days
          }));

        if (deliveryDaysToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('wholesaler_delivery_days')
            .insert(deliveryDaysToInsert);

          if (insertError) throw insertError;
        }
      }

      setSuccess('Profil mis à jour avec succès');
      setIsEditing(false);
    } catch (err) {
      setError('Échec de la mise à jour du profil. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Paramètres du profil</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Modifier le profil
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md">
              {success}
            </div>
          )}

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informations de base</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Rôle</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {user?.role === 'pharmacist' ? 'Pharmacien' : 'Grossiste'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Information */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Informations de l'entreprise</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div className="flex items-start space-x-3">
                    <Building2 className="h-5 w-5 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <label className="block text-sm text-gray-500">Nom de l'entreprise</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="company_name"
                          value={formData.company_name}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          required
                        />
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{user?.company_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <FileText className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Numéro d'enregistrement</p>
                      <p className="text-sm font-medium text-gray-900">{user?.registration_number}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Informations de contact</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <label className="block text-sm text-gray-500">Adresse</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          required
                        />
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{user?.address}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <label className="block text-sm text-gray-500">Wilaya</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="wilaya"
                          value={formData.wilaya}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          required
                        />
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{user?.wilaya}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Phone className="h-5 w-5 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <label className="block text-sm text-gray-500">Numéro de téléphone</label>
                      {isEditing ? (
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          required
                        />
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{user?.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {user?.role === 'wholesaler' && (
                <>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Zones de livraison</h3>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm text-gray-500">Wilayas de livraison</label>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={selectAllWilayas}
                            className="text-sm text-indigo-600 hover:text-indigo-500"
                          >
                            Sélectionner tout
                          </button>
                        )}
                      </div>
                      {isEditing ? (
                        <Select
                          isMulti
                          value={algerianWilayas.filter(w => formData.delivery_wilayas?.includes(w.value))}
                          onChange={handleDeliveryWilayasChange}
                          options={algerianWilayas}
                          className="mt-1"
                          styles={customStyles}
                          components={selectComponents}
                          placeholder="Sélectionnez les wilayas de livraison"
                        />
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {formData.delivery_wilayas?.map((wilaya) => (
                            <span
                              key={wilaya}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                            >
                              {algerianWilayas.find(w => w.value === wilaya)?.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      <div className="flex items-center">
                        <Truck className="h-5 w-5 mr-2 text-indigo-500" />
                        Jours de livraison par région
                      </div>
                    </h3>
                    
                    {loadingRegions ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500">Chargement des régions...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {regions.map(region => (
                          <div key={region.id} className="border rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-2">{region.name}</h4>
                            <p className="text-sm text-gray-500 mb-2">
                              Wilayas : {region.wilayas.join(', ')}
                            </p>
                            
                            {isEditing ? (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Jours de livraison
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                  {weekDays.map(day => (
                                    <label key={day.value} className="inline-flex items-center">
                                      <input
                                        type="checkbox"
                                        checked={deliveryDaysConfig[region.id]?.includes(day.value) || false}
                                        onChange={(e) => {
                                          const currentDays = deliveryDaysConfig[region.id] || [];
                                          const newDays = e.target.checked
                                            ? [...currentDays, day.value]
                                            : currentDays.filter(d => d !== day.value);
                                          handleDeliveryDaysChange(region.id, newDays);
                                        }}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                      />
                                      <span className="ml-2 text-sm text-gray-700">{day.label}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm font-medium text-gray-700">Jours de livraison :</p>
                                {deliveryDaysConfig[region.id]?.length ? (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {deliveryDaysConfig[region.id].map(day => (
                                      <span
                                        key={day}
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                                      >
                                        {weekDays.find(d => d.value === day)?.label || day}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 mt-1">Aucun jour configuré (région non desservie)</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {isEditing && (
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        company_name: user?.company_name || '',
                        address: user?.address || '',
                        wilaya: user?.wilaya || '',
                        phone: user?.phone || '',
                        delivery_wilayas: user?.delivery_wilayas || [],
                      });
                      fetchDeliveryDaysConfig();
                    }}
                    className="px-4 py-2 border rounded-md hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}