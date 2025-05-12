import React from 'react';
import { ShieldCheck, AlertTriangle, Tag, Gift, Package, AlertCircle, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CharteConformite() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Charte de Conformité Commerciale</h1>
        
      </div>

      <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
        <div className="flex items-center space-x-3 text-indigo-600 mb-6">
          <ShieldCheck className="h-6 w-6" />
          <h2 className="text-2xl font-semibold">Préambule</h2>
        </div>

        <p className="text-gray-700 mb-6">
          PharmaConnect est une plateforme technique neutre qui facilite la mise en relation entre pharmaciens et grossistes. 
          Elle ne vérifie pas les contenus et n'intervient pas dans les relations commerciales. 
          Les utilisateurs doivent respecter les règles suivantes pour assurer la conformité de leurs activités sur la plateforme.
        </p>

        <div className="space-y-8">
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-1">
                <Tag className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Prix réglementés</h3>
                <p className="mt-2 text-gray-600">
                  Les grossistes sont responsables de s'assurer que les prix affichés sur la plateforme sont conformes à la réglementation en vigueur. 
                  PharmaConnect n'effectue aucun contrôle sur les prix et ne peut être tenue responsable des éventuelles non-conformités.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-1">
                <Gift className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Unités gratuites</h3>
                <p className="mt-2 text-gray-600">
                  Les unités gratuites (UG) proposées dans le cadre de promotions doivent être exceptionnelles, clairement identifiées et non facturées. 
                  Les grossistes doivent s'assurer que ces pratiques sont conformes à la réglementation applicable.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-1">
                <Package className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Packs</h3>
                <p className="mt-2 text-gray-600">
                  Les packs proposés doivent détailler chaque produit inclus avec son prix unitaire. 
                  La vente liée est interdite, et les packs ne doivent pas constituer une réduction déguisée. 
                  Chaque produit doit pouvoir être acheté séparément aux mêmes conditions.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-1">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Responsabilité</h3>
                <p className="mt-2 text-gray-600">
                  Les utilisateurs sont seuls responsables du contenu qu'ils publient sur la plateforme. 
                  Ils s'engagent à respecter la réglementation en vigueur et à ne pas publier de contenu trompeur ou illégal.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-1">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Limite de responsabilité</h3>
                <p className="mt-2 text-gray-600">
                  PharmaConnect ne garantit ni la conformité, ni la légalité des offres publiées sur la plateforme. 
                  La plateforme est un outil technique qui facilite la mise en relation, mais n'intervient pas dans les transactions commerciales.
                </p>
                <p className="mt-2 text-gray-600">
                  Pour plus de détails sur les limites de responsabilité, veuillez consulter nos <Link to="/cgu" className="text-indigo-600 hover:underline">Conditions Générales d'Utilisation</Link>.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-1">
                <Mail className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Contact conformité</h3>
                <p className="mt-2 text-gray-600">
                  Pour toute question relative à la conformité, vous pouvez contacter notre équipe à l'adresse suivante : <a href="mailto:pharmaconnect.plateforme@gmail.com" className="text-indigo-600 hover:underline">pharmaconnect.plateforme@gmail.com</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 rounded-xl p-6 mb-8">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-1">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-amber-800">Important</h3>
            <p className="mt-2 text-amber-700">
              Cette charte de conformité ne constitue pas un avis juridique. Les utilisateurs sont invités à consulter leurs propres conseillers juridiques pour s'assurer de la conformité de leurs pratiques avec la réglementation applicable.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-600 mb-6">
          Pour plus d'informations sur l'utilisation de la plateforme, consultez nos <Link to="/cgu" className="text-indigo-600 hover:underline">Conditions Générales d'Utilisation</Link> ou notre <Link to="/faq" className="text-indigo-600 hover:underline">FAQ</Link>.
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