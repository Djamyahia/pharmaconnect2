import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Loader2, Edit2, Trash2, Save, X, Package, Upload, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Select from 'react-select';
import { customStyles, selectComponents } from '../../components/VirtualizedSelect';
import type { Medication, WholesalerInventory } from '../../types/supabase';
import { algerianWilayas } from '../../lib/wilayas';
import * as XLSX from 'xlsx';
import * as unorm from 'unorm';
import stringSimilarity from 'string-similarity';

type ExtendedInventoryItem = WholesalerInventory & {
  medications: Medication | null;
  isUnmatched?: boolean;
  originalRow?: any;
  suggestions?: Medication[];
};

type EditingItem = {
  id: string;
  quantity: number;
  price: number;
  delivery_wilayas: string[];
};

export function Inventory() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<ExtendedInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [availableMedications, setAvailableMedications] = useState<Medication[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadedItems, setUploadedItems] = useState<ExtendedInventoryItem[]>([]);
  const [newItem, setNewItem] = useState({
    medication_id: '',
    quantity: 0,
    price: 0,
    delivery_wilayas: [] as string[],
  });

  useEffect(() => {
    if (user?.id) {
      fetchInventory();
      fetchAvailableMedications();
      fetchCategories();
      // Initialize newItem with user's delivery wilayas
      if (user.delivery_wilayas) {
        setNewItem(prev => ({
          ...prev,
          delivery_wilayas: user.delivery_wilayas
        }));
      }
    }
  }, [user?.id]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (user?.id) {
        fetchInventory();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, categoryFilter, user?.id]);

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('category')
        .order('category');
      
      if (error) throw error;
      
      if (data) {
        const uniqueCategories = [...new Set(data.map(item => item.category))];
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }

  async function fetchAvailableMedications() {
    try {
      let allMedications: Medication[] = [];
      let lastId: string | null = null;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('medications')
          .select('*')
          .order('id')
          .limit(1000);

        if (lastId) {
          query = query.gt('id', lastId);
        }

        const { data, error } = await query;
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allMedications = [...allMedications, ...data];
          lastId = data[data.length - 1].id;
          hasMore = data.length === 1000;
        }
      }

      setAvailableMedications(allMedications);
    } catch (error) {
      console.error('Error fetching medications:', error);
    }
  }

  async function fetchInventory() {
    if (!user?.id) return;

    try {
      let query = supabase
        .from('wholesaler_inventory')
        .select(`
          *,
          medications (*)
        `)
        .eq('wholesaler_id', user.id);

      if (searchQuery) {
        query = query.textSearch('medications.search_vector', searchQuery);
      }

      if (categoryFilter) {
        query = query.eq('medications.category', categoryFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter out any inventory items with null medications
      const validInventory = (data || []).filter(item => item.medications !== null);
      
      // If there are uploaded items being processed, merge them with the inventory
      if (uploadedItems.length > 0) {
        setInventory([...validInventory, ...uploadedItems.filter(item => item.isUnmatched)]);
      } else {
        setInventory(validInventory);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleFixMedication = async (itemId: string, medicationId: string) => {
    try {
      const medication = availableMedications.find(m => m.id === medicationId);
      if (!medication) throw new Error("Médicament non trouvé");
  
      const item = uploadedItems.find(i => i.id === itemId);
      if (!item) throw new Error("Item introuvable");
  
      // Insert the item into the database
      const { error: insertError } = await supabase.from('wholesaler_inventory').insert({
        wholesaler_id: user?.id,
        medication_id: medicationId,
        quantity: item.quantity,
        price: item.price,
        delivery_wilayas: user?.delivery_wilayas || item.delivery_wilayas,
      });
  
      if (insertError) {
        console.error('Erreur d\'insertion après correction :', insertError);
        throw insertError;
      }
  
      // Update the uploadedItems state to remove the matched item
      setUploadedItems(prev => prev.filter(i => i.id !== itemId));
  
      // Update the inventory state directly instead of fetching
      setInventory(prev => {
        // Remove the unmatched item
        const filteredInventory = prev.filter(i => i.id !== itemId);
        
        // Add the new matched item
        const newItem = {
          id: itemId,
          wholesaler_id: user?.id!,
          medication_id: medicationId,
          quantity: item.quantity,
          price: item.price,
          delivery_wilayas: user?.delivery_wilayas || item.delivery_wilayas,
          medications: medication,
          isUnmatched: false
        };
        
        return [...filteredInventory, newItem];
      });
  
    } catch (err) {
      console.error('Erreur handleFixMedication:', err);
      alert("Erreur lors de la correction du médicament.");
    }
  };

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validate form data
    if (!newItem.medication_id) {
      setError('Please select a medication');
      return;
    }

    if (newItem.quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    if (newItem.price <= 0) {
      setError('Price must be greater than 0');
      return;
    }

    if (newItem.delivery_wilayas.length === 0) {
      setError('Please select at least one delivery wilaya');
      return;
    }

    try {
      const { error } = await supabase
        .from('wholesaler_inventory')
        .insert({
          ...newItem,
          wholesaler_id: user?.id,
        });

      if (error) throw error;

      setShowAddForm(false);
      setNewItem({
        medication_id: '',
        quantity: 0,
        price: 0,
        delivery_wilayas: user?.delivery_wilayas || [], // Reset with user's delivery wilayas
      });
      setError('');
      fetchInventory();
    } catch (error) {
      console.error('Error adding inventory item:', error);
      setError('Failed to add inventory item. Please try again.');
    }
  }

  async function handleUpdateItem(id: string) {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('wholesaler_inventory')
        .update({
          quantity: editingItem.quantity,
          price: editingItem.price,
          delivery_wilayas: editingItem.delivery_wilayas,
        })
        .eq('id', id);

      if (error) throw error;

      setEditingItem(null);
      fetchInventory();
    } catch (error) {
      console.error('Error updating inventory item:', error);
    }
  }

  async function handleDeleteItem(id: string) {
    if (!id || id.trim() === '') {
      console.error('Invalid item ID for deletion');
      return;
    }

    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('wholesaler_inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchInventory();
    } catch (error) {
      console.error('Error deleting inventory item:', error);
    }
  }

  const normalize = (str: string) => {
    if (!str) return '';
    return unorm.nfd(str).replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  };

  const fuzzyMatch = (name: string, row: any): Medication[] => {
    if (!name) return [];

    const normName = normalize(name);
    const normForm = normalize(row.form || '');
    const normDosage = normalize(row.dosage || '');
    const normLab = normalize(row.laboratory || '');

    // Create comparison strings for each medication
    const medicationStrings = availableMedications.map(m => ({
      medication: m,
      compareString: normalize(`${m.commercial_name} ${m.form} ${m.dosage} ${m.COND || ''} ${m.laboratory || ''}`),
      nameOnly: normalize(m.commercial_name),
      form: normalize(m.form),
      dosage: normalize(m.dosage),
      lab: normalize(m.laboratory || '')
    }));

    // Calculate similarity scores
    const scoredMedications = medicationStrings.map(m => {
      let score = stringSimilarity.compareTwoStrings(normName, m.nameOnly);

      // Boost score if form matches
      if (normForm && m.form.includes(normForm)) {
        score += 0.2;
      }

      // Boost score if dosage matches
      if (normDosage && m.dosage.includes(normDosage)) {
        score += 0.2;
      }

      // Boost score if laboratory matches
      if (normLab && m.lab === normLab) {
        score += 0.2;
      }

      return {
        medication: m.medication,
        score: Math.min(score, 1) // Cap score at 1
      };
    });

    // Sort by score and return top matches
    return scoredMedications
      .filter(m => m.score > 0.3) // Only return reasonably good matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) // Limit to top 5 matches
      .map(m => m.medication);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    setUploadLoading(true);
    setError('');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const { data: medications, error: medError } = await supabase
        .from('medications')
        .select('*');

      if (medError) throw medError;

      const newInventory: ExtendedInventoryItem[] = [];
      const itemsToInsert: any[] = [];

      for (const row of jsonData as any[]) {
        const { data: { id: tempId }, error: idError } = await supabase.rpc('generate_uuid');
        if (idError) throw idError;

        const match = medications.find(m =>
          normalize(m.commercial_name) === normalize(row.commercial_name) &&
          normalize(m.form) === normalize(row.form) &&
          normalize(m.dosage) === normalize(row.dosage) &&
          normalize(m.COND) === normalize(row.COND) &&
          normalize(m.laboratory) === normalize(row.laboratory)
        );

        if (match) {
          const item = {
            id: tempId,
            wholesaler_id: user.id,
            medication_id: match.id,
            quantity: parseInt(row.quantity),
            price: parseFloat(row.price),
            delivery_wilayas: user.delivery_wilayas,
          };

          itemsToInsert.push(item);
          newInventory.push({
            ...item,
            medications: match,
          });
        } else {
          const suggestions = fuzzyMatch(row.commercial_name, row);
          if (suggestions.length > 0) {
            newInventory.push({
              id: tempId,
              wholesaler_id: user.id,
              medication_id: '',
              quantity: parseInt(row.quantity),
              price: parseFloat(row.price),
              delivery_wilayas: user.delivery_wilayas,
              medications: null,
              isUnmatched: true,
              originalRow: row,
              suggestions
            });
          }
        }
      }

      // Delete previous inventory
      const { error: deleteError } = await supabase
        .from('wholesaler_inventory')
        .delete()
        .eq('wholesaler_id', user.id);

      if (deleteError) throw deleteError;

      // Insert matched medications
      if (itemsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('wholesaler_inventory')
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      // Store unmatched items in state
      setUploadedItems(newInventory.filter(item => item.isUnmatched));
      
      // Update the inventory display
      setInventory([
        ...newInventory.filter(item => !item.isUnmatched),
        ...newInventory.filter(item => item.isUnmatched)
      ]);

      alert('Inventaire mis à jour. Veuillez corriger les éléments non reconnus.');
    } catch (error: any) {
      console.error('Error uploading inventory:', error);
      setError(error.message || 'Failed to update inventory.');
    } finally {
      setUploadLoading(false);
      event.target.value = '';
    }
  };

  const downloadTemplate = () => {
    try {
      const template = [
        {
          commercial_name: 'Doliprane',
          form: 'B/12',
          dosage: '300MG',
          COND: 'PDRE. P. SOL. BUV. SACH.-DOSE',
          laboratory: 'SANOFI AVENTIS ALGERIE SPA',
          quantity: 100,
          price: 1000.00
        }
      ];

      const ws = XLSX.utils.json_to_sheet(template);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      
      // Generate and download the file
      XLSX.writeFile(wb, 'inventory_template.xlsx');
    } catch (error) {
      console.error('Error downloading template:', error);
      setError('Failed to download template. Please try again.');
    }
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
        <h2 className="text-2xl font-semibold text-gray-900">Gestion de l'inventaire</h2>
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={downloadTemplate}
              className="flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Download className="h-5 w-5 mr-2" />
              Télécharger le modèle
            </button>
            <div className="relative">
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".xlsx,.xls"
                className="hidden"
                id="file-upload"
                disabled={uploadLoading}
              />
              <label
                htmlFor="file-upload"
                className={`flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer ${
                  uploadLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {uploadLoading ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5 mr-2" />
                )}
                {uploadLoading ? 'Mise à jour...' : 'Importer Excel'}
              </label>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Ajouter un produit
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Search and Filter Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search Input */}
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

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                Médicament
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                Quantité
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                Prix
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[25%]">
                Wilayas de livraison
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventory.map((item) => (
              <tr key={item.id} className={item.isUnmatched ? 'bg-red-50' : 'hover:bg-gray-50'}>
                <td className="px-6 py-4">
                  {item.isUnmatched ? (
                    <>
                      <div className="text-sm text-red-700 font-semibold mb-1">
                        {item.originalRow?.commercial_name || 'Nom manquant'}
                      </div>
                      <Select
                        options={(item.suggestions || []).map(med => ({
                          value: med.id,
                          label: `${med.commercial_name} - ${med.form} ${med.dosage} (${med.COND || ''})${med.laboratory ? ` | ${med.laboratory}` : ''}`
                        }))}
                        onChange={(selected) => selected && handleFixMedication(item.id, selected.value)}
                        placeholder="Corriger..."
                        isClearable
                        styles={{
                          ...customStyles,
                          container: (base) => ({
                            ...base,
                            width: '100%',
                            minWidth: '300px'
                          }),
                          menu: (base) => ({
                            ...base,
                            width: 'max-content',
                            minWidth: '100%'
                          }),
                          menuPortal: base => ({
                            ...base,
                            zIndex: 9999
                          })
                        }}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                      />
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-medium text-gray-900">
                        {item.medications?.commercial_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.medications?.form} - {item.medications?.dosage}
                        {item.medications?.COND && ` (${item.medications.COND})`}
                      </div>
                      {item.medications?.laboratory && (
                        <div className="text-xs text-gray-500">
                          {item.medications.laboratory}
                        </div>
                      )}
                    </>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {editingItem?.id === item.id ? (
                    <input
                      type="number"
                      min="0"
                      value={editingItem.quantity}
                      onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) })}
                      className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-900">{item.quantity} unités</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {editingItem?.id === item.id ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingItem.price}
                      onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })}
                      className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  ) : (
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-gray-900">
                        {item.price.toFixed(2)} DZD
                      </span>
                      {item.has_active_promotion && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Promotion active
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingItem?.id === item.id ? (
                    <Select
                      isMulti
                      value={editingItem.delivery_wilayas.map(w => algerianWilayas.find(aw => aw.value === w))}
                      onChange={(selected) => setEditingItem({ ...editingItem, delivery_wilayas: selected.map(s => s.value) })}
                      options={algerianWilayas}
                      className="min-w-[200px]"
                      styles={customStyles}
                      components={selectComponents}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  ) : (
                    <div className="text-sm text-gray-900 max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      {item.delivery_wilayas.map((w, i) => (
                        <span key={w} className="inline-block mr-1">
                          {algerianWilayas.find(aw => aw.value === w)?.label}
                          {i < item.delivery_wilayas.length - 1 ? ',' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingItem?.id === item.id ? (
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleUpdateItem(item.id)}
                        className="text-green-600 hover:text-green-900"
                        title="Enregistrer"
                      >
                        <Save className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setEditingItem(null)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Annuler"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => setEditingItem({
                          id: item.id,
                          quantity: item.quantity,
                          price: item.price,
                          delivery_wilayas: item.delivery_wilayas,
                        })}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Modifier"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Supprimer"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {inventory.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun produit</h3>
            <p className="mt-1 text-sm text-gray-500">Commencez par ajouter un nouveau produit à votre inventaire.</p>
          </div>
        )}
      </div>

      {/* Add Promotion Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Ajouter un nouveau produit</h3>
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

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Médicament
                </label>
                <Select
                  value={availableMedications.find(med => med.id === newItem.medication_id)}
                  onChange={(selected) => setNewItem({ ...newItem, medication_id: selected?.id || '' })}
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
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantité
                </label>
                <input
                  type="number"
                  min="0"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Prix (DZD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Wilayas de livraison
                </label>
                <Select
                  isMulti
                  value={newItem.delivery_wilayas.map(w => algerianWilayas.find(aw => aw.value === w))}
                  onChange={(selected) => setNewItem({ ...newItem, delivery_wilayas: selected.map(s => s.value) })}
                  options={algerianWilayas}
                  className="mt-1"
                  placeholder="Sélectionner les wilayas de livraison..."
                  styles={customStyles}
                  components={selectComponents}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  defaultValue={user?.delivery_wilayas.map(w => algerianWilayas.find(aw => aw.value === w))}
                />
              </div>

              <div className="flex justify-end space-x-3">
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
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}