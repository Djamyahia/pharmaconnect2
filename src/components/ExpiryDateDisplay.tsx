import React from 'react';
import { Calendar } from 'lucide-react';

type ExpiryDateDisplayProps = {
  expiryDate: string | null | undefined;
};

export function ExpiryDateDisplay({ expiryDate }: ExpiryDateDisplayProps) {
  if (!expiryDate) return null;

  // Format the date as MM/YYYY
  const date = new Date(expiryDate);
  const formattedDate = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;

  return (
    <div className="flex items-center text-sm text-amber-700">
      <Calendar className="h-4 w-4 mr-1 text-amber-500" />
      <span>Exp : {formattedDate}</span>
    </div>
  );
}