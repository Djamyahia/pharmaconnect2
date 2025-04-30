import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Loader2, Edit2, Trash2, Save, X, Upload, Download, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Select from 'react-select';
import { customStyles, selectComponents } from '../../components/VirtualizedSelect';
import type { ParapharmacyProduct, ParapharmacyCategory } from '../../types/supabase';
import { algerianWilayas } from '../../lib/wilayas';
import { ProductTypeNav } from '../../components/ProductTypeNav';
import * as XLSX from 'xlsx';
import { ImageUpload } from '../../components/ImageUpload';

type ExtendedProduct = ParapharmacyProduct & {
  inventory?: {
    id: string;
    quantity: number;
    price: number;
    delivery_wilayas: string[];
  };
};

type EditingProduct = {
  id: string; // ID de l'inventaire
  product_id: string; // ID du produit parapharmaceutique
  quantity: number;
  price: number;
  delivery_wilayas: string[];
  image_data: string;
};


type AddProductModalProps = {
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    brand: string;
    category: ParapharmacyCategory;
    description?: string;
    packaging?: string;
    reference?: string;
    image_data: string;
    quantity: number;
    price: number;
    delivery_wilayas: string[];
  }) => Promise<void>;
};

function AddProductModal({ onClose, onSubmit }: AddProductModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: '' as ParapharmacyCategory,
    description: '',
    packaging: '',
    reference: '',
    image_data: '',
    quantity: 0,
    price: 0,
    delivery_wilayas: user?.delivery_wilayas || []
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAllWilayas, setShowAllWilayas] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name) {
      setError('Le nom du produit est requis');
      return;
    }

    if (!formData.brand) {
      setError('La marque est requise');
      return;
    }

    if (!formData.category) {
      setError('La catégorie est requise');
      return;
    }

    if (formData.quantity < 0) {
      setError('La quantité doit être positive');
      return;
    }

    if (formData.price <= 0) {
      setError('Le prix doit être supérieur à 0');
      return;
    }

    if (formData.delivery_wilayas.length === 0) {
      setError('Sélectionnez au moins une wilaya de livraison');
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error adding product:', error);
      setError('Erreur lors de l\'ajout du produit');
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = [
    { value: 'hygiene_and_care', label: 'Hygiène & soins' },
    { value: 'dermocosmetics', label: 'Dermocosmétique' },
    { value: 'dietary_supplements', label: 'Compléments alimentaires' },
    { value: 'mother_and_baby', label: 'Maman & bébé' },
    { value: 'orthopedics', label: 'Orthopédie' },
    { value: 'hair_care', label: 'Soins capillaires' },
    { value: 'veterinary', label: 'Produits vétérinaires' },
    { value: 'sun_care', label: 'Produits solaires' },
    { value: 'medical_devices', label: 'Dispositifs médicaux' },
    { value: 'accessories', label: 'Accessoires' }
  ];

  const handleWilayaSelection = (selected: { value: string; label: string }[]) => {
    setFormData({ ...formData, delivery_wilayas: selected.map(s => s.value) });
  };

  const selectAllWilayas = () => {
    setFormData({ ...formData, delivery_wilayas: algerianWilayas.map(w => w.value) });
  };

  const selectedWilayasCount = formData.delivery_wilayas.length;
  const totalWilayasCount = algerianWilayas.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Ajouter un nouveau produit</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nom du produit <span className="text-red-500">*</span>
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
              Marque <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Catégorie <span className="text-red-500">*</span>
            </label>
            <Select
              value={categoryOptions.find(opt => opt.value === formData.category)}
              onChange={(selected) => setFormData({ ...formData, category: selected?.value as ParapharmacyCategory })}
              options={categoryOptions}
              className="mt-1"
              styles={customStyles}
              components={selectComponents}
              placeholder="Sélectionner une catégorie..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Conditionnement
              </label>
              <input
                type="text"
                value={formData.packaging}
                onChange={(e) => setFormData({ ...formData, packaging: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Référence
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Image du produit
            </label>
            <ImageUpload
              value={formData.image_data}
              onChange={(imageData) => setFormData({ ...formData, image_data: imageData })}
              onClear={() => setFormData({ ...formData, image_data: '' })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quantité <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
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
                min="0.01"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
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
                value={algerianWilayas.filter(w => formData.delivery_wilayas.includes(w.value))}
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
                  onClick={() => setFormData({ ...formData, delivery_wilayas: [] })}
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
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer le produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Parapharmacy() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null);
  const [error, setError] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadedItems, setUploadedItems] = useState<ExtendedProduct[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchProducts();
    }
  }, [user?.id, searchQuery, selectedCategory]);

  async function fetchProducts() {
    try {
      let query = supabase
        .from('parapharmacy_products')
        .select(`
          *,
          inventory:wholesaler_parapharmacy_inventory!inner (
            id,
            quantity,
            price,
            delivery_wilayas
          )
        `)
        .eq('created_by', user?.id);

        if (searchQuery) {
          query = query.ilike('name', `%${searchQuery}%`);
        }
        

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Erreur lors de la récupération des produits');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddProduct(data: {
    name: string;
    brand: string;
    category: ParapharmacyCategory;
    description?: string;
    packaging?: string;
    reference?: string;
    image_data: string;
    quantity: number;
    price: number;
    delivery_wilayas: string[];
  }) {
    try {
      // First, create the product
      const { data: productData, error: productError } = await supabase
        .from('parapharmacy_products')
        .insert({
          name: data.name,
          brand: data.brand,
          category: data.category,
          description: data.description,
          packaging: data.packaging,
          reference: data.reference,
          image_data: data.image_data,
          created_by: user?.id
        })
        .select()
        .single();

      if (productError) throw productError;

      // Then, create the inventory entry
      const { error: inventoryError } = await supabase
        .from('wholesaler_parapharmacy_inventory')
        .insert({
          wholesaler_id: user?.id,
          product_id: productData.id,
          quantity: data.quantity,
          price: data.price,
          delivery_wilayas: data.delivery_wilayas
        });

      if (inventoryError) throw inventoryError;

      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }

  async function handleUpdateProduct(id: string) {
    if (!editingProduct) return;
  
    try {
      // 1. Mettre à jour l’inventaire
      const { error: inventoryError } = await supabase
        .from('wholesaler_parapharmacy_inventory')
        .update({
          quantity: editingProduct.quantity,
          price: editingProduct.price,
          delivery_wilayas: editingProduct.delivery_wilayas
        })
        .eq('id', id);
  
      if (inventoryError) throw inventoryError;
  
      // 2. Mettre à jour l’image dans le produit
      const { error: productError } = await supabase
        .from('parapharmacy_products')
        .update({ image_data: editingProduct.image_data })
        .eq('id', editingProduct.product_id);
  
      if (productError) throw productError;
  
      // Nettoyage et reload
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      setError('Erreur lors de la mise à jour du produit');
    }
  }
  

  async function handleDeleteProduct(productId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;
  
    try {
      // 1. Supprimer les éventuels éléments de commande liés à ce produit
      const { error: orderItemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('product_id', productId);
  
      if (orderItemsError) throw orderItemsError;
  
      // 2. Supprimer l'inventaire lié à ce produit pour le grossiste
      const { error: deleteInventoryError } = await supabase
        .from('wholesaler_parapharmacy_inventory')
        .delete()
        .match({ product_id: productId, wholesaler_id: user?.id });
  
      if (deleteInventoryError) throw deleteInventoryError;
  
      // 3. Supprimer le produit lui-même
      const { error: deleteProductError } = await supabase
        .from('parapharmacy_products')
        .delete()
        .match({ id: productId, created_by: user?.id });
  
      if (deleteProductError) throw deleteProductError;
  
      // Rafraîchir la liste
      await fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      setError('Erreur lors de la suppression du produit');
    }
  }
  

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;
  
    const unrecognizedCategories: string[] = [];
  
    // Fonction pour "nettoyer" les catégories (enlever accents, majuscules, etc.)
    const normalizeCategory = (value: string | undefined): string =>
      value?.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
  
    const categoryMap: Record<string, ParapharmacyCategory> = {
      "hygiene et soins": "hygiene_and_care",
      "dermocosmetique": "dermocosmetics",
      "complements alimentaires": "dietary_supplements",
      "maman et bebe": "mother_and_baby",
      "orthopedie": "orthopedics",
      "soins capillaires": "hair_care",
      "produits veterinaires": "veterinary",
      "produits solaires": "sun_care",
      "dispositifs medicaux": "medical_devices",
      "accessoires": "accessories"
    };
  
    setUploadLoading(true);
    setError('');
  
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
      for (const row of jsonData as any[]) {
        try {
          const normalized = normalizeCategory(row.category);
          const cat = categoryMap[normalized];
  
          if (!cat) {
            unrecognizedCategories.push(row.category);
            continue;
          }
  
          // Insert product
          const { data: productData, error: productError } = await supabase
            .from('parapharmacy_products')
            .insert({
              name: row.name,
              brand: row.brand,
              category: cat,
              description: row.description || null,
              packaging: row.packaging || null,
              reference: row.reference || null,
              image_data: row.image_data || null,
              created_by: user.id
            })
            .select()
            .single();
  
          if (productError) throw productError;
  
          // Insert inventory
          const { error: inventoryError } = await supabase
            .from('wholesaler_parapharmacy_inventory')
            .insert({
              wholesaler_id: user.id,
              product_id: productData.id,
              quantity: parseInt(row.quantity) || 0,
              price: parseFloat(row.price) || 0,
              delivery_wilayas: user.delivery_wilayas
            });
  
          if (inventoryError) throw inventoryError;
        } catch (error) {
          console.error('Error processing row:', row, error);
        }
      }
  
      await fetchProducts();
  
      if (unrecognizedCategories.length > 0) {
        alert(`Import terminé avec succès, mais certaines catégories n'ont pas été reconnues et ont été ignorées :\n\n- ${[...new Set(unrecognizedCategories)].join('\n- ')}`);
      } else {
        alert('Import terminé avec succès !');
      }
    } catch (error) {
      console.error('Error uploading products:', error);
      setError('Erreur lors de l\'import du fichier. Vérifiez le format des données.');
    } finally {
      setUploadLoading(false);
      event.target.value = '';
    }
  };
  

  const downloadTemplate = () => {
    try {
      // Feuille principale « Produits »
      const template = [
        {
          name: 'Crème hydratante',
          brand: 'Marque',
          category: 'Dermocosmétique', // <- texte utilisateur, pas ENUM
          description: 'Hydrate la peau',
          packaging: 'Tube 50ml',
          reference: 'CR123',
          image_data: '',
          quantity: 100,
          price: 1200
        }
      ];
      const wsTemplate = XLSX.utils.json_to_sheet(template);
  
      // Feuille « Instructions » avec toutes les catégories utilisables
      const instructions = [
        ['Catégories valides pour la colonne "category"'],
        ['Hygiène & soins'],
        ['Dermocosmétique'],
        ['Compléments alimentaires'],
        ['Maman & bébé'],
        ['Orthopédie'],
        ['Soins capillaires'],
        ['Produits vétérinaires'],
        ['Produits solaires'],
        ['Dispositifs médicaux'],
        ['Accessoires'],
        [],
        ['⚠️ Respectez exactement l’orthographe et les accents pour éviter les erreurs à l’import.']
      ];
      const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsTemplate, 'Produits');
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
  
      XLSX.writeFile(wb, 'parapharmacy_template.xlsx');
    } catch (error) {
      console.error('Error downloading template:', error);
      setError('Erreur lors du téléchargement du modèle');
    }
  };
  

  const categoryOptions = [
    { value: '', label: 'Toutes les catégories' },
    { value: 'hygiene_and_care', label: 'Hygiène & soins' },
    { value: 'dermocosmetics', label: 'Dermocosmétique' },
    { value: 'dietary_supplements', label: 'Compléments alimentaires' },
    { value: 'mother_and_baby', label: 'Maman & bébé' },
    { value: 'orthopedics', label: 'Orthopédie' },
    { value: 'hair_care', label: 'Soins capillaires' },
    { value: 'veterinary', label: 'Produits vétérinaires' },
    { value: 'sun_care', label: 'Produits solaires' },
    { value: 'medical_devices', label: 'Dispositifs médicaux' },
    { value: 'accessories', label: 'Accessoires' }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProductTypeNav />

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Gestion des produits parapharmaceutiques</h2>
        <div className="flex space-x-4">
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
              {uploadLoading ? 'Import en cours...' : 'Importer Excel'}
            </label>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
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

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Rechercher des produits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <Select
            value={categoryOptions.find(opt => opt.value === selectedCategory)}
            onChange={(selected) => setSelectedCategory(selected?.value || '')}
            options={categoryOptions}
            className="w-full"
            styles={customStyles}
            components={selectComponents}
            isClearable
            placeholder="Filtrer par catégorie..."
          />
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun produit</h3>
          <p className="mt-1 text-sm text-gray-500">Commencez par ajouter un nouveau produit.</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produit
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marque
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Catégorie
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
  Image
</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => {
                const inventory = Array.isArray(product.inventory)
                  ? product.inventory[0]
                  : product.inventory;

                return (
                  <tr key={product.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {product.image_data && (
                          <img
                            src={product.image_data}
                            alt={product.name}
                            className="h-10 w-10 rounded-full object-cover mr-3"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-gray-500">{product.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{product.brand}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {categoryOptions.find(opt => opt.value === product.category)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {editingProduct?.id === inventory.id ? (
                        <input
                          type="number"
                          min="0"
                          value={editingProduct.quantity}
                          onChange={(e) => setEditingProduct({
                            ...editingProduct,
                            quantity: parseInt(e.target.value)
                          })}
                          className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      ) : (
                        <span className="text-sm text-gray-900">{inventory.quantity}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {editingProduct?.id === inventory.id ? (
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={editingProduct.price}
                          onChange={(e) => setEditingProduct({
                            ...editingProduct,
                            price: parseFloat(e.target.value)
                          })}
                          className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      ) : (
                        <span className="text-sm text-gray-900">{inventory.price.toFixed(2)} DZD</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
  {editingProduct?.id === inventory.id ? (
    <ImageUpload
      value={editingProduct.image_data}
      onChange={(image) => setEditingProduct({ ...editingProduct, image_data: image })}
      onClear={() => setEditingProduct({ ...editingProduct, image_data: '' })}
    />
  ) : (
    product.image_data && (
      <img
        src={product.image_data}
        alt={product.name}
        className="h-10 w-10 object-cover rounded"
      />
    )
  )}
</td>

                    <td className="px-6 py-4 text-center">
                      {editingProduct?.id === inventory.id ? (
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleUpdateProduct(inventory.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Save className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setEditingProduct(null)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => setEditingProduct({
                              id: inventory.id,
                              product_id: product.id,
                              quantity: inventory.quantity,
                              price: inventory.price,
                              delivery_wilayas: inventory.delivery_wilayas,
                              image_data: product.image_data || ''
                            })}
                            
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-600 hover:text-red-900"
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

      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddProduct}
        />
      )}
    
    </div>
  );
}
