import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Package, ShoppingCart, Percent, User } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Products } from "./Products";
import { Orders } from "./Orders";
import { Promotions } from "./Promotions";
import { Analytics } from "./Analytics";
import { Profile } from "../shared/Profile";

const PharmacistDashboard: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navigation = [
    { name: 'Produits', href: '/pharmacist/products', icon: Package },
    { name: 'Commandes', href: '/pharmacist/orders', icon: ShoppingCart },
    { name: 'Promotions', href: '/pharmacist/promotions', icon: Percent },
    { name: 'Analytiques', href: '/pharmacist/analytics', icon: Package },
    { name: 'Profil', href: '/pharmacist/profile', icon: User },
  ];

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

      {/* Main content */}
      <div className="flex flex-col flex-1">
        <main className="flex-1 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {/* Welcome message */}
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">
                  Bienvenue, {user?.company_name}
                </h1>
                <p className="mt-1 text-gray-600">
                  Gérez votre inventaire pharmaceutique et vos commandes
                </p>
              </div>

              {/* Routes */}
              <div className="py-4">
                <Routes>
                  <Route path="products" element={<Products />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="promotions" element={<Promotions />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="profile" element={<Profile />} />
                </Routes>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PharmacistDashboard;