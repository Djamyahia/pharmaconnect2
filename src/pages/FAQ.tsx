import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

type FAQItem = {
  question: string;
  answer: React.ReactNode;
  icon: React.ReactNode;
};

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqItems: FAQItem[] = [
    {
      question: "Qui peut s'inscrire ?",
      answer: (
        <p>
          
          L'inscription est réservée aux pharmacies d'officine agréées et aux grossistes-répartiteurs enregistrés en Algérie. Lors de l'inscription, vous devrez fournir vos informations professionnelles qui seront vérifiées par notre équipe.
        </p>
      ),
      icon: <span className="text-2xl">🔐</span>
    },
    {
      question: "L'inscription est-elle payante ?",
      answer: (
        <p>
          
          Non, l'inscription à PharmaConnect est entièrement gratuite. Nous ne facturons aucun frais pour l'utilisation de la plateforme.
        </p>
      ),
      icon: <span className="text-2xl">🆓</span>
    },
    {
      question: "Comment fonctionne la commande ?",
      answer: (
        <div>
          <p className="mb-2">
            
            Le processus de commande se déroule en plusieurs étapes :
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>Le pharmacien sélectionne les produits qu'il souhaite commander</li>
            <li>Le grossiste reçoit la demande et propose une date de livraison</li>
            <li>Le pharmacien valide cette date pour finaliser la commande</li>
            <li>Le grossiste prépare et livre la commande à la date convenue</li>
          </ol>
        </div>
      ),
      icon: <span className="text-2xl">🛒</span>
    },
    {
      question: "Y a-t-il un paiement en ligne ?",
      answer: (
        <p>
          
          Non, PharmaConnect ne gère pas les paiements. Les modalités de paiement sont à convenir directement entre le pharmacien et le grossiste, selon leurs pratiques habituelles.
        </p>
      ),
      icon: <span className="text-2xl">💳</span>
    },
    {
      question: "Comment connaître les jours de livraison ?",
      answer: (
        <p>
          
          Les jours de livraison sont affichés selon la région que vous sélectionnez. Chaque grossiste définit ses propres jours de livraison par région. Si aucun jour n'est spécifié, une date sera proposée manuellement par le grossiste après votre demande de commande.
        </p>
      ),
      icon: <span className="text-2xl">🚚</span>
    },
    {
      question: "Les prix sont-ils réglementés ?",
      answer: (
        <p>
          
          PharmaConnect ne vérifie pas les prix affichés. Il est de la responsabilité des grossistes de s'assurer que les prix qu'ils proposent sont conformes à la réglementation en vigueur. Pour plus d'informations, consultez notre <Link to="/charte-conformite" className="text-indigo-600 hover:underline">Charte de Conformité</Link>.
        </p>
      ),
      icon: <span className="text-2xl">⚖️</span>
    },
    {
      question: "Comment fonctionnent les packs et unités gratuites ?",
      answer: (
        <div>
          <p className="mb-2">
            
            Les packs et unités gratuites sont acceptés sur la plateforme sous certaines conditions :
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Les unités gratuites (UG) doivent être clairement identifiées</li>
            <li>Les packs doivent détailler chaque produit avec son prix unitaire</li>
            <li>Aucune vente conditionnée n'est autorisée</li>
          </ul>
          <p className="mt-2">
            Pour plus de détails, consultez notre <Link to="/charte-conformite" className="text-indigo-600 hover:underline">Charte de Conformité</Link>.
          </p>
        </div>
      ),
      icon: <span className="text-2xl">📦</span>
    },
    {
      question: "PharmaConnect est-elle responsable des offres publiées ?",
      answer: (
        <p>
          
          Non, PharmaConnect est un outil technique qui facilite la mise en relation entre pharmaciens et grossistes. Le contenu publié relève de la seule responsabilité des utilisateurs. Nous n'intervenons pas dans les transactions commerciales ni dans la vérification de la conformité des offres. Pour plus d'informations, consultez nos <Link to="/cgu" className="text-indigo-600 hover:underline">Conditions Générales d'Utilisation</Link>.
        </p>
      ),
      icon: <span className="text-2xl">🔒</span>
    },
    {
      question: "Puis-je accéder à mes statistiques ?",
      answer: (
        <p>
          
          Oui, chaque utilisateur a accès à ses propres statistiques d'activité dans son tableau de bord. Ces données sont privées et ne sont pas partagées avec d'autres utilisateurs.
        </p>
      ),
      icon: <span className="text-2xl">📊</span>
    },
    {
      question: "Comment contacter le support ?",
      answer: (
        <p>
          Vous pouvez contacter notre équipe de support par email à l'adresse suivante : <a href="mailto:support@pharmaconnect-dz.com" className="text-indigo-600 hover:underline">support@pharmaconnect-dz.com</a>
        </p>
      ),
      icon: <span className="text-2xl">📬</span>
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Foire Aux Questions</h1>
        <p className="text-xl text-gray-600">
          Trouvez des réponses aux questions les plus fréquemment posées sur PharmaConnect
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex items-center space-x-3 text-indigo-600 mb-4">
          <HelpCircle className="h-6 w-6" />
          <h2 className="text-xl font-semibold">Questions fréquentes</h2>
        </div>

        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div 
              key={index} 
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between p-4 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                onClick={() => toggleQuestion(index)}
              >
                <div className="flex items-center">
                  <div className="mr-3 flex-shrink-0">{item.icon}</div>
                  <span className="text-lg font-medium text-gray-900">{item.question}</span>
                </div>
                {openIndex === index ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              {openIndex === index && (
                <div className="px-4 pb-4 pt-0">
                  <div className="text-gray-600 ml-11">
                    {item.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-indigo-50 rounded-xl p-8 text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Vous avez d'autres questions ?</h3>
        <p className="text-gray-600 mb-6">
          N'hésitez pas à nous contacter directement si vous ne trouvez pas la réponse à votre question.
        </p>
        <a 
          href="mailto:pharmaconnect.plateforme@gmail.com" 
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Contactez-nous
        </a>
      </div>
    </div>
  );
}