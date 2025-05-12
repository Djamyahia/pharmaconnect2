import React from 'react';
import { Search, Package, Tag, Calendar, CheckCircle, BarChart, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Fonctionnalites() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Fonctionnalités clés de PharmaConnect</h1>
        <p className="text-xl text-gray-600">
          Découvrez les outils qui font de PharmaConnect la plateforme de référence pour les professionnels de la pharmacie
        </p>
      </div>

      <div className="space-y-16">
        {/* Feature 1 */}
        <div className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0 flex items-start justify-center">
              <div className="bg-indigo-100 p-4 rounded-full">
                <Search className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Recherche intelligente multi-offres</h2>
              <p className="text-lg text-gray-600 mb-4">
                Trouvez un médicament et affichez instantanément toutes les offres disponibles chez tous les grossistes : prix, promotions, packs, et stock.
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Recherche par nom commercial ou DCI</li>
                <li>Filtrage par disponibilité et wilaya de livraison</li>
                <li>Comparaison des prix en temps réel</li>
                <li>Visualisation des stocks disponibles</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0 flex items-start justify-center">
              <div className="bg-indigo-100 p-4 rounded-full">
                <Package className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Packs accessibles et transparents</h2>
              <p className="text-lg text-gray-600 mb-4">
                Tous les packs affichés détaillent chaque produit inclus avec son prix réglementé. Les unités gratuites sont clairement indiquées.
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Détail complet des produits inclus</li>
                <li>Affichage transparent des prix unitaires</li>
                <li>Indication claire des unités gratuites (UG)</li>
                <li>Conformité avec la réglementation pharmaceutique</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0 flex items-start justify-center">
              <div className="bg-indigo-100 p-4 rounded-full">
                <Calendar className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Livraison selon la région</h2>
              <p className="text-lg text-gray-600 mb-4">
                Une fois votre région sélectionnée, vous verrez les jours de livraison associés à chaque grossiste.
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Sélection de votre région géographique</li>
                <li>Affichage des jours de livraison par grossiste</li>
                <li>Planification facilitée de vos commandes</li>
                <li>Optimisation de votre gestion de stock</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Feature 4 */}
        <div className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0 flex items-start justify-center">
              <div className="bg-indigo-100 p-4 rounded-full">
                <CheckCircle className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Commande avec validation de livraison</h2>
              <p className="text-lg text-gray-600 mb-4">
                La commande n'est finalisée qu'après validation d'une date proposée par le grossiste.
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Proposition de date par le grossiste</li>
                <li>Confirmation requise du pharmacien</li>
                <li>Suivi en temps réel du statut de la commande</li>
                <li>Notifications automatiques à chaque étape</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Feature 5 */}
        <div className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0 flex items-start justify-center">
              <div className="bg-indigo-100 p-4 rounded-full">
                <BarChart className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Analytics en temps réel</h2>
              <p className="text-lg text-gray-600 mb-4">
                Pharmaciens et grossistes ont accès à leurs statistiques d'activité (achats, ventes, tendances).
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Tableaux de bord personnalisés</li>
                <li>Suivi des commandes et des ventes</li>
                <li>Analyse des tendances d'achat</li>
                <li>Rapports détaillés téléchargeables</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Feature 6 */}
        <div className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0 flex items-start justify-center">
              <div className="bg-indigo-100 p-4 rounded-full">
                <ShieldCheck className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Responsabilité des utilisateurs</h2>
              <p className="text-lg text-gray-600 mb-4">
                PharmaConnect n'intervient pas dans la validation ou la conformité. Chaque utilisateur est responsable du contenu publié.
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Plateforme technique neutre</li>
                <li>Responsabilité des utilisateurs sur leurs contenus</li>
                <li>Conformité aux réglementations à la charge des professionnels</li>
                <li>Transparence dans les relations commerciales</li>
              </ul>
              <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-800">
                  Pour plus d'informations sur les responsabilités des utilisateurs, consultez notre <Link to="/charte-conformite" className="text-indigo-600 hover:underline">Charte de Conformité</Link> et nos <Link to="/cgu" className="text-indigo-600 hover:underline">Conditions Générales d'Utilisation</Link>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Prêt à rejoindre PharmaConnect ?</h2>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Créer un compte
          </Link>
          <Link
            to="/faq"
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Consulter la FAQ
          </Link>
        </div>
      </div>
    </div>
  );
}