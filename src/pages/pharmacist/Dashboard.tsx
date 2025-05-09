import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Package, ShoppingCart, Percent, User, TrendingUp, Sparkles, Tag, Pill } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Products } from "./Products";
import { Orders } from "./Orders";
import { Promotions } from "./Promotions";
import { Analytics } from "./Analytics";
import { Profile } from "../shared/Profile";
import { Parapharmacy } from "./Parapharmacy";
import { SpecialOffers } from "./SpecialOffers";

const PharmacistDashboard: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navigation = [
    { name: 'Pharmacie', href: '/pharmacist/products', icon: Pill },
    { name: 'Parapharmacie', href: '/pharmacist/parapharmacy', icon: Sparkles },    
    { name: 'Ventes Flash UG', href: '/pharmacist/promotions', icon: Percent },
    { name: 'Packs', href: '/pharmacist/offers', icon: Package },
    { name: 'Commandes', href: '/pharmacist/orders', icon: ShoppingCart },
    { name: 'Analytiques', href: '/pharmacist/analytics', icon: TrendingUp },
    { name: 'Profil', href: '/pharmacist/profile', icon: User },
  ];

  // If we're at the root pharmacist path, show the navigation menu
  if (location.pathname === '/pharmacist') {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">
            Bienvenue, {user?.company_name}
          </h1>
          <p className="mt-2 text-gray-600">
            Gérez vos commandes et suivez les promotions
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <item.icon className="h-8 w-8 text-indigo-600 mb-3" />
              <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-white border-r">
            <div className="flex items-center flex-shrink-0 px-4">
              <h2 className="text-lg font-semibold text-gray-900">Tableau de bord Pharmacien</h2>
            </div>
            <div className="mt-5 flex-grow flex flex-col">
              <nav className="flex-1 px-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        isActive
                          ? 'bg-indigo-100 text-indigo-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon
                        className={`mr-3 flex-shrink-0 h-6 w-6 ${
                          isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-10">
        <div className="grid grid-cols-7 gap-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center py-2 ${
                  isActive ? 'text-indigo-600' : 'text-gray-600'
                }`}
              >
                <item.icon className="h-6 w-6" />
                <span className="text-xs mt-1">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 pb-16 md:pb-0">
        <main className="flex-1 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Routes>
                <Route path="products" element={<Products />} />
                <Route path="parapharmacy" element={<Parapharmacy />} />
                <Route path="orders" element={<Orders />} />
                <Route path="promotions" element={<Promotions />} />
                <Route path="offers" element={<SpecialOffers />} />
                <Route path="offers/:id" element={<SpecialOffers />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="profile" element={<Profile />} />
              </Routes>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PharmacistDashboard;