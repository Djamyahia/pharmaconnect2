import React from 'react';
import { Truck } from 'lucide-react';

type DeliveryDaysDisplayProps = {
  deliveryDays: string[] | null | undefined;
  isLoading?: boolean;
};

const dayTranslations: Record<string, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche'
};

export function DeliveryDaysDisplay({ deliveryDays, isLoading = false }: DeliveryDaysDisplayProps) {
  if (isLoading) {
    return (
      <div className="flex items-center text-sm text-gray-500">
        <Truck className="h-4 w-4 mr-1 text-gray-400" />
        <span>Chargement des jours de livraison...</span>
      </div>
    );
  }

  // Cas où aucun jour n'est défini -> pas de highlight
  if (!deliveryDays || deliveryDays.length === 0) {
    return (
      <div className="flex items-center text-sm text-gray-500">
        <Truck className="h-4 w-4 mr-1 text-gray-400" />
        <span>Livré : non connu</span>
      </div>
    );
  }

  // Traduction et tri des jours
  const translatedDays = deliveryDays
    .map(day => dayTranslations[day.toLowerCase()] || day)
    .sort((a, b) => {
      const order = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
      return order.indexOf(a) - order.indexOf(b);
    });

  // Affichage des jours définis avec highlight
  return (
    <div className="
      flex items-center
      text-sm font-semibold
      text-gray-700
      bg-indigo-200
      px-2 py-1
      rounded-md
    ">
      <Truck className="h-4 w-4 mr-1 text-indigo-500" />
      <span>Livré : {translatedDays.join(', ')}</span>
    </div>
  );
}
