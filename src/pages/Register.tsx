import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Mail } from 'lucide-react';
import { z } from 'zod';
import Select from 'react-select';
import { customStyles, selectComponents } from '../components/VirtualizedSelect';
import { algerianWilayas, isValidWilaya } from '../lib/wilayas';

const registerSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  role: z.enum(['pharmacist', 'wholesaler'] as const),
  company_name: z.string().min(1, 'Le nom de l\'entreprise est requis'),
  registration_number: z.string().min(1, 'Le numéro d\'enregistrement est requis'),
  address: z.string().min(1, 'L\'adresse est requise'),
  wilaya: z.string().refine((val) => isValidWilaya(val), {
    message: 'Veuillez sélectionner une wilaya valide'
  }),
  phone: z.string().min(1, 'Le numéro de téléphone est requis'),
  delivery_wilayas: z.array(z.string()).optional(),
});

type RegisterData = z.infer<typeof registerSchema>;

export function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    role: 'pharmacist',
    company_name: '',
    registration_number: '',
    address: '',
    wilaya: '',
    phone: '',
    delivery_wilayas: [],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleWilayaChange = (selectedOption: { value: string; label: string } | null) => {
    setFormData(prev => ({
      ...prev,
      wilaya: selectedOption?.value || ''
    }));
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

    try {
      setLoading(true);
      const validatedData = registerSchema.parse(formData);
      await signUp(validatedData);
      setRegisteredEmail(formData.email);
      navigate('/verify-email');
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Une erreur est survenue lors de la création du compte.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <UserPlus className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900">Créez votre compte</h2>
        <p className="mt-2 text-gray-600">
          Vous avez déjà un compte ?{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-500">
            Se connecter
          </Link>
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Adresse email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Mot de passe
          </label>
          <input
            type="password"
            name="password"
            id="password"
            required
            value={formData.password}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Rôle
          </label>
          <select
            name="role"
            id="role"
            required
            value={formData.role}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="pharmacist">Pharmacien</option>
            <option value="wholesaler">Grossiste</option>
          </select>
        </div>

        <div>
          <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
            Nom de l'entreprise
          </label>
          <input
            type="text"
            name="company_name"
            id="company_name"
            required
            value={formData.company_name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="registration_number" className="block text-sm font-medium text-gray-700">
            Numéro d'enregistrement
          </label>
          <input
            type="text"
            name="registration_number"
            id="registration_number"
            required
            value={formData.registration_number}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">
            Adresse
          </label>
          <input
            type="text"
            name="address"
            id="address"
            required
            value={formData.address}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="wilaya" className="block text-sm font-medium text-gray-700">
            Wilaya
          </label>
          <Select
            id="wilaya"
            name="wilaya"
            value={algerianWilayas.find(w => w.value === formData.wilaya)}
            onChange={handleWilayaChange}
            options={algerianWilayas}
            className="mt-1"
            styles={customStyles}
            components={selectComponents}
            placeholder="Sélectionnez votre wilaya"
            isClearable
            required
          />
        </div>

        {formData.role === 'wholesaler' && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="delivery_wilayas" className="block text-sm font-medium text-gray-700">
                Wilayas de livraison
              </label>
              <button
                type="button"
                onClick={selectAllWilayas}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Sélectionner tout
              </button>
            </div>
            <Select
              isMulti
              id="delivery_wilayas"
              name="delivery_wilayas"
              value={algerianWilayas.filter(w => formData.delivery_wilayas?.includes(w.value))}
              onChange={handleDeliveryWilayasChange}
              options={algerianWilayas}
              className="mt-1"
              styles={customStyles}
              components={selectComponents}
              placeholder="Sélectionnez les wilayas de livraison"
            />
          </div>
        )}

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Numéro de téléphone
          </label>
          <input
            type="tel"
            name="phone"
            id="phone"
            required
            value={formData.phone}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Création du compte...' : 'Créer un compte'}
        </button>
      </form>
    </div>
  );
}