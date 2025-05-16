import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Minus, Save, ArrowLeft, Loader2, Calendar, AlertTriangle } from 'lucide-react';
import Select from 'react-select';
import { customStyles, selectComponents } from '../../components/VirtualizedSelect';
import type { Medication } from '../../types/supabase';
import { algerianWilayas } from '../../lib/wilayas';
import AsyncSelect from 'react-select/async';

type TenderItem = {
  medication_id: string;
  medication_name?: string;
  quantity: number;
};

export function CreateTender() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [wilaya, setWilaya] = useState(user?.wilaya || '');
  const [isPublic, setIsPublic] = useState(true);
  const [items, setItems] = useState<TenderItem[]>([{ medication_id: '', quantity: 1 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  

  const handleAddItem = () => {
    setItems([...items, { medication_id: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (
    index: number,
    field: 'medication' | 'quantity',
    value: Medication | number | null
  ) => {
    const newItems = [...items];
    
    if (field === 'medication') {
      const med = value as Medication | null;
      newItems[index] = {
        ...newItems[index],
        medication_id: med?.id || '',
        medication_name: med?.commercial_name || ''
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        quantity: value as number
      };
    }
  
  setItems(newItems);
};


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }
    
    if (!deadline) {
      setError('La date limite est requise');
      return;
    }
    
    const deadlineDate = new Date(deadline);
    const now = new Date();
    
    if (deadlineDate <= now) {
      setError('La date limite doit être dans le futur');
      return;
    }
    
    if (!wilaya) {
      setError('La wilaya est requise');
      return;
    }
    
    if (items.length === 0) {
      setError('Vous devez ajouter au moins un produit');
      return;
    }
    
    for (const item of items) {
      if (!item.medication_id) {
        setError('Tous les produits doivent être sélectionnés');
        return;
      }
      
      if (item.quantity <= 0) {
        setError('Les quantités doivent être supérieures à 0');
        return;
      }
    }
    
    // Check for duplicate medications
    const medicationIds = items.map(item => item.medication_id);
    const uniqueMedicationIds = new Set(medicationIds);
    
    if (uniqueMedicationIds.size !== medicationIds.length) {
      setError('Vous avez ajouté le même médicament plusieurs fois');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create tender
      const { data: tender, error: tenderError } = await supabase
        .from('tenders')
        .insert({
          pharmacist_id: user?.id,
          title,
          deadline,
          wilaya,
          is_public: isPublic,
          status: 'open'
        })
        .select('id')
        .single();
      
      if (tenderError) throw tenderError;
      
      if (!tender) {
        throw new Error('No tender data returned after creation');
      }
      
      // Create tender items
      const tenderItems = items.map(item => ({
        tender_id: tender.id,
        medication_id: item.medication_id,
        quantity: item.quantity
      }));
      
      const { error: itemsError } = await supabase
        .from('tender_items')
        .insert(tenderItems);
      
      if (itemsError) throw itemsError;
      
      // Redirect to tender detail page
      navigate(`/pharmacist/tenders/${tender.id}`);
    } catch (error) {
      console.error('Error creating tender:', error);
      setError('Erreur lors de la création de l\'appel d\'offres');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <button
          onClick={() => navigate('/pharmacist/tenders')}
          className="mr-4 text-indigo-600 hover:text-indigo-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-2xl font-semibold text-gray-900">Créer un appel d'offres</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
        <div className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Titre de l'appel d'offres <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Ex: Besoin de médicaments pour le mois de juin"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
                Date limite de réponse <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="datetime-local"
                  id="deadline"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  min={new Date().toISOString().slice(0, 16)}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="wilaya" className="block text-sm font-medium text-gray-700">
                Wilaya de livraison <span className="text-red-500">*</span>
              </label>
              <Select
                id="wilaya"
                value={algerianWilayas.find(w => w.value === wilaya)}
                onChange={(selected) => setWilaya(selected?.value || '')}
                options={algerianWilayas}
                className="mt-1"
                styles={customStyles}
                components={selectComponents}
                placeholder="Sélectionnez votre wilaya"
                isDisabled={true} // Wilaya is pre-filled from user profile and not editable
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                La wilaya est automatiquement remplie à partir de votre profil.
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Visibilité <span className="text-red-500">*</span>
              </label>
            </div>
            <div className="mt-2 space-y-2">
              <div className="flex items-center">
                <input
                  id="public"
                  name="visibility"
                  type="radio"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <label htmlFor="public" className="ml-2 block text-sm text-gray-700">
                  Public (visible par tous les grossistes)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="private"
                  name="visibility"
                  type="radio"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <label htmlFor="private" className="ml-2 block text-sm text-gray-700">
                  Privé (visible uniquement par les grossistes connectés)
                </label>
              </div>
            </div>
          </div>

          <div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Produits demandés</h3>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col md:flex-row gap-4 p-4 bg-gray-50 rounded-lg"
                  >
                    {/* Champ de sélection du médicament */}
                    <div className="flex-grow">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Médicament <span className="text-red-500">*</span>
                      </label>
                      <AsyncSelect<Medication>
                        cacheOptions
                        defaultOptions
                        loadOptions={async (inputValue: string) => {
                          const { data, error } = await supabase
                            .from('medications')
                            .select('id, commercial_name, form, dosage')
                            .ilike('commercial_name', `%${inputValue}%`)
                            .order('commercial_name', { ascending: true })
                            .limit(100);
                          if (error) console.error(error);
                          return data || [];
                        }}
                        getOptionLabel={opt =>
                          `${opt.commercial_name} – ${opt.form} ${opt.dosage}`
                        }
                        getOptionValue={opt => opt.id}
                        onChange={sel => handleItemChange(index, 'medication', sel)}
                        styles={customStyles}
                        placeholder="Tapez pour rechercher…"
                        isClearable
                        required
                      />
                    </div>
            
                    {/* Quantité */}
                    <div className="w-full md:w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantité <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                      />
                    </div>
            
                    {/* Bouton supprimer la ligne */}
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length === 1}
                        className="p-2 text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
            
                {/* Bouton Ajouter un produit placé sous toutes les lignes */}
                <div className="flex justify-center mt-2">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter un produit
                  </button>
                </div>
              </div>
            </div>

            

           
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/pharmacist/tenders')}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            >
              {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
              Publier l'appel d'offres
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}