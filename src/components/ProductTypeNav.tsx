import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Pill, Sparkles } from 'lucide-react';

export function ProductTypeNav() {
  const location = useLocation();
  const isParapharmacy = location.pathname.includes('parapharmacy');
  const basePath = location.pathname.split('/')[1]; // Get 'pharmacist' or 'wholesaler'
  
  return (
    <div className="bg-white shadow-sm mb-6 p-2 rounded-lg">
      <div className="flex space-x-2">
        <Link
          to={`/${basePath}/${basePath === 'pharmacist' ? 'products' : 'inventory'}`}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
            !isParapharmacy
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Pill className="h-5 w-5 mr-2" />
          Pharmacie
        </Link>
        <Link
          to={`/${basePath}/parapharmacy`}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
            isParapharmacy
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Sparkles className="h-5 w-5 mr-2" />
          Parapharmacie
        </Link>
      </div>
    </div>
  );
}