import React from 'react';
import { X, Mail, Phone, MapPin, Building2, FileText } from 'lucide-react';
import { algerianWilayas } from '../lib/wilayas';

type UserInfoModalProps = {
  user: {
    company_name: string;
    email: string;
    phone: string;
    address: string;
    wilaya: string;
    delivery_wilayas?: string[];
    registration_number?: string;
  };
  onClose: () => void;
};

export function UserInfoModal({ user, onClose }: UserInfoModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Informations de contact</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Building2 className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Entreprise</p>
              <p className="text-sm font-medium text-gray-900">{user.company_name}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <a 
                href={`mailto:${user.email}`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                {user.email}
              </a>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Phone className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Téléphone</p>
              <a 
                href={`tel:${user.phone}`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                {user.phone}
              </a>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <MapPin className="h-5 w-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-500">Adresse</p>
              <p className="text-sm font-medium text-gray-900">{user.address}</p>
              <p className="text-sm font-medium text-gray-900">{user.wilaya}</p>
              {user.delivery_wilayas && user.delivery_wilayas.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500">Wilayas de livraison</p>
                  <p className="text-sm font-medium text-gray-900">
                    {user.delivery_wilayas.map(w => 
                      algerianWilayas.find(aw => aw.value === w)?.label
                    ).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {user.registration_number && (
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Numéro d'enregistrement</p>
                <p className="text-sm font-medium text-gray-900">{user.registration_number}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}