import React, { useEffect, useState } from 'react';
import { Plus, Search, Loader2, Edit2, Trash2, Save, X, Calendar, Tag, Package, AlertCircle, Eye, EyeOff, Share2, CheckCircle, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Select from 'react-select';
import { customStyles, selectComponents } from '../../components/VirtualizedSelect';
import type { Medication, PromotionalOffer, OfferProduct } from '../../types/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';

type OfferFormData = {
  id?: string;
  name: string;
  type: 'pack' | 'threshold';
  min_purchase_amount: number | null;
  is_public: boolean;
  start_date: string;
  end_date: string;
  custom_total_price: number | null;
  products: {
    id?: string;
    medication_id: string;
    medication_name?: string;
    quantity: number;
    price: number;
    is_priority: boolean;
    priority_message: string;
  }[];
};

type OfferModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OfferFormData) => Promise<void>;
  initialData?: OfferFormData;
  title: string;
};

function OfferModal({ isOpen, onClose, onSubmit, initialData, title }: OfferModalProps) {
  const [formData, setFormData] = useState<OfferFormData>({
    name: '',
    type: 'pack',
    min_purchase_amount: null,
    is_public: false,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    custom_total_price: null,
    products: []
  });
  const [availableMedications, setAvailableMedications] = useState<(Medication & { price: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      fetchAvailableMedications();
      if (initialData) {
        setFormData(initialData);
        
        // Calculate total price from products
        const calculatedTotal = initialData.products
          .filter(p => !p.is_priority)
          .reduce((sum, product) => sum + (product.price * product.quantity), 0);
        
        setTotalPrice(calculatedTotal);
      } else {
        // Reset form for new offer
        setFormData({
          name: '',
          type: 'pack',
          min_purchase_amount: null,
          is_public: false,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          custom_total_price: null,
          products: []
        });
        setTotalPrice(0);
      }
    }
  }, [isOpen, initialData]);

  // Calculate total price whenever products change
  useEffect(() => {
    const calculatedTotal = formData.products
      .filter(p => !p.is_priority)
      .reduce((sum, product) => sum + (product.price * product.quantity), 0);
    
    setTotalPrice(calculatedTotal);
  }, [formData.products]);

  async function fetchAvailableMedications() {
    try {
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('wholesaler_inventory')
        .select(`
          medication_id,
          price,
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
          ...item.medications,
          price: item.price
        }));

      setAvailableMedications(medications);
    } catch (error) {
      console.error('Error fetching medications:', error);
      setError('Erreur lors de la récupération des médicaments');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Le nom de l\'offre est requis');
      return;
    }

    if (formData.type === 'threshold' && (!formData.min_purchase_amount || formData.min_purchase_amount <= 0)) {
      setError('Le montant minimum d\'achat doit être supérieur à 0');
      return;
    }

    if (formData.products.length === 0) {
      setError('Vous devez ajouter au moins un produit à l\'offre');
      return;
    }

    if (!formData.products.some(p => p.is_priority)) {
      setError('Vous devez marquer au moins un produit comme prioritaire');
      return;
    }

    // Check for duplicate medications
    const medicationIds = formData.products.map(p => p.medication_id);
    const uniqueMedicationIds = new Set(medicationIds);
    if (uniqueMedicationIds.size !== medicationIds.length) {
      setError('Vous avez ajouté le même médicament plusieurs fois. Veuillez supprimer les doublons.');
      return;
    }

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      setError('La date de début ne peut pas être dans le passé');
      return;
    }

    if (endDate <= startDate) {
      setError('La date de fin doit être après la date de début');
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting offer:', error);
      setError('Erreur lors de la soumission de l\'offre');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    setFormData({
      ...formData,
      products: [
        ...formData.products,
        {
          medication_id: '',
          quantity: 1,
          price: 0,
          is_priority: false,
          priority_message: 'Produit disponible en priorité dans le cadre de cette opération'
        }
      ]
    });
  };

  const handleRemoveProduct = (index: number) => {
    const newProducts = [...formData.products];
    newProducts.splice(index, 1);
    setFormData({
      ...formData,
      products: newProducts
    });
  };

  const handleProductChange = (index: number, field: string, value: any) => {
    const newProducts = [...formData.products];
    
    if (field === 'medication_id' && typeof value === 'string') {
      // Check if this medication is already in the list
      const isDuplicate = formData.products.some((p, i) => i !== index && p.medication_id === value);
      
      if (isDuplicate) {
        setError('Ce médicament est déjà dans la liste. Veuillez en choisir un autre.');
        return;
      }
      
      const medication = availableMedications.find(m => m.id === value);
      newProducts[index] = {
        ...newProducts[index],
        [field]: value,
        medication_name: medication?.commercial_name,
        price: medication?.price || 0 // Set default price from inventory
      };
    } else {
      newProducts[index] = {
        ...newProducts[index],
        [field]: value
      };
    }
    
    setFormData({
      ...formData,
      products: newProducts
    });
  };

  // Filter out medications that are already selected
  const getAvailableMedicationsForProduct = (currentIndex: number) => {
    const selectedMedicationIds = formData.products
      .filter((_, i) => i !== currentIndex)
      .map(p => p.medication_id);
    
    return availableMedications.filter(med => !selectedMedicationIds.includes(med.id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nom de l'offre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type d'offre <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'pack' | 'threshold' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              >
                <option value="pack">Pack groupé</option>
                <option value="threshold">Offre sur achats libres</option>
              </select>
            </div>

            {formData.type === 'threshold' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Montant minimum d'achat (DZD) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.min_purchase_amount || ''}
                  onChange={(e) => setFormData({ ...formData, min_purchase_amount: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required={formData.type === 'threshold'}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Visibilité <span className="text-red-500">*</span>
              </label>
              <div className="mt-2 space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="visibility"
                    checked={formData.is_public}
                    onChange={() => setFormData({ ...formData, is_public: true })}
                    className="form-radio h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Publique (visible par tous)</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="visibility"
                    checked={!formData.is_public}
                    onChange={() => setFormData({ ...formData, is_public: false })}
                    className="form-radio h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Privée (utilisateurs connectés uniquement)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date de début <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date de fin <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-medium text-gray-900">Produits de l'offre</h4>
              <button
                type="button"
                onClick={handleAddProduct}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter un produit
              </button>
            </div>

            {formData.products.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun produit</h3>
                <p className="mt-1 text-sm text-gray-500">Commencez par ajouter un produit à votre offre.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.products.map((product, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-4">
                      <h5 className="text-sm font-medium text-gray-900">
                        Produit {index + 1}
                        {product.is_priority && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Prioritaire
                          </span>
                        )}
                      </h5>
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Médicament <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={getAvailableMedicationsForProduct(index).find(med => med.id === product.medication_id)}
                          onChange={(selected) => handleProductChange(index, 'medication_id', selected?.id || '')}
                          options={getAvailableMedicationsForProduct(index)}
                          getOptionLabel={(option) => 
                            `${option.commercial_name} - ${option.form} ${option.dosage}${option.COND ? ` (${option.COND})` : ''} - ${option.price.toFixed(2)} DZD`
                          }
                          getOptionValue={(option) => option.id}
                          className="mt-1"
                          styles={customStyles}
                          components={selectComponents}
                          placeholder="Sélectionner un médicament..."
                          isClearable
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Quantité <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={product.quantity}
                          onChange={(e) => handleProductChange(index, 'quantity', parseInt(e.target.value))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Prix (DZD) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={product.price}
                          onChange={(e) => handleProductChange(index, 'price', parseFloat(e.target.value))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          required
                        />
                      </div>

                      <div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`priority-${index}`}
                            checked={product.is_priority}
                            onChange={(e) => handleProductChange(index, 'is_priority', e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`priority-${index}`} className="ml-2 block text-sm text-gray-700">
                            Produit à disponibilité prioritaire
                          </label>
                        </div>
                      </div>

                      {product.is_priority && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Message de priorité
                          </label>
                          <textarea
                            value={product.priority_message}
                            onChange={(e) => handleProductChange(index, 'priority_message', e.target.value)}
                            rows={2}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            placeholder="Ex: Produit disponible en priorité dans le cadre de cette opération"
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Add product button after each product */}
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddProduct}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter un produit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {formData.type === 'pack' && formData.products.length > 0 && (
            <div className="border-t pt-6">
              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium text-gray-900">Prix total du pack</h4>
                  <span className="text-lg font-bold text-gray-900">{totalPrice?.toFixed(2)} DZD</span>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Appliquer un prix personnalisé (optionnel)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.custom_total_price !== null ? formData.custom_total_price : ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseFloat(e.target.value);
                        setFormData({
                          ...formData,
                          custom_total_price: value
                        });
                      }}
                      placeholder="Prix personnalisé"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        custom_total_price: null
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Réinitialiser
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Laissez vide pour utiliser le prix calculé automatiquement à partir des produits.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
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
              {initialData ? 'Mettre à jour' : 'Créer l\'offre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ShareOfferModal({ offerId, onClose }: { offerId: string, onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const offerUrl = `${window.location.origin}/offers/${offerId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(offerUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Partager cette offre</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Partagez cette offre avec vos clients ou collègues :
          </p>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={offerUrl}
              readOnly
              className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50"
            />
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Copié
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-1" />
                  Copier
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export function PromotionalOffers() {
  const { user } = useAuth();
  const [allOffers, setAllOffers] = useState<(PromotionalOffer & { products: OfferProduct[] })[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<(PromotionalOffer & { products: OfferProduct[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferFormData | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchOffers();
    }
  }, [user?.id]);

  useEffect(() => {
    // Filter offers client-side when search query changes
    filterOffers();
  }, [searchQuery, allOffers]);

  async function fetchOffers() {
    try {
      const { data, error } = await supabase
        .from('promotional_offers')
        .select(`
          *,
          products:offer_products (
            id,
            medication_id,
            quantity,
            price,
            is_priority,
            priority_message,
            medications:medications (
              id,
              commercial_name,
              form,
              dosage
            )
          )
        `)
        .eq('wholesaler_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setAllOffers(data || []);
      setFilteredOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
      setError('Erreur lors de la récupération des offres');
    } finally {
      setLoading(false);
    }
  }

  function filterOffers() {
    if (!allOffers.length) return;
    
    if (!searchQuery.trim()) {
      setFilteredOffers(allOffers);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = allOffers.filter(offer => {
      // Check if offer name matches
      if (offer.name.toLowerCase().includes(query)) return true;
      
      // Check if any product name matches
      return offer.products.some(product => 
        product.medications?.commercial_name?.toLowerCase().includes(query)
      );
    });
    
    setFilteredOffers(filtered);
  }

  async function handleCreateOffer(data: OfferFormData) {
    try {
      // First, create the offer
      const { data: offerData, error: offerError } = await supabase
        .from('promotional_offers')
        .insert({
          wholesaler_id: user?.id,
          name: data.name,
          type: data.type,
          min_purchase_amount: data.type === 'threshold' ? data.min_purchase_amount : null,
          is_public: data.is_public,
          start_date: data.start_date,
          end_date: data.end_date,
          custom_total_price: data.custom_total_price
        })
        .select()
        .single();

      if (offerError) throw offerError;

      // Then, create the products
      const productsToInsert = data.products.map(product => ({
        offer_id: offerData.id,
        medication_id: product.medication_id,
        quantity: product.quantity,
        price: product.price,
        is_priority: product.is_priority,
        priority_message: product.priority_message || 'Produit disponible en priorité dans le cadre de cette opération'
      }));

      const { error: productsError } = await supabase
        .from('offer_products')
        .insert(productsToInsert);

      if (productsError) throw productsError;

      fetchOffers();
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  async function handleUpdateOffer(data: OfferFormData) {
    if (!data.id) return;

    try {
      // Update the offer
      const { error: offerError } = await supabase
        .from('promotional_offers')
        .update({
          name: data.name,
          type: data.type,
          min_purchase_amount: data.type === 'threshold' ? data.min_purchase_amount : null,
          is_public: data.is_public,
          start_date: data.start_date,
          end_date: data.end_date,
          custom_total_price: data.custom_total_price
        })
        .eq('id', data.id);

      if (offerError) throw offerError;

      // Delete existing products
      const { error: deleteError } = await supabase
        .from('offer_products')
        .delete()
        .eq('offer_id', data.id);

      if (deleteError) throw deleteError;

      // Insert new products
      const productsToInsert = data.products.map(product => ({
        offer_id: data.id,
        medication_id: product.medication_id,
        quantity: product.quantity,
        price: product.price,
        is_priority: product.is_priority,
        priority_message: product.priority_message || 'Produit disponible en priorité dans le cadre de cette opération'
      }));

      const { error: productsError } = await supabase
        .from('offer_products')
        .insert(productsToInsert);

      if (productsError) throw productsError;

      fetchOffers();
    } catch (error) {
      console.error('Error updating offer:', error);
      throw error;
    }
  }

  async function handleDeleteOffer(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette offre ?')) return;

    try {
      const { error } = await supabase
        .from('promotional_offers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchOffers();
    } catch (error) {
      console.error('Error deleting offer:', error);
      setError('Erreur lors de la suppression de l\'offre');
    }
  }

  const handleEditOffer = (offer: any) => {
    const formattedOffer: OfferFormData = {
      id: offer.id,
      name: offer.name,
      type: offer.type,
      min_purchase_amount: offer.min_purchase_amount,
      is_public: offer.is_public,
      start_date: new Date(offer.start_date).toISOString().split('T')[0],
      end_date: new Date(offer.end_date).toISOString().split('T')[0],
      custom_total_price: offer.custom_total_price,
      products: offer.products.map((product: any) => ({
        id: product.id,
        medication_id: product.medication_id,
        medication_name: product.medications?.commercial_name,
        quantity: product.quantity,
        price: product.price,
        is_priority: product.is_priority,
        priority_message: product.priority_message || 'Produit disponible en priorité dans le cadre de cette opération'
      }))
    };

    setEditingOffer(formattedOffer);
    setShowModal(true);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };

  const isOfferActive = (offer: PromotionalOffer) => {
    const now = new Date();
    const startDate = new Date(offer.start_date);
    const endDate = new Date(offer.end_date);
    return now >= startDate && now <= endDate;
  };

  // Calculate total price for a pack offer
  const calculatePackTotal = (offer: any) => {
    // If there's a custom total price, use that
    if (offer.custom_total_price !== null && offer.custom_total_price !== undefined) {
      return offer.custom_total_price;
    }
    
    // Otherwise calculate from products
    if (!offer.products || !Array.isArray(offer.products)) return 0;
    
    return offer.products
      .filter((p: any) => !p.is_priority)
      .reduce((sum: number, product: any) => sum + (product.price * product.quantity), 0);
  };

  const handleShareOffer = (offerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShareModalOpen(offerId);
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
        <h2 className="text-2xl font-semibold text-gray-900">Gestion des offres spéciales</h2>
        <button
          onClick={() => {
            setEditingOffer(undefined);
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouvelle offre
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Rechercher des offres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {filteredOffers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Tag className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune offre</h3>
          <p className="mt-1 text-sm text-gray-500">Commencez par créer une nouvelle offre.</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Offre
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Période
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visibilité
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produits
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOffers.map((offer) => {
                  const isActive = isOfferActive(offer);
                  const priorityProducts = offer.products.filter(p => p.is_priority).length;
                  const totalProducts = offer.products.length;
                  const packTotal = offer.type === 'pack' ? calculatePackTotal(offer) : null;
                  
                  return (
                    <tr 
                      key={offer.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleEditOffer(offer)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{offer.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {offer.type === 'pack' ? 'Pack groupé' : 'Achats libres'}
                        </span>
                        {offer.type === 'threshold' && (
                          <div className="text-xs text-gray-500 mt-1">
                            Min: {offer.min_purchase_amount?.toFixed(2)} DZD
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Du {formatDate(offer.start_date)}
                        </div>
                        <div className="text-sm text-gray-900">
                          au {formatDate(offer.end_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {offer.is_public ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Eye className="h-3 w-3 mr-1" />
                            Publique
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Privée
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isActive 
                            ? 'bg-green-100 text-green-800'
                            : new Date() < new Date(offer.start_date)
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {isActive 
                            ? 'Active'
                            : new Date() < new Date(offer.start_date)
                              ? 'À venir'
                              : 'Terminée'
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">{totalProducts} produits</div>
                        <div className="text-xs text-green-600">
                          dont {priorityProducts} prioritaire{priorityProducts > 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {packTotal !== null && (
                          <div className="text-sm font-medium text-gray-900">
                            {packTotal.toFixed(2)} DZD
                            {offer.custom_total_price !== null && (
                              <span className="text-xs text-indigo-600 ml-1">(personnalisé)</span>
                            )}
                          </div>
                        )}
                        {offer.type === 'threshold' && (
                          <div className="text-sm font-medium text-gray-900">
                            Min: {offer.min_purchase_amount?.toFixed(2)} DZD
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {offer.is_public && isActive && (
                            <button
                              onClick={(e) => handleShareOffer(offer.id, e)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Partager"
                            >
                              <Share2 className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditOffer(offer);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Modifier"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOffer(offer.id);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Supprimer"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <OfferModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={editingOffer ? handleUpdateOffer : handleCreateOffer}
        initialData={editingOffer}
        title={editingOffer ? "Modifier l'offre" : "Créer une nouvelle offre"}
      />

      {shareModalOpen && (
        <ShareOfferModal 
          offerId={shareModalOpen} 
          onClose={() => setShareModalOpen(null)} 
        />
      )}
    </div>
  );
}