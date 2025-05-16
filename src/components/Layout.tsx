import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Pill, LogOut, Menu, X, Tag, FileText } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { ScrollToTop } from '../components/ScrollToTop';


export function Layout() {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const dashboardBase = user?.is_admin ? 'admin' : user?.role;

  return (
    <div className="min-h-screen bg-gray-50">
      <ScrollToTop />
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <Pill className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-xl font-semibold text-gray-900">PharmaConnect</span>
              </Link>
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                <Link
                  to="/offers"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-indigo-600 hover:border-indigo-300"
                >
                  <Tag className="h-4 w-4 mr-1" />
                  Packs Publics
                </Link>
                <Link
                  to="/tenders"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-indigo-600 hover:border-indigo-300"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Demandes Pharmaciens
                </Link>
                
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <X className="block h-6 w-6" />
                ) : (
                  <Menu className="block h-6 w-6" />
                )}
              </button>
            </div>

            {/* Desktop navigation */}
            <div className="hidden md:flex md:items-center">
              {user ? (
                <div className="flex items-center space-x-4">
                  <NotificationBell />
                  <Link
                    to={`/${dashboardBase}`}
                    className="text-gray-700 hover:text-indigo-600 transition-colors"
                  >
                    Tableau de bord
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center text-gray-700 hover:text-indigo-600 transition-colors"
                  >
                    <LogOut className="h-5 w-5 mr-1" />
                    Se déconnecter
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-indigo-600 transition-colors"
                  >
                    Se connecter
                  </Link>
                  <Link
                    to="/register"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    S'inscrire
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:hidden`}>
          <div className="pt-2 pb-3 space-y-1">
            <Link
              to="/offers"
              className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              Packs Publics
            </Link>
            
            <Link
              to="/tenders"
              className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              Appels d'offres
            </Link>
            
            <Link
              to="/fonctionnalites"
              className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              Fonctionnalités
            </Link>
            
            <Link
              to="/faq"
              className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              FAQ
            </Link>
            
            <Link
              to="/charte-conformite"
              className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              Charte de conformité
            </Link>
            
            <Link
              to="/cgu"
              className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              CGU
            </Link>
            
            {user ? (
              <>
                <Link
                  to={`/${dashboardBase}`}
                  className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Tableau de bord
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <LogOut className="h-5 w-5 mr-2" />
                    Se déconnecter
                  </div>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Se connecter
                </Link>
                <Link
                  to="/register"
                  className="block px-4 py-2 text-base font-medium text-indigo-600 hover:text-indigo-700 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  S'inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">À propos</h3>
              <ul className="mt-4 space-y-4">
                <li>
                  <Link to="/fonctionnalites" className="text-base text-gray-500 hover:text-indigo-600">
                    Fonctionnalités
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="text-base text-gray-500 hover:text-indigo-600">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Légal</h3>
              <ul className="mt-4 space-y-4">
                <li>
                  <Link to="/charte-conformite" className="text-base text-gray-500 hover:text-indigo-600">
                    Charte de conformité
                  </Link>
                </li>
                <li>
                  <Link to="/cgu" className="text-base text-gray-500 hover:text-indigo-600">
                    CGU
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Accès</h3>
              <ul className="mt-4 space-y-4">
                <li>
                  <Link to="/login" className="text-base text-gray-500 hover:text-indigo-600">
                    Se connecter
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="text-base text-gray-500 hover:text-indigo-600">
                    S'inscrire
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Contact</h3>
              <ul className="mt-4 space-y-4">
                <li>
                  <a href="mailto:pharmaconnect.plateforme@gmail.com" className="text-base text-gray-500 hover:text-indigo-600">
                    pharmaconnect.plateforme@gmail.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-200 pt-8 md:flex md:items-center md:justify-between">
            <div className="flex space-x-6 md:order-2">
              <span className="text-sm text-gray-500">
                &copy; {new Date().getFullYear()} PharmaConnect. Tous droits réservés.
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}