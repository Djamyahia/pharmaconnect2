import React from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

export function VerifyEmail() {
  return (
    <div className="max-w-md mx-auto text-center">
      <div className="bg-white rounded-lg p-8 shadow-md">
        <Mail className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Merci de votre inscription !</h2>
        <p className="text-gray-600 mb-6">
          Un email de confirmation a été envoyé à votre adresse email.<br />
          <strong className="font-bold">
          Veuillez vérifier votre boîte de réception, dans vos SPAMS,  et cliquer sur le lien pour activer votre compte.
            </strong>
        </p>
        <p className="text-gray-500 mb-6">
          Une fois votre email confirmé, vous pourrez vous connecter à votre compte.
        </p>
        <Link
          to="/login"
          className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Aller à la page de connexion
        </Link>
      </div>
    </div>
  );
}