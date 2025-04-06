import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Lock, MapPin, Phone, Building2, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Select from 'react-select';
import { customStyles, selectComponents } from '../../components/VirtualizedSelect';
import { algerianWilayas } from '../../lib/wilayas';

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
      const { error } = await supabase
        .from('users')
        .update(formData)
        .eq('id', user?.id);

      if (error) throw error;

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
              )}

              {isEditing && (
                <div className="flex justify-end space-x-3">
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