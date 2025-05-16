import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  Pill,
  Search,
  TrendingUp,
  ShieldCheck,
  Building2,
  Package,
  Bell,
  CheckCircle,
  FileText,
  Users,
  Truck,
  BarChart,
  Percent,
  Lock,
  UserCheck,
  Clock,
  Tag,
  Info,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

const FadeInWhenVisible = ({ children }: { children: React.ReactNode }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6 }}
    >
      {children}
    </motion.div>
  );
};

const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-200 overflow-hidden">
    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 mb-4">
      <Icon className="h-6 w-6" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 text-center">{description}</p>
  </div>
);

export function Home() {
  const { user } = useAuth();
  const dashboardBase = user?.is_admin ? 'admin' : user?.role;

  if (user) {
    // Redirige automatiquement vers le dashboard
    return <Navigate to={`/${dashboardBase}`} replace />;
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('/images/hero-pattern.svg')] opacity-10"></div>
        </motion.div>
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-8">
              Une plateforme sécurisée pour connecter{' '}
              <span className="text-indigo-600">pharmaciens et grossistes</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-12 max-w-2xl mx-auto">
              Comparez les offres, découvrez les meilleures promotions, et passez vos commandes de médicaments en toute simplicité.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transform transition-all duration-200"
                >
                  Créer mon compte gratuitement
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to="/offers"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-full text-indigo-600 bg-white border-2 border-indigo-600 hover:bg-indigo-50 transform transition-all duration-200"
                >
                  <Tag className="h-5 w-5 mr-2" />
                  Découvrir les packs
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Information Blocks Section */}
      

      {/* Features Section - Pharmacists */}
      <FadeInWhenVisible>
        <div className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Espace Pharmacien
              </h2>
              <p className="text-xl text-gray-600">
                Des outils puissants pour optimiser vos achats
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={UserCheck}
                title="Inscription sécurisée"
                description="Créez un compte et accédez à la plateforme après validation par notre équipe."
              />
              <FeatureCard
                icon={Search}
                title="Recherche intuitive"
                description="Trouvez rapidement vos médicaments par nom, catégorie ou dosage."
              />
              <FeatureCard
                icon={TrendingUp}
                title="Comparaison des offres"
                description="Visualisez les prix et disponibilités de plusieurs grossistes en un coup d'œil."
              />
              <FeatureCard
                icon={Package}
                title="Commande simplifiée"
                description="Sélectionnez vos produits, envoyez vos demandes, suivez votre historique."
              />
              <FeatureCard
                icon={Bell}
                title="Notifications en temps réel"
                description="Restez informé des promotions et des nouvelles offres disponibles."
              />
              <FeatureCard
                icon={CheckCircle}
                title="Suivi des commandes"
                description="Suivez l'état de vos commandes et gérez vos livraisons facilement."
              />
            </div>
          </div>
        </div>
      </FadeInWhenVisible>

      {/* Features Section - Wholesalers */}
      <FadeInWhenVisible>
        <div className="py-24 bg-gradient-to-b from-white to-indigo-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Espace Grossiste
              </h2>
              <p className="text-xl text-gray-600">
                Gérez efficacement votre activité
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={Building2}
                title="Interface dédiée"
                description="Gérez votre catalogue, vos prix, vos stocks et vos livraisons par wilaya."
              />
              <FeatureCard
                icon={FileText}
                title="Ajout de produits simplifié"
                description="Ajoutez vos références manuellement ou via Excel."
              />
              <FeatureCard
                icon={Percent}
                title="Promotions ciblées"
                description="Créez des offres visibles par des milliers de pharmaciens."
              />
              <FeatureCard
                icon={Truck}
                title="Gestion des commandes"
                description="Consultez, acceptez ou refusez les commandes reçues."
              />
              <FeatureCard
                icon={BarChart}
                title="Statistiques"
                description="Adaptez vos prix et vos stocks grâce aux données du marché."
              />
              <FeatureCard
                icon={Users}
                title="Base clients élargie"
                description="Accédez à un réseau grandissant de pharmacies."
              />
            </div>
          </div>
        </div>
      </FadeInWhenVisible>

      {/* Information Blocks Section */}
      <FadeInWhenVisible>
        <div className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Ressources & informations
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Tout ce dont vous avez besoin pour bien démarrer : explorez nos fonctionnalités, parcourez la FAQ et prenez connaissance du cadre légal.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Link to="/fonctionnalites" className="group">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all duration-200 h-full flex flex-col">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 text-indigo-600 mb-6 mx-auto">
                    <Info className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold text-center mb-4">Fonctionnalités</h3>
                  <p className="text-gray-600 text-center mb-6 flex-grow">
                    Découvrez toutes les fonctionnalités qui font de PharmaConnect un outil indispensable pour les professionnels de la pharmacie.
                  </p>
                  <div className="text-indigo-600 font-medium text-center group-hover:underline">
                    En savoir plus →
                  </div>
                </div>
              </Link>

              <Link to="/faq" className="group">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all duration-200 h-full flex flex-col">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 text-indigo-600 mb-6 mx-auto">
                    <HelpCircle className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold text-center mb-4">FAQ</h3>
                  <p className="text-gray-600 text-center mb-6 flex-grow">
                    Trouvez des réponses à toutes vos questions sur l'utilisation de la plateforme et ses fonctionnalités.
                  </p>
                  <div className="text-indigo-600 font-medium text-center group-hover:underline">
                    Consulter la FAQ →
                  </div>
                </div>
              </Link>

              <Link to="/charte-conformite" className="group">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all duration-200 h-full flex flex-col">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 text-indigo-600 mb-6 mx-auto">
                    <FileCheck className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold text-center mb-4">Cadre légal</h3>
                  <p className="text-gray-600 text-center mb-6 flex-grow">
                    Informez-vous sur notre charte de conformité et nos conditions générales d'utilisation.
                  </p>
                  <div className="text-indigo-600 font-medium text-center group-hover:underline">
                    Comprendre le cadre légal →
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </FadeInWhenVisible>

      {/* Security Section */}
      <FadeInWhenVisible>
        <div className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Sécurité et Fiabilité
              </h2>
              <p className="text-xl text-gray-600">
                Une plateforme conçue pour les professionnels
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={Lock}
                title="Plateforme sécurisée"
                description="Infrastructure robuste et sécurisée pour protéger vos données."
              />
              <FeatureCard
                icon={UserCheck}
                title="Vérification "
                description="Chaque inscription est vérifiée par notre équipe."
              />
              <FeatureCard
                icon={Clock}
                title="Disponibilité 24/7"
                description="Accédez à vos services à tout moment."
              />
            </div>
          </div>
        </div>
      </FadeInWhenVisible>

      {/* Final CTA */}
      <FadeInWhenVisible>
        <div className="py-24 bg-indigo-600">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-8">
              Rejoignez PharmaConnect dès maintenant
            </h2>
            <p className="text-xl text-indigo-200 mb-12">
              Créez votre compte gratuitement et commencez à optimiser votre activité.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-full text-indigo-600 bg-white hover:bg-indigo-50 transform transition-all duration-200"
                >
                  Commencer gratuitement
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to="/offers"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-full text-white bg-transparent border-2 border-white hover:bg-white/10 transform transition-all duration-200"
                >
                  <Tag className="h-5 w-5 mr-2" />
                  Voir les packs
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </FadeInWhenVisible>
    </div>
  );
}