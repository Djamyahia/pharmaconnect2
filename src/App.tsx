import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ResetPassword } from './pages/ResetPassword';
import { VerifyEmail } from './pages/VerifyEmail';
import PharmacistDashboard from './pages/pharmacist/Dashboard';
import WholesalerDashboard from './pages/wholesaler/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import { Home } from './pages/Home';
import { useAuth } from './contexts/AuthContext';

function DashboardRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.is_admin) {
    return <Navigate to="/admin" />;
  }

  return <Navigate to={`/${user.role}`} />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="verify-email" element={<VerifyEmail />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="pharmacist/*" element={<PharmacistDashboard />} />
            <Route path="wholesaler/*" element={<WholesalerDashboard />} />
            <Route path="admin/*" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
