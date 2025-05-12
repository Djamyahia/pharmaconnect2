import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, AlertCircle } from 'lucide-react';

export function CGU() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Conditions Générales d'Utilisation</h1>
        
      </div>

      <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
        <div className="flex items-center space-x-3 text-indigo-600 mb-6">
          <FileText className="h-6 w-6" />
          <h2 className="text-2xl font-semibold">Conditions d'utilisation de PharmaConnect</h2>
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Objet</h3>
            <p className="text-gray-700">
              PharmaConnect est une plateforme technique qui facilite la mise en relation entre pharmaciens et grossistes en Algérie. La plateforme n'intervient pas dans les transactions commerciales, les commandes ou les paiements. Son rôle se limite à fournir un outil de communication et de gestion pour les professionnels du secteur pharmaceutique.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Accès</h3>
            <p className="text-gray-700">
              L'accès à PharmaConnect est réservé aux professionnels agréés du secteur pharmaceutique : pharmaciens d'officine et grossistes-répartiteurs. Lors de l'inscription, les utilisateurs doivent fournir des informations exactes et complètes. PharmaConnect se réserve le droit de vérifier ces informations et de refuser ou suspendre l'accès à tout utilisateur ne respectant pas ces conditions.
            </p>
            <p className="text-gray-700 mt-2">
              Après la validation initiale du compte, PharmaConnect n'effectue aucune vérification systématique des contenus publiés par les utilisateurs.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">3. Commandes</h3>
            <p className="text-gray-700">
              Les commandes passées via PharmaConnect ne sont considérées comme finalisées qu'après acceptation de la date de livraison proposée par le grossiste. Avant cette étape, la commande reste à l'état de demande et peut être annulée sans conséquence par l'une ou l'autre des parties.
            </p>
            <p className="text-gray-700 mt-2">
              PharmaConnect ne gère pas les paiements et n'intervient pas dans les modalités de règlement, qui sont à convenir directement entre le pharmacien et le grossiste.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">4. Responsabilité</h3>
            <p className="text-gray-700">
              Les utilisateurs sont seuls responsables du contenu qu'ils publient sur la plateforme. PharmaConnect n'édite pas, ne modère pas et ne vérifie pas les offres publiées par les grossistes, ni leur conformité avec la réglementation en vigueur.
            </p>
            <p className="text-gray-700 mt-2">
              PharmaConnect ne peut être tenue responsable des éventuels litiges entre utilisateurs, ni des conséquences directes ou indirectes de l'utilisation de la plateforme.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">5. Conformité</h3>
            <p className="text-gray-700">
              Les utilisateurs s'engagent à respecter la législation applicable au secteur pharmaceutique, notamment en ce qui concerne les prix, les promotions et les conditions de vente. PharmaConnect n'effectue aucun contrôle sur la conformité des offres publiées.
            </p>
            <p className="text-gray-700 mt-2">
              Pour plus de détails, veuillez consulter notre <Link to="/charte-conformite" className="text-indigo-600 hover:underline">Charte de Conformité</Link>.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">6. Données</h3>
            <p className="text-gray-700">
              Les données collectées par PharmaConnect sont utilisées uniquement pour le fonctionnement du service. Elles ne sont pas partagées avec des tiers, sauf obligation légale. Chaque utilisateur a accès à ses propres données et statistiques, qui ne sont pas visibles par les autres utilisateurs.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">7. Suspension</h3>
            <p className="text-gray-700">
              PharmaConnect se réserve le droit de suspendre ou de désactiver un compte en cas d'abus, de non-respect des présentes CGU ou de comportement préjudiciable à la plateforme ou à ses utilisateurs.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">8. Contact</h3>
            <p className="text-gray-700">
              Pour toute question relative aux présentes CGU, vous pouvez contacter notre équipe à l'adresse suivante : <a href="mailto:pharmaconnect.plateforme@gmail.com" className="text-indigo-600 hover:underline">pharmaconnect.plateforme@gmail.com</a>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 rounded-xl p-6 mb-8">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-1">
            <AlertCircle className="h-6 w-6 text-amber-500" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-amber-800">Important</h3>
            <p className="mt-2 text-amber-700">
              En utilisant PharmaConnect, vous acceptez les présentes Conditions Générales d'Utilisation. Nous vous recommandons de les consulter régulièrement, car elles peuvent être modifiées à tout moment.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-600 mb-6">
          Pour plus d'informations sur les fonctionnalités de la plateforme, consultez notre page <Link to="/fonctionnalites" className="text-indigo-600 hover:underline">Fonctionnalités</Link> ou notre <Link to="/faq" className="text-indigo-600 hover:underline">FAQ</Link>.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}