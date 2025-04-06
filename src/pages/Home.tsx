import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Pill, Search, TrendingUp, ShieldCheck } from 'lucide-react';

export function Home() {
  const { user } = useAuth();

  if (user) {
    return (
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Bienvenue sur PharmaConnect</h1>
        <Link
          to={`/${user.role}`}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Accéder au tableau de bord
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Connecter les Pharmaciens et les Grossistes
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Optimisez votre chaîne d'approvisionnement pharmaceutique avec notre plateforme sécurisée
        </p>
        <div className="flex justify-center space-x-4 mb-16">
          <Link
            to="/register"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Commencer
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Se connecter
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-100 text-indigo-600 mb-4 mx-auto">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
            Recherche Facile
          </h3>
          <p className="text-gray-600 text-center">
            Trouvez rapidement des médicaments avec des options de recherche et de filtrage avancées
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-100 text-indigo-600 mb-4 mx-auto">
            <TrendingUp className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
            Mises à jour en temps réel
          </h3>
          <p className="text-gray-600 text-center">
            Restez informé avec des mises à jour en direct des stocks et des prix
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-100 text-indigo-600 mb-4 mx-auto">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
            Plateforme Sécurisée
          </h3>
          <p className="text-gray-600 text-center">
            Utilisateurs vérifiés et transactions sécurisées pour votre tranquillité d'esprit
          </p>
        </div>
      </div>
    </div>
  );
}