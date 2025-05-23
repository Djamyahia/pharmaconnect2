import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Loader2, Edit2, Trash2, Save, X, Upload, Download, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Select from 'react-select';
import { customStyles, selectComponents } from '../../components/VirtualizedSelect';
import type { Medication, WholesalerInventory } from '../../types/supabase';
import { algerianWilayas } from '../../lib/wilayas';
import * as XLSX from 'xlsx';
import * as unorm from 'unorm';
import stringSimilarity from 'string-similarity';
import { ExpiryDateDisplay } from '../../components/ExpiryDateDisplay';

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
  expiry_date: string | null;
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
  const [showAllWilayas, setShowAllWilayas] = useState(false);
  const [newItem, setNewItem] = useState({
    medication_id: '',
    quantity: 0,
    price: 0,
    delivery_wilayas: [] as string[],
    expiry_date: null as string | null,
  });

  useEffect(() => {
    if (user?.id) {
      fetchInventory();
      fetchAvailableMedications();
      fetchCategories();
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
      
      const validInventory = (data || []).filter(item => item.medications !== null);
      
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
  
      const { error: insertError } = await supabase.from('wholesaler_inventory').insert({
        wholesaler_id: user?.id,
        medication_id: medicationId,
        quantity: item.quantity,
        price: item.price,
        delivery_wilayas: user?.delivery_wilayas || item.delivery_wilayas,
        expiry_date: item.expiry_date
      });
  
      if (insertError) {
        console.error('Erreur d\'insertion après correction :', insertError);
        throw insertError;
      }
  
      setUploadedItems(prev => prev.filter(i => i.id !== itemId));
  
      setInventory(prev => {
        const filteredInventory = prev.filter(i => i.id !== itemId);
        
        const newItem = {
          id: itemId,
          wholesaler_id: user?.id!,
          medication_id: medicationId,
          quantity: item.quantity,
          price: item.price,
          delivery_wilayas: user?.delivery_wilayas || item.delivery_wilayas,
          expiry_date: item.expiry_date,
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

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
        delivery_wilayas: user?.delivery_wilayas || [],
        expiry_date: null,
      });
      setError('');
      fetchInventory();
    } catch (error) {
      console.error('Error adding inventory item:', error);
      setError('Failed to add inventory item. Please try again.');
    }
  };

  async function handleUpdateItem(id: string) {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('wholesaler_inventory')
        .update({
          quantity: editingItem.quantity,
          price: editingItem.price,
          delivery_wilayas: editingItem.delivery_wilayas,
          expiry_date: editingItem.expiry_date
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
    // 1️⃣ Si c'est un élément "unmatched" (chargé en mémoire, pas en base) :
    const isUnmatched = uploadedItems.some(i => i.id === id);
    if (isUnmatched) {
      // on le retire simplement des deux listes d'état
      setUploadedItems(prev => prev.filter(i => i.id !== id));
      setInventory(prev => prev.filter(i => i.id !== id));
      return; // on sort, pas de requête Supabase
    }
  
    // 2️⃣ Sinon, c'est un vrai enregistrement en base : on supprime dans Supabase
    if (!confirm('Êtes-vous sûr·e de vouloir supprimer cet article définitivement ?')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('wholesaler_inventory')
        .delete()
        .eq('id', id);
  
      if (error) throw error;
  
      // et on recharge l'inventaire
      fetchInventory();
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      alert('Échec de la suppression. Veuillez réessayer.');
    }
  }

  const normalize = (str: string) => {
    if (!str) return '';
    return unorm.nfd(str).replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  };

  const fuzzyMatch = (name: string, row: any): Medication[] => {
    if (!name) return [];

    const normName = normalize(name);
    const normForm = normalize(row.form || '');
    const normDosage = normalize(row.dosage || '');
    const normLab = normalize(row.laboratory || '');

    const medicationStrings = availableMedications.map(m => ({
      medication: m,
      compareString: normalize(`${m.commercial_name} ${m.form} ${m.dosage} ${m.COND || ''} ${m.laboratory || ''}`),
      nameOnly: normalize(m.commercial_name),
      form: normalize(m.form),
      dosage: normalize(m.dosage),
      lab: normalize(m.laboratory || '')
    }));

    const scoredMedications = medicationStrings.map(m => {
      let score = stringSimilarity.compareTwoStrings(normName, m.nameOnly);

      if (normForm && m.form.includes(normForm)) {
        score += 0.2;
      }

      if (normDosage && m.dosage.includes(normDosage)) {
        score += 0.2;
      }

      if (normLab && m.lab === normLab) {
        score += 0.2;
      }

      return {
        medication: m.medication,
        score: Math.min(score, 1)
      };
    });

    return scoredMedications
      .filter(m => m.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(m => m.medication);
  };

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // 2.a) Demander le mode d'import
    // 1) Demande à l'utilisateur
    const shouldReplace = window.confirm(
      'Voulez-vous **remplacer** tout l\'inventaire existant ?\n' +
      'OK = remplacer, Annuler = ajouter seulement les produits du fichier.'
    );
    
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

        const rowCommercialName = normalize(row.commercial_name || '');
        const rowForm = normalize(row.form || '');
        const rowDosage = normalize(row.dosage || '');
        const rowCOND = normalize(row.COND || '');
        const rowLaboratory = normalize(row.laboratory || '');
        const rowExpiryDate = row.expiry_date || null;

        const match = medications.find(m => {
          const medCommercialName = normalize(m.commercial_name);
          const medForm = normalize(m.form);
          const medDosage = normalize(m.dosage);
          const medCOND = normalize(m.COND || '');
          const medLaboratory = normalize(m.laboratory || '');

          return (
            medCommercialName === rowCommercialName &&
            medForm === rowForm &&
            medDosage === rowDosage &&
            medCOND === rowCOND &&
            medLaboratory === rowLaboratory
          );
        });

        if (match) {
          const item = {
            id: tempId,
            wholesaler_id: user.id,
            medication_id: match.id,
            quantity: parseInt(row.quantity) || 0,
            price: parseFloat(row.price) || 0,
            delivery_wilayas: user.delivery_wilayas,
            expiry_date: rowExpiryDate
          };

          itemsToInsert.push(item);
          newInventory.push({
            ...item,
            medications: match,
          });
        } else {
          const suggestions = fuzzyMatch(row.commercial_name, row);
          
          newInventory.push({
            id: tempId,
            wholesaler_id: user.id,
            medication_id: '',
            quantity: parseInt(row.quantity) || 0,
            price: parseFloat(row.price) || 0,
            delivery_wilayas: user.delivery_wilayas,
            expiry_date: rowExpiryDate,
            medications: null,
            isUnmatched: true,
            originalRow: row,
            suggestions
          });
        }
      }

      if (shouldReplace) {
        const { error: deleteError } = await supabase
          .from('wholesaler_inventory')
          .delete()
          .eq('wholesaler_id', user.id);
        if (deleteError) throw deleteError;
      }

      if (itemsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('wholesaler_inventory')
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      setUploadedItems(newInventory.filter(item => item.isUnmatched));
      setInventory([
        ...newInventory.filter(item => !item.isUnmatched),
        ...newInventory.filter(item => item.isUnmatched)
      ]);

      if (shouldReplace) {
        alert('✅ Inventaire entièrement remplacé avec succès. Veuillez corriger les éléments non reconnus');
      } else {
        alert('✅ Nouveaux produits ajoutés à l\'inventaire existant. Veuillez corriger les éléments non reconnus');
      }
    } catch (error: any) {
      console.error('Error uploading inventory:', error);
      setError(error.message || 'Failed to update inventory.');
    } finally {
      setUploadLoading(false);
      event.target.value = '';
    }
  }

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
          price: 1000.00,
          expiry_date: '2025-12-31'
        }
      ];

      const ws = XLSX.utils.json_to_sheet(template);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      
      XLSX.writeFile(wb, 'inventory_template.xlsx');
    } catch (error) {
      console.error('Error downloading template:', error);
      setError('Failed to download template. Please try again.');
    }
  };

  const handleEdit = (item: ExtendedInventoryItem) => {
    setEditingItem({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      delivery_wilayas: item.delivery_wilayas,
      expiry_date: item.expiry_date || null
    });
  };

  const handleWilayaSelection = (selected: { value: string; label: string }[]) => {
    setNewItem({ ...newItem, delivery_wilayas: selected.map(s => s.value) });
  };

  const selectAllWilayas = () => {
    setNewItem({ ...newItem, delivery_wilayas: algerianWilayas.map(w => w.value) });
  };

  const selectedWilayasCount = newItem.delivery_wilayas.length;
  const totalWilayasCount = algerianWilayas.length;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Gestion de l'inventaire</h2>
        
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
          <button
            onClick={downloadTemplate}
            className="flex items-center justify-center px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="inline text-sm ml-2">Télécharger le modèle</span>
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
              className={`flex items-center justify-center px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer ${
                uploadLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploadLoading ? (
                <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 sm:mr-2" />
              )}
              <span className="inline text-sm ml-2">
                {uploadLoading ? 'Mise à jour...' : 'Importer Excel'}
              </span>
            </label>
          </div>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="inline text-sm ml-2">Ajouter un produit</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4">
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Médicament
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantité
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix
                </th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date d'expiration
                </th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory.map((item) => (
                <tr key={item.id} className={item.isUnmatched ? 'bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-4">
                    {item.isUnmatched ? (
                      <div>
                        <p className="text-sm font-medium text-red-600">Médicament non reconnu</p>
                        <p className="text-sm text-gray-500">
                          Données importées : {item.originalRow?.commercial_name} - {item.originalRow?.form} {item.originalRow?.dosage}
                        </p>
                        {item.suggestions && item.suggestions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700">Suggestions :</p>
                            <select
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              onChange={(e) => handleFixMedication(item.id, e.target.value)}
                            >
                              <option value="">Sélectionner un médicament...</option>
                              {item.suggestions.map((med) => (
                                <option key={med.id} value={med.id}>
                                  {med.commercial_name} - {med.form} {med.dosage}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.medications?.commercial_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.medications?.form} - {item.medications?.dosage}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    {editingItem?.id === item.id ? (
                      <input
                        type="number"
                        min="0"
                        value={editingItem.quantity}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          quantity: parseInt(e.target.value)
                        })}
                        className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    ) : (
                      <span className="text-sm text-gray-900">{item.quantity}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    {editingItem?.id === item.id ? (
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editingItem.price}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          price: parseFloat(e.target.value)
                        })}
                        className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    ) : (
                      <span className="text-sm text-gray-900">{item.price.toFixed(2)} DZD</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center whitespace-nowrap">
                    {editingItem?.id === item.id ? (
                      <input
                        type="date"
                        value={editingItem.expiry_date || ''}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          expiry_date: e.target.value || null
                        })}
                        className="w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    ) : (
                      <ExpiryDateDisplay expiryDate={item.expiry_date} />
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {editingItem?.id === item.id ? (
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => handleUpdateItem(item.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Save className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setEditingItem(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 hover:text-red-900"
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
        </div>

        {inventory.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun produit</h3>
            <p className="mt-1 text-sm text-gray-500">Commencez par ajouter un nouveau produit à votre inventaire.</p>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                  onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value)
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date d'expiration (optionnelle)
                </label>
                <input
                  type="date"
                  value={newItem.expiry_date || ''}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewItem({ ...newItem, expiry_date: e.target.value || null })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Format: MM/YYYY. Laissez vide si non applicable.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Wilayas de livraison <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={selectAllWilayas}
                      className="text-sm text-indigo-600 hover:text-indigo-500"
                    >
                      Sélectionner tout
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAllWilayas(!showAllWilayas)}
                      className="text-sm text-gray-600 hover:text-gray-500"
                    >
                      {showAllWilayas ? 'Réduire' : 'Voir tout'}
                    </button>
                  </div>
                </div>
                
                <div className={`transition-all duration-300 ${showAllWilayas ? '' : 'max-h-40 overflow-y-auto'}`}>
                  <Select
                    isMulti
                    value={algerianWilayas.filter(w => newItem.delivery_wilayas.includes(w.value))}
                    onChange={handleWilayaSelection}
                    options={algerianWilayas}
                    className="mt-1"
                    styles={{
                      ...customStyles,
                      menuList: (base) => ({
                        ...base,
                        maxHeight: showAllWilayas ? '400px' : '200px',
                      }),
                    }}
                    components={selectComponents}
                    placeholder="Sélectionner les wilayas..."
                    noOptionsMessage={() => "Aucune wilaya trouvée"}
                  />
                </div>
                
                <div className="mt-2 text-sm text-gray-500 flex items-center justify-between">
                  <span>
                    {selectedWilayasCount} wilaya{selectedWilayasCount > 1 ? 's' : ''} sélectionnée{selectedWilayasCount > 1 ? 's' : ''} sur {totalWilayasCount}
                  </span>
                  {selectedWilayasCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, delivery_wilayas: [] })}
                      className="text-red-600 hover:text-red-700"
                    >
                      Tout désélectionner
                    </button>
                  )}
                </div>
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