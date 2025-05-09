import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Upload, FileText, Save, ArrowLeft, ArrowRight, Check, Package as PackageIcon, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Select from 'react-select';
import { customStyles, selectComponents } from '../../components/VirtualizedSelect';
import type { Medication, PromotionalOffer, OfferProduct, OfferDocument } from '../../types/supabase';

type WizardStep = 'basic' | 'products' | 'priority' | 'review';

type PackCreationWizardProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: PromotionalOffer & { 
    products: (OfferProduct & { medications?: Medication })[];
    documents?: OfferDocument[];
  };
};

export function PackCreationWizard({ isOpen, onClose, onSuccess, initialData }: PackCreationWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableMedications, setAvailableMedications] = useState<(Medication & { price: number })[]>([]);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    type: 'pack' as 'pack' | 'threshold',
    min_purchase_amount: 0,
    is_public: false,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    custom_total_price: null as number | null,
    comment: '',
    max_quota_selections: 1,
    free_text_products: '',
    products: [] as {
      id?: string;
      medication_id: string;
      medication_name?: string;
      quantity: number;
      price: number;
      is_priority: boolean;
      priority_message: string;
      free_units_percentage?: number | null;
    }[]
  });

   // 1️⃣ On définit la suite des étapes en fonction du type d’offre
 const steps: WizardStep[] =
   formData.type === 'pack'
     ? ['basic', 'products', 'review']               // si pack, on enlève 'priority'
     : ['basic', 'products', 'priority', 'review'];  // sinon on garde les 4 étapes
 const currentIndex = steps.indexOf(currentStep);    // index de l’étape courante
  
  // Documents
  const [documents, setDocuments] = useState<File[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<OfferDocument[]>([]);
  const [documentsToDelete, setDocumentsToDelete] = useState<string[]>([]);
  
  // Calculated values
  const [totalPrice, setTotalPrice] = useState<number>(0);
  
  useEffect(() => {
    if (isOpen) {
      fetchAvailableMedications();
      
      // Reset form when opening
      if (!initialData) {
        resetForm();
      } else {
        // Populate form with initial data
        setFormData({
          name: initialData.name,
          type: initialData.type,
          min_purchase_amount: initialData.min_purchase_amount || 0,
          is_public: initialData.is_public,
          start_date: new Date(initialData.start_date).toISOString().split('T')[0],
          end_date: new Date(initialData.end_date).toISOString().split('T')[0],
          custom_total_price: initialData.custom_total_price,
          comment: initialData.comment || '',
          max_quota_selections: initialData.max_quota_selections || 1,
          free_text_products: initialData.free_text_products || '',
          products: initialData.products.map(product => ({
            id: product.id,
            medication_id: product.medication_id,
            medication_name: product.medications?.commercial_name,
            quantity: product.quantity,
            price: product.price,
            is_priority: product.is_priority,
            priority_message: product.priority_message || 'Produit disponible en priorité dans le cadre de cette opération',
            free_units_percentage: product.free_units_percentage
          }))
        });
        
        // Set existing documents
        if (initialData.documents) {
          setExistingDocuments(initialData.documents);
        }
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
  
  const resetForm = () => {
    setFormData({
      name: '',
      type: 'pack',
      min_purchase_amount: 0,
      is_public: false,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      custom_total_price: null,
      comment: '',
      max_quota_selections: 1,
      free_text_products: '',
      products: []
    });
    setDocuments([]);
    setExistingDocuments([]);
    setDocumentsToDelete([]);
    setCurrentStep('basic');
    setError('');
  };
  
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
  
  const handleNextStep = () => {
  // 1. Validation de base pour chaque étape
  if (currentStep === 'basic') {
    // … vos validations sur le nom, les dates, etc. …
    // si ça échoue, vous appelez setError(...) et return
  }
  if (currentStep === 'products') {
    // … validation que formData.products n’est pas vide …
  }
  if (currentStep === 'priority') {
    // … validation de priorité …
  }

  // 2. On passe à l’étape suivante au sein de `steps`
  if (currentIndex < steps.length - 1) {
    setCurrentStep(steps[currentIndex + 1]);
    setError('');
  }
};

  
  const handlePreviousStep = () => {
  if (currentIndex > 0) {
    setCurrentStep(steps[currentIndex - 1]);
    setError('');
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
          is_priority: formData.type === 'threshold',
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
    if (field === 'is_priority' && formData.type === 'threshold') {
  // Impossible de désactiver la priorité sur une offre achat libre
  return;
}

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
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setDocuments([...documents, ...newFiles]);
    }
  };
  
  const handleRemoveDocument = (index: number) => {
    const newDocuments = [...documents];
    newDocuments.splice(index, 1);
    setDocuments(newDocuments);
  };
  
  const handleRemoveExistingDocument = (docId: string) => {
    setExistingDocuments(existingDocuments.filter(doc => doc.id !== docId));
    setDocumentsToDelete([...documentsToDelete, docId]);
  };
  
  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    
    try {
      let offerId: string;
      
      if (initialData) {
        // Update existing offer
        const { error: updateError } = await supabase
          .from('promotional_offers')
          .update({
            name: formData.name,
            type: formData.type,
            min_purchase_amount: formData.type === 'threshold' ? formData.min_purchase_amount : null,
            is_public: formData.is_public,
            start_date: formData.start_date,
            end_date: formData.end_date,
            custom_total_price: formData.custom_total_price,
            comment: formData.comment || null,
            max_quota_selections: formData.max_quota_selections,
            free_text_products: formData.free_text_products || null
          })
          .eq('id', initialData.id);
        
        if (updateError) throw updateError;
        
        offerId = initialData.id;
        
        // Delete existing products
        const { error: deleteProductsError } = await supabase
          .from('offer_products')
          .delete()
          .eq('offer_id', offerId);
        
        if (deleteProductsError) throw deleteProductsError;
      } else {
        // Create new offer
        const { data: offerData, error: createError } = await supabase
          .from('promotional_offers')
          .insert({
            wholesaler_id: user?.id,
            name: formData.name,
            type: formData.type,
            min_purchase_amount: formData.type === 'threshold' ? formData.min_purchase_amount : null,
            is_public: formData.is_public,
            start_date: formData.start_date,
            end_date: formData.end_date,
            custom_total_price: formData.custom_total_price,
            comment: formData.comment || null,
            max_quota_selections: formData.max_quota_selections,
            free_text_products: formData.free_text_products || null
          })
          .select()
          .single();
        
        if (createError) throw createError;
        
        offerId = offerData.id;
      }
      
      // Insert products
      const productsToInsert = formData.products.map(product => ({
        offer_id: offerId,
        medication_id: product.medication_id,
        quantity: product.quantity,
        price: product.price,
        is_priority: product.is_priority,
        priority_message: product.priority_message || null,
        free_units_percentage: product.free_units_percentage
      }));
      
      if (productsToInsert.length > 0) {
        const { error: insertProductsError } = await supabase
          .from('offer_products')
          .insert(productsToInsert);
        
        if (insertProductsError) throw insertProductsError;
      }
      
      // Handle document deletions
      if (documentsToDelete.length > 0) {
        for (const docId of documentsToDelete) {
          const docToDelete = initialData?.documents?.find(d => d.id === docId);
          if (docToDelete) {
            // Delete from storage
            const { error: storageDeleteError } = await supabase
              .storage
              .from('offer-documents')
              .remove([docToDelete.file_path]);
            
            if (storageDeleteError) console.error('Error deleting file:', storageDeleteError);
            
            // Delete from database
            const { error: dbDeleteError } = await supabase
              .from('offer_documents')
              .delete()
              .eq('id', docId);
            
            if (dbDeleteError) throw dbDeleteError;
          }
        }
      }
      
      // Upload new documents
      for (const file of documents) {
        const filePath = `${offerId}/${file.name}`;
        
        const { error: uploadError } = await supabase
          .storage
          .from('offer-documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });
        
        if (uploadError) throw uploadError;
        
        // Create document reference
        const { error: docRefError } = await supabase
          .from('offer_documents')
          .insert({
            offer_id: offerId,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_path: filePath
          });
        
        if (docRefError) throw docRefError;
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving offer:', error);
      setError('Erreur lors de l\'enregistrement de l\'offre');
    } finally {
      setLoading(false);
    }
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
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {initialData ? 'Modifier l\'offre' : 'Créer une nouvelle offre'}
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-500"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Progress steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, i) => (
              <React.Fragment key={step}>
                <div className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      currentIndex === i
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-100 text-indigo-600'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="ml-2 text-sm font-medium text-gray-900">
                    {{
                      basic:   'Informations de base',
                      products:'Produits',
                      priority:'Priorités',
                      review:  'Vérification'
                    }[step]}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden sm:block w-16 h-0.5 bg-gray-200"></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {/* Step content */}
        <div className="mb-8">
          {currentStep === 'basic' && (
            <div className="space-y-6">
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
                    onChange={(e) => {
                     const newType = e.target.value as 'pack' | 'threshold';
                     setFormData({
                       ...formData,
                       type: newType,
                       // 🔄 On force is_priority selon le type :
                       // - true pour achat libre
                       // - false pour pack groupé
                       products: formData.products.map(p => ({
                         ...p,
                         is_priority: newType === 'threshold'
                       }))
                     });
                  }}

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
                      value={formData.min_purchase_amount}
                      onChange={(e) => setFormData({ ...formData, min_purchase_amount: parseFloat(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      required
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Commentaire (optionnel)
                  </label>
                  <textarea
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    rows={3}
                    placeholder="Informations supplémentaires sur l'offre..."
                  />
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
              </div>
            </div>
          )}
          
          {currentStep === 'products' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium text-gray-900">Produits de l'offre</h4>
              </div>
              
              {formData.type === 'threshold' && (
                <div className="bg-amber-50 p-4 rounded-lg mb-6">
                  <h4 className="text-sm font-medium text-amber-800 mb-2">Produits pour achats libres</h4>
                  <p className="text-sm text-amber-700 mb-3">
                    Pour les offres sur achats libres, vous pouvez spécifier les produits que les pharmaciens peuvent commander pour atteindre le montant minimum d'achat.
                  </p>
                  <textarea
                    value={formData.free_text_products}
                    onChange={(e) => setFormData({ ...formData, free_text_products: e.target.value })}
                    className="mt-1 block w-full rounded-md border-amber-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                    rows={6}
                    placeholder="Listez ici les produits disponibles pour cette offre (un par ligne)..."
                  ></textarea>
                  <p className="mt-2 text-xs text-amber-600">
                    Cette liste sera visible par les pharmaciens lors de la commande. Vous pouvez inclure des détails comme les noms de produits, dosages, conditionnements, etc.
                  </p>
                </div>
              )}
              
              {formData.products.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <PackageIcon className="mx-auto h-12 w-12 text-gray-400" />
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
                          <label className="block text-sm font-medium text-gray-700">
                            Unités gratuites (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={product.free_units_percentage || 0}
                            onChange={(e) => handleProductChange(index, 'free_units_percentage', parseFloat(e.target.value) || null)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Laissez à 0 pour ne pas appliquer d'unités gratuites
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add product button at the bottom */}
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter un produit
                </button>
              </div>
            </div>
          )}
          
          {currentStep === 'priority' && (
            
            <div className="space-y-6">
              {formData.type === 'threshold' ? (
                // —— Mode achat libre — on affiche juste la liste ——
                <div className="bg-yellow-50 p-4 rounded-lg">
                  {formData.type === 'threshold' && (
  <div className="bg-blue-50 p-4 rounded-lg mb-4">
    <label className="block text-sm font-medium text-blue-700">
      Nombre maximum de produits prioritaires sélectionnables
    </label>
    <input
      type="number"
      min="1"
      value={formData.max_quota_selections}
      onChange={(e) =>
        setFormData({
          ...formData,
          max_quota_selections: parseInt(e.target.value, 10) || 1
        })
      }
      className="mt-1 block w-full rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
    />
    <p className="mt-1 text-xs text-blue-600">
      Combien de produits prioritaires le pharmacien pourra choisir.
    </p>
  </div>
)}

                  <h4 className="text-md font-medium text-yellow-800 mb-2">
                    Tous vos produits prioritaires
                  </h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {formData.products.map((p, i) => (
                      <li key={i}>
                        {p.medication_name} — Quantité : {p.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
      // —— Mode pack groupé — on garde l'UI checkbox existante ——
      <div className="space-y-6">
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="text-md font-medium text-yellow-800 mb-2">
            Produits à disponibilité prioritaire
          </h4>
          <p className="text-sm text-yellow-700">
            Marquez les produits qui seront disponibles en priorité.
          </p>
        </div>
        <div className="space-y-4">
          {formData.products.map((product, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${
                product.is_priority ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`priority-${index}`}
                    checked={product.is_priority}
                    onChange={(e) =>
                      handleProductChange(index, 'is_priority', e.target.checked)
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor={`priority-${index}`}
                    className="ml-2 block text-sm font-medium text-gray-700"
                  >
                    Produit prioritaire
                  </label>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {product.medication_name}
                </span>
              </div>
              {product.is_priority && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Message de priorité
                  </label>
                  <textarea
                    value={product.priority_message}
                    onChange={(e) =>
                      handleProductChange(index, 'priority_message', e.target.value)
                    }
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)}

          
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-md font-medium text-green-800 mb-2">Vérification finale</h4>
                <p className="text-sm text-green-700">
                  Vérifiez les informations de votre offre avant de la créer.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Informations générales</h5>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Nom</dt>
                      <dd className="text-sm font-medium text-gray-900">{formData.name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Type</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {formData.type === 'pack' ? 'Pack groupé' : 'Offre sur achats libres'}
                      </dd>
                    </div>
                    {formData.type === 'threshold' && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Montant minimum</dt>
                        <dd className="text-sm font-medium text-gray-900">{formData.min_purchase_amount.toFixed(2)} DZD</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Période</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {new Date(formData.start_date).toLocaleDateString()} - {new Date(formData.end_date).toLocaleDateString()}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Visibilité</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {formData.is_public ? 'Publique' : 'Privée'}
                      </dd>
                    </div>
                    {formData.comment && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Commentaire</dt>
                        <dd className="text-sm font-medium text-gray-900">{formData.comment}</dd>
                      </div>
                    )}
                  </dl>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Produits</h5>
                    <ul className="space-y-2">
                      {formData.products.map((product, index) => (
                        <li
                          key={index}
                          className="flex justify-between items-center p-2 rounded-md
                            bg-gray-50 border border-gray-200"
                        >
                          {/* Nom et quantité */}
                          <span className="text-sm text-gray-900">
                            {product.medication_name} — Quantité : {product.quantity}
                          </span>
                    
                          {/* Indicateur “Prioritaire” si type threshold et ce produit l’est */}
                          {formData.type === 'threshold' && product.is_priority && (
                            <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                              Prioritaire
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>

                  {formData.type === 'threshold' && (
                    <p className="text-sm text-gray-500 mt-2">
                      Nombre max de produits prioritaires sélectionnables : {formData.max_quota_selections}
                    </p>
                  )}
                  {formData.type === 'pack' && (
  <div className="mt-4 space-y-4">
    {/* Prix total calculé (lecture seule) */}
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-500">Prix total calculé</span>
      <span className="text-sm font-medium text-gray-900">
        {totalPrice.toFixed(2)} DZD
      </span>
    </div>

    {/* Prix total personnalisé (modifiable) */}
    <div>
      <label className="block text-sm font-medium text-gray-700">
        Prix total personnalisé (DZD)
      </label>
      <input
        type="number"
        min="0"
        step="0.01"
        value={formData.custom_total_price ?? ''}
        onChange={(e) =>
          setFormData({
            ...formData,
            custom_total_price: e.target.value
              ? parseFloat(e.target.value)
              : null,
          })
        }
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        placeholder="Laissez vide pour utiliser le prix calculé"
      />
    </div>
  </div>
)}

                </div>
                
                {formData.type === 'threshold' && formData.free_text_products && (
                  <div className="bg-amber-50 p-4 rounded-lg md:col-span-2">
                    <h5 className="text-sm font-medium text-amber-800 mb-2">Produits pour achats libres</h5>
                    <div className="text-sm text-amber-700 whitespace-pre-line">
                      {formData.free_text_products}
                    </div>
                  </div>
                )}
                
                
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation buttons */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {currentStep !== 'basic' && (
              <button
                type="button"
                onClick={handlePreviousStep}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Précédent
              </button>
            )}
          </div>
          
          <div>
            {currentStep !== 'review' ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Suivant
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {initialData ? 'Mettre à jour' : 'Créer l\'offre'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}