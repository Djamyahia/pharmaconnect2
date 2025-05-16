import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Users, Settings, Activity, CreditCard, BarChart2, User, FileText, Package } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { UserManagement } from "./UserManagement";
import { SubscriptionManagement } from "./SubscriptionManagement";
import { ActivityMonitoring } from "./ActivityMonitoring";
import { Analytics } from "./Analytics";
import { AppSettings } from "./AppSettings";
import { Profile } from "../shared/Profile";
import { TenderManagement } from "./TenderManagement";
import { CreateTender } from './CreateTender';
import { TenderDetail } from './TenderDetail';
import { PackManagement } from './PackManagement';



const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  if (!user?.is_admin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès refusé</h1>
          <p className="text-gray-600">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  const navigation = [
    { name: 'Utilisateurs', href: '/admin/users', icon: Users },
    { name: 'Abonnements', href: '/admin/subscriptions', icon: CreditCard },
    { name: 'Activité', href: '/admin/activity', icon: Activity },
    { name: 'Analytiques', href: '/admin/analytics', icon: BarChart2 },
    { name: 'Appels d\'offres', href: '/admin/tenders', icon: FileText },
    { name: 'Packs', href: '/admin/packs', icon: Package },
    { name: 'Paramètres', href: '/admin/settings', icon: Settings },
    { name: 'Profil', href: '/admin/profile', icon: User },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-white border-r">
            <div className="flex items-center flex-shrink-0 px-4">
              <h2 className="text-lg font-semibold text-gray-900">Administration</h2>
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
                  Bienvenue dans l'espace administrateur
                </h1>
                <p className="mt-1 text-gray-600">
                  Gérez les utilisateurs, les abonnements et surveillez l'activité de la plateforme
                </p>
              </div>

              {/* Routes */}
              <div className="py-4">
                <Routes>
                  <Route path="users" element={<UserManagement />} />
                  <Route path="subscriptions" element={<SubscriptionManagement />} />
                  <Route path="activity" element={<ActivityMonitoring />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="tenders" element={<TenderManagement />} />
                  <Route path="packs" element={<PackManagement />} />
                  <Route path="settings" element={<AppSettings />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="tenders/create" element={<CreateTender />} />
                  <Route path="tenders/:id" element={<TenderDetail />} />
                </Routes>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;